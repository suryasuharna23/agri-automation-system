"""
AI Service client — communicates with the AI Inference Server.

The AI service (running on port 8001) provides:
- /grade: Crop quality grading (Grade A/B/C) using EfficientNet-B0
- /diagnose: Plant disease detection (38 classes) using MobileNetV2 from PlantVillage
- /health: Health check

Both models are pretrained and require no additional training for deployment.
"""

import logging
from uuid import UUID

import httpx

from app.config import settings
from app.schemas.crop import GradingResult, DiagnosisResult

logger = logging.getLogger(__name__)


async def grade_crop_image(image_bytes: bytes, filename: str, crop_id: str) -> GradingResult:
    """
    Send image to AI service for quality grading.

    Returns Grade A (excellent), B (acceptable), or C (poor) with confidence scores.
    Target inference time: <5 seconds per spec requirement.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ai_service_url}/grade",
                files={"file": (filename, image_bytes, "image/jpeg")},
                data={"crop_id": crop_id},
            )
            response.raise_for_status()
            data = response.json()
            return GradingResult(**data)
    except httpx.ConnectError:
        logger.error("AI service unavailable. Is it running on port 8001?")
        raise
    except httpx.HTTPStatusError as e:
        logger.error(f"AI service returned error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Grading request failed: {e}")
        raise


async def diagnose_plant_disease(image_bytes: bytes, filename: str) -> DiagnosisResult:
    """
    Send leaf image to AI service for disease detection.

    Uses pretrained MobileNetV2 model (PlantVillage dataset, 38 classes).
    Covers tomato, pepper, potato, and other common crops.
    Returns disease name, confidence, and treatment recommendation in Indonesian.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ai_service_url}/diagnose",
                files={"file": (filename, image_bytes, "image/jpeg")},
            )
            response.raise_for_status()
            data = response.json()
            return DiagnosisResult(**data)
    except httpx.ConnectError:
        logger.error("AI service unavailable. Is it running on port 8001?")
        raise
    except httpx.HTTPStatusError as e:
        logger.error(f"AI service returned error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Diagnosis request failed: {e}")
        raise


async def get_commodity_prices() -> dict:
    """
    Fetch current commodity prices from external market API.

    Returns price data for horticultural commodities.
    Falls back to empty dict if the external API is unavailable.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.commodity_price_api_url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch commodity prices: {e}")
        # Return fallback static prices for common Indonesian vegetables
        return {
            "status": "fallback",
            "message": "Data harga dari API eksternal tidak tersedia",
            "prices": [
                {"commodity": "Tomat", "price_per_kg": 12000, "unit": "Rp/kg"},
                {"commodity": "Cabai Merah", "price_per_kg": 45000, "unit": "Rp/kg"},
                {"commodity": "Cabai Rawit", "price_per_kg": 55000, "unit": "Rp/kg"},
                {"commodity": "Kentang", "price_per_kg": 15000, "unit": "Rp/kg"},
                {"commodity": "Bawang Merah", "price_per_kg": 35000, "unit": "Rp/kg"},
                {"commodity": "Bawang Putih", "price_per_kg": 32000, "unit": "Rp/kg"},
            ],
        }


async def get_disease_insight(
    disease_name: str,
    confidence: float,
    is_healthy: bool,
    sensor_data: dict | None = None,
) -> str:
    """
    Get LLM-generated treatment recommendation from AI service.

    Uses Google Gemini to generate contextual farming advice
    based on disease detection results and sensor data.
    """
    try:
        payload = {
            "disease_name": disease_name,
            "confidence": confidence,
            "is_healthy": is_healthy,
            "sensor_data": sensor_data,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ai_service_url}/insight/disease",
                json=payload,
            )
            response.raise_for_status()
            return response.json()["insight"]
    except Exception as e:
        logger.error(f"Disease insight request failed: {e}")
        return ""


async def get_grading_insight(
    grade: str,
    confidence: float,
    grade_probs: dict,
    sensor_data: dict | None = None,
) -> str:
    """
    Get LLM-generated quality insight from AI service.

    Provides market context and improvement tips.
    """
    try:
        payload = {
            "grade": grade,
            "confidence": confidence,
            "grade_a_prob": grade_probs.get("grade_a_prob", 0),
            "grade_b_prob": grade_probs.get("grade_b_prob", 0),
            "grade_c_prob": grade_probs.get("grade_c_prob", 0),
            "sensor_data": sensor_data,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ai_service_url}/insight/grading",
                json=payload,
            )
            response.raise_for_status()
            return response.json()["insight"]
    except Exception as e:
        logger.error(f"Grading insight request failed: {e}")
        return ""


async def get_sensor_insight(sensor_data: dict) -> str:
    """
    Get LLM-generated environmental analysis from AI service.

    Analyzes sensor readings and provides actionable farming advice.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.ai_service_url}/insight/sensor",
                json=sensor_data,
            )
            response.raise_for_status()
            return response.json()["insight"]
    except Exception as e:
        logger.error(f"Sensor insight request failed: {e}")
        return ""
