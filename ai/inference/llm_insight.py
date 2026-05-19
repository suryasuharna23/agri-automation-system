"""
LLM Insight System using Google Gemini.

Provides contextual, AI-generated farming recommendations by combining:
- Disease detection results
- Sensor data from IoT nodes
- Grading results

Uses Google Gemini (gemini-2.0-flash) free tier for generating
detailed, contextual recommendations in Indonesian (Bahasa Indonesia).

Environment variable required:
    GEMINI_API_KEY - Your Google AI Studio API key (free at https://aistudio.google.com)
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Gemini client (lazy-loaded)
_client = None


def _get_client():
    """Get or create the Gemini client."""
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            logger.warning("GEMINI_API_KEY not set. LLM insights will use fallback responses.")
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
    sensor_data: Optional[dict] = None,
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
        return _fallback_disease_insight(disease_name, is_healthy)

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
            model="gemini-3-flash-preview",
            contents=prompt,
        )
        result = response.text.strip()
        if result:
            return result
        return _fallback_disease_insight(disease_name, is_healthy)
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _fallback_disease_insight(disease_name, is_healthy)


async def generate_grading_insight(
    grade: str,
    confidence: float,
    grade_probs: dict,
    sensor_data: Optional[dict] = None,
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
        return _fallback_grading_insight(grade)

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
            model="gemini-2.0-flash",
            contents=prompt,
        )
        result = response.text.strip()
        if result:
            return result
        return _fallback_grading_insight(grade)
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _fallback_grading_insight(grade)


async def generate_sensor_insight(sensor_data: dict) -> str:
    """
    Generate farming insight based on current sensor readings.

    Analyzes environmental conditions and provides actionable advice.

    Args:
        sensor_data: Dict with temperature, humidity, soil_moisture, ph

    Returns:
        Environmental insight string in Indonesian
    """
    client = _get_client()
    if client is None:
        return _fallback_sensor_insight(sensor_data)

    prompt = f"""Kamu adalah ahli agronomi Indonesia. Berikut data sensor lahan pertanian hortikultura:
- Suhu udara: {sensor_data.get('temperature', 'N/A')}°C
- Kelembapan udara: {sensor_data.get('humidity', 'N/A')}%
- Kelembapan tanah: {sensor_data.get('soil_moisture', 'N/A')}%
- pH tanah: {sensor_data.get('ph', 'N/A')}

Berikan analisis singkat (3-5 kalimat) dalam Bahasa Indonesia:
1. Apakah kondisi ini optimal untuk tanaman hortikultura (tomat, cabai, sayuran)?
2. Jika ada parameter yang tidak ideal, apa yang harus dilakukan petani?
3. Peringatan jika ada risiko penyakit berdasarkan kondisi lingkungan ini.
Gunakan bahasa sederhana yang mudah dipahami petani."""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        result = response.text.strip()
        if result:
            return result
        return _fallback_sensor_insight(sensor_data)
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _fallback_sensor_insight(sensor_data)


# ─── Fallback responses (when Gemini is unavailable) ───────────────────────────


def _fallback_disease_insight(disease_name: str, is_healthy: bool) -> str:
    """Static fallback when LLM is unavailable."""
    if is_healthy:
        return (
            "Tanaman terdeteksi dalam kondisi sehat. "
            "Pertahankan pola penyiraman dan pemupukan rutin. "
            "Lakukan monitoring berkala untuk deteksi dini hama dan penyakit."
        )
    return (
        f"Terdeteksi gejala {disease_name}. "
        "Segera isolasi tanaman yang terinfeksi dari tanaman sehat. "
        "Konsultasikan dengan petugas penyuluh pertanian setempat untuk penanganan lebih lanjut. "
        "Pastikan sanitasi alat pertanian setelah menangani tanaman sakit."
    )


def _fallback_grading_insight(grade: str) -> str:
    """Static fallback for grading insight."""
    insights = {
        "A": (
            "Kualitas premium! Produk ini layak dijual dengan harga tertinggi di pasar. "
            "Pertahankan kondisi budidaya saat ini untuk hasil panen berikutnya."
        ),
        "B": (
            "Kualitas standar. Produk masih layak jual namun dengan harga pasar normal. "
            "Perhatikan waktu panen dan penanganan pasca-panen untuk meningkatkan grade."
        ),
        "C": (
            "Kualitas di bawah standar. Produk mungkin perlu diolah atau dijual dengan diskon. "
            "Evaluasi kondisi lahan, penyiraman, dan pemupukan untuk perbaikan."
        ),
    }
    return insights.get(grade, "Grade tidak dikenali. Silakan coba lagi.")


def _fallback_sensor_insight(sensor_data: dict) -> str:
    """Static fallback for sensor insight."""
    issues = []
    temp = sensor_data.get("temperature")
    humidity = sensor_data.get("humidity")
    ph = sensor_data.get("ph")
    soil = sensor_data.get("soil_moisture")

    if temp is not None:
        if temp > 35:
            issues.append("Suhu terlalu tinggi, tanaman berisiko stres panas.")
        elif temp < 15:
            issues.append("Suhu terlalu rendah, pertumbuhan tanaman bisa terhambat.")

    if humidity is not None:
        if humidity > 85:
            issues.append("Kelembapan sangat tinggi, risiko jamur meningkat.")
        elif humidity < 40:
            issues.append("Kelembapan rendah, tanaman perlu penyiraman lebih sering.")

    if ph is not None:
        if ph < 5.5:
            issues.append("pH tanah terlalu asam, pertimbangkan pengapuran.")
        elif ph > 7.5:
            issues.append("pH tanah terlalu basa, tambahkan bahan organik.")

    if soil is not None:
        if soil < 20:
            issues.append("Tanah terlalu kering, segera lakukan penyiraman.")
        elif soil > 80:
            issues.append("Tanah terlalu basah, perbaiki drainase.")

    if not issues:
        return "Kondisi lahan dalam rentang optimal untuk tanaman hortikultura. Pertahankan perawatan rutin."

    return " ".join(issues) + " Lakukan penyesuaian segera untuk menjaga kesehatan tanaman."
