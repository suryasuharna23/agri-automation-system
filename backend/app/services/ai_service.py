import logging

import httpx

from app.config import settings
from app.schemas.crop import GradingResult, DiagnosisResult

logger = logging.getLogger(__name__)


async def grade_crop_image(image_bytes: bytes, filename: str, crop_id: str) -> GradingResult:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.ai_service_url}/grade",
            files={"file": (filename, image_bytes, "image/jpeg")},
            data={"crop_id": crop_id},
        )
        response.raise_for_status()
        data = response.json()
        return GradingResult(**data)


async def diagnose_plant_disease(image_bytes: bytes, filename: str) -> DiagnosisResult:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.ai_service_url}/diagnose",
            files={"file": (filename, image_bytes, "image/jpeg")},
        )
        response.raise_for_status()
        data = response.json()
        return DiagnosisResult(**data)


async def get_commodity_prices() -> dict:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.commodity_price_api_url)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Failed to fetch commodity prices: {e}")
        return {}
