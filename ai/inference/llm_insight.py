"""
LLM Insight System using Google Gemini.

Provides contextual, AI-generated farming recommendations by combining:
- Disease detection results
- Sensor data from IoT nodes
- Grading results

Uses Google Gemini (gemini-flash-lite-latest) free tier for generating
detailed, contextual recommendations in Indonesian (Bahasa Indonesia).

Environment variable required:
    GEMINI_API_KEY - Your Google AI Studio API key (free at https://aistudio.google.com)
"""

import logging
import os

logger = logging.getLogger(__name__)

# Gemini client (lazy-loaded)
_client = None


def demo_fallback_enabled() -> bool:
    return os.environ.get("ENABLE_DEMO_AI_FALLBACK", "").lower() in {"1", "true", "yes", "on"}


def llm_ready() -> bool:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    return bool(api_key and not api_key.startswith("your_"))


def _get_client():
    """Get or create the Gemini client."""
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key or api_key.startswith("your_"):
            logger.warning("GEMINI_API_KEY not set. LLM insight requests will fail explicitly.")
            return None
        try:
            from google import genai
            _client = genai.Client(api_key=api_key)
            logger.info("Gemini client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            return None
    return _client


async def generate_disease_insight(
    disease_name: str,
    confidence: float,
    is_healthy: bool,
    sensor_data: dict | None = None,
) -> str:
    """
    Generate detailed treatment recommendation using Gemini LLM.

    Combines disease detection result with sensor data to provide
    contextual farming advice in Indonesian.

    Args:
        disease_name: Detected disease name
        confidence: Model confidence score (0-1)
        is_healthy: Whether the plant is healthy
        sensor_data: Optional dict with temperature, humidity, soil_moisture, ph

    Returns:
        Detailed recommendation string in Indonesian
    """
    client = _get_client()
    if client is None:
        if demo_fallback_enabled():
            return _fallback_disease_insight(disease_name, is_healthy)
        raise RuntimeError(
            "Gemini API key (GEMINI_API_KEY) not configured. "
            "LLM insights require a valid API key from https://aistudio.google.com"
        )

    # Build context prompt
    sensor_context = ""
    if sensor_data:
        sensor_context = f"""
Data sensor lahan saat ini:
- Suhu: {sensor_data.get('temperature', 'N/A')}°C
- Kelembapan udara: {sensor_data.get('humidity', 'N/A')}%
- Kelembapan tanah: {sensor_data.get('soil_moisture', 'N/A')}%
- pH tanah: {sensor_data.get('ph', 'N/A')}
"""

    if is_healthy:
        prompt = f"""Kamu adalah ahli pertanian hortikultura Indonesia. Tanaman terdeteksi SEHAT dengan confidence {confidence:.0%}.
{sensor_context}
Berikan saran singkat (3-4 kalimat) dalam Bahasa Indonesia untuk menjaga kesehatan tanaman berdasarkan kondisi sensor di atas. Fokus pada tips perawatan preventif."""
    else:
        prompt = f"""Kamu adalah ahli pertanian hortikultura Indonesia. Sistem AI mendeteksi penyakit "{disease_name}" dengan confidence {confidence:.0%}.
{sensor_context}
Berikan rekomendasi penanganan yang detail dan praktis dalam Bahasa Indonesia (4-6 kalimat). Sertakan:
1. Tindakan segera yang harus dilakukan
2. Pengobatan yang disarankan (nama produk/bahan aktif jika memungkinkan)
3. Langkah pencegahan agar tidak menyebar
Gunakan bahasa yang mudah dipahami petani."""

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
        )
        result = response.text.strip()
        if not result:
            raise RuntimeError("Gemini returned empty response for disease insight")
        return result
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        if demo_fallback_enabled():
            return _fallback_disease_insight(disease_name, is_healthy)
        raise


async def generate_grading_insight(
    grade: str,
    confidence: float,
    grade_probs: dict,
    sensor_data: dict | None = None,
) -> str:
    """
    Generate insight about crop quality grading result.

    Args:
        grade: Predicted grade (A, B, or C)
        confidence: Model confidence
        grade_probs: Dict with grade_a_prob, grade_b_prob, grade_c_prob
        sensor_data: Optional sensor data

    Returns:
        Quality insight string in Indonesian
    """
    client = _get_client()
    if client is None:
        if demo_fallback_enabled():
            return _fallback_grading_insight(grade)
        raise RuntimeError(
            "Gemini API key (GEMINI_API_KEY) not configured. "
            "LLM insights require a valid API key from https://aistudio.google.com"
        )

    sensor_context = ""
    if sensor_data:
        sensor_context = f"""
Kondisi lahan terakhir:
- Suhu: {sensor_data.get('temperature', 'N/A')}°C
- Kelembapan: {sensor_data.get('humidity', 'N/A')}%
- pH: {sensor_data.get('ph', 'N/A')}
"""

    prompt = f"""Kamu adalah ahli grading kualitas sayuran di Indonesia. Hasil grading AI menunjukkan:
- Grade: {grade} (A=premium, B=standar, C=rendah)
- Confidence: {confidence:.0%}
- Probabilitas: A={grade_probs.get('grade_a_prob', 0):.0%}, B={grade_probs.get('grade_b_prob', 0):.0%}, C={grade_probs.get('grade_c_prob', 0):.0%}
{sensor_context}
Berikan insight singkat (3-4 kalimat) dalam Bahasa Indonesia tentang:
1. Apa arti grade ini untuk nilai jual
2. Tips untuk meningkatkan kualitas panen berikutnya
Gunakan bahasa yang mudah dipahami petani."""

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
        )
        result = response.text.strip()
        if not result:
            raise RuntimeError("Gemini returned empty response for grading insight")
        return result
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        if demo_fallback_enabled():
            return _fallback_grading_insight(grade)
        raise


async def generate_sensor_insight(sensor_data: dict) -> dict:
    """
    Generate farming insight based on current sensor readings.

    Returns a dict with:
        insight: str  — short analysis paragraph (3-5 sentences)
        actions: list[str] — 3-4 concrete action items for the farmer
    """
    import json as _json

    client = _get_client()
    if client is None:
        if demo_fallback_enabled():
            return _fallback_sensor_insight(sensor_data)
        raise RuntimeError(
            "Gemini API key (GEMINI_API_KEY) not configured. "
            "LLM insights require a valid API key from https://aistudio.google.com"
        )

    prompt = f"""Kamu adalah ahli agronomi Indonesia. Berikut data sensor lahan pertanian hortikultura:
- Suhu udara: {sensor_data.get('temperature', 'N/A')}°C
- Kelembapan udara: {sensor_data.get('humidity', 'N/A')}%
- Kelembapan tanah: {sensor_data.get('soil_moisture', 'N/A')}%
- pH tanah: {sensor_data.get('ph', 'N/A')}

Balas HANYA dengan JSON valid (tanpa markdown code block), format persis seperti ini:
{{
  "insight": "Analisis kondisi lahan dalam 3-4 kalimat. Sebutkan apakah kondisi optimal, parameter yang perlu perhatian, dan risiko penyakit.",
  "actions": [
    "Tindakan konkret pertama yang harus dilakukan petani",
    "Tindakan konkret kedua",
    "Tindakan konkret ketiga"
  ]
}}
Gunakan bahasa Indonesia yang sederhana dan mudah dipahami petani."""

    try:
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt,
        )
        text = response.text.strip()
        if not text:
            raise RuntimeError("Gemini returned empty response for sensor insight")
        try:
            data = _json.loads(text)
            if "insight" in data and "actions" in data:
                return {"insight": str(data["insight"]), "actions": [str(a) for a in data["actions"]]}
        except _json.JSONDecodeError:
            pass
        # Fallback: treat full response as insight text
        return {"insight": text, "actions": []}
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        if demo_fallback_enabled():
            return _fallback_sensor_insight(sensor_data)
        raise


def _fallback_disease_insight(disease_name: str, is_healthy: bool) -> str:
    if is_healthy:
        return (
            "Tanaman terdeteksi sehat. Pertahankan penyiraman, pemupukan, dan inspeksi rutin. "
            "Ini adalah insight demo karena layanan LLM tidak aktif."
        )
    return (
        f"Terdeteksi gejala {disease_name}. Pisahkan tanaman yang terinfeksi, jaga sanitasi alat, "
        "dan konsultasikan dengan penyuluh pertanian. Ini adalah insight demo karena layanan LLM tidak aktif."
    )


def _fallback_grading_insight(grade: str) -> str:
    insights = {
        "A": "Grade A menunjukkan kualitas premium. Pertahankan praktik budidaya dan pascapanen saat ini.",
        "B": "Grade B masih layak jual. Perbaiki sortasi, waktu panen, dan penanganan pascapanen.",
        "C": "Grade C perlu evaluasi budidaya. Periksa nutrisi, air, dan kerusakan pascapanen.",
    }
    return insights.get(grade, "Grade tidak dikenali. Ini adalah insight demo karena layanan LLM tidak aktif.")


def _fallback_sensor_insight(sensor_data: dict) -> dict:
    issues = []
    actions = []
    temp = sensor_data.get("temperature")
    humidity = sensor_data.get("humidity")
    ph = sensor_data.get("ph")
    soil = sensor_data.get("soil_moisture")

    if temp is not None and (temp < 15 or temp > 35):
        issues.append("Suhu berada di luar rentang ideal.")
        actions.append("Atur ventilasi atau naungan untuk menstabilkan suhu lahan.")
    if humidity is not None and (humidity < 40 or humidity > 90):
        issues.append("Kelembapan udara perlu diperhatikan.")
        actions.append("Periksa sistem irigasi dan sirkulasi udara di area lahan.")
    if soil is not None and (soil < 20 or soil > 80):
        issues.append("Kelembapan tanah perlu disesuaikan.")
        actions.append("Sesuaikan jadwal irigasi untuk menjaga kelembapan tanah 40–70%.")
    if ph is not None and (ph < 5.5 or ph > 7.5):
        issues.append("pH tanah berada di luar rentang ideal.")
        actions.append("Lakukan pengapuran (jika pH rendah) atau penambahan belerang (jika pH tinggi).")

    if not issues:
        issues.append("Kondisi sensor terlihat dalam rentang aman untuk tanaman hortikultura.")
        actions = [
            "Pertahankan jadwal irigasi dan pemupukan yang sudah berjalan.",
            "Lakukan inspeksi visual tanaman secara rutin untuk mendeteksi hama dini.",
            "Catat data sensor harian untuk memantau tren perubahan kondisi lahan.",
        ]
    insight = " ".join(issues) + " (Demo — layanan LLM tidak aktif.)"
    return {"insight": insight, "actions": actions}
