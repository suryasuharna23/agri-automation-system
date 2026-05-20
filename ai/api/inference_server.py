"""
Agri AI Inference Server

Provides REST API endpoints for:
1. /grade - Crop quality grading (Grade A/B/C)
2. /diagnose - Plant disease detection (38 classes from PlantVillage)
3. /insight/disease - LLM-powered disease treatment recommendations
4. /insight/grading - LLM-powered grading quality insight
5. /insight/sensor - LLM-powered environmental analysis
6. /health - Health check

Uses pretrained models from Hugging Face for disease detection
and EfficientNet-B0 for quality grading.
Uses Google Gemini (free tier) for contextual LLM insights.
"""

import io
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from PIL import Image

from ai.inference.grading_model import get_grading_model
from ai.inference.disease_model import get_disease_model
from ai.inference.llm_insight import (
    generate_disease_insight,
    generate_grading_insight,
    generate_sensor_insight,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading AI models...")
    try:
        get_grading_model()
        logger.info("Grading model loaded.")
    except Exception as e:
        logger.error(f"Failed to load grading model: {e}")
    try:
        get_disease_model()
        logger.info("Disease model loaded.")
    except Exception as e:
        logger.error(f"Failed to load disease model: {e}")
    logger.info("AI Inference Server ready.")
    yield


app = FastAPI(
    title="Agri AI Inference Service",
    description="AI service for crop quality grading and plant disease detection",
    version="1.0.0",
    lifespan=lifespan,
)


@app.post("/grade")
async def grade(file: UploadFile = File(...), crop_id: str = Form(...)):
    """
    Grade crop quality from an uploaded image.

    Returns Grade A (excellent), B (acceptable), or C (poor quality)
    with confidence scores for each grade.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Gambar tidak valid. Pastikan file adalah gambar yang benar.")

    try:
        result = get_grading_model().predict(image)
        return {"crop_id": crop_id, **result}
    except Exception as e:
        logger.error(f"Grading inference error: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses grading. Silakan coba lagi.")


@app.post("/diagnose")
async def diagnose(file: UploadFile = File(...)):
    """
    Detect plant disease from an uploaded leaf image.

    Returns disease name, confidence score, and treatment recommendation
    in Indonesian (Bahasa Indonesia).
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Gambar tidak valid. Pastikan file adalah gambar yang benar.")

    try:
        result = get_disease_model().predict(image)
        return result
    except Exception as e:
        logger.error(f"Disease diagnosis inference error: {e}")
        raise HTTPException(status_code=500, detail="Gagal memproses diagnosis. Silakan coba lagi.")


@app.get("/health")
async def health():
    """Health check endpoint."""
    grading_ok = get_grading_model() is not None
    disease_ok = get_disease_model() is not None
    return {
        "status": "ok" if (grading_ok and disease_ok) else "degraded",
        "grading_model": "loaded" if grading_ok else "unavailable",
        "disease_model": "loaded" if disease_ok else "unavailable",
    }


# ─── LLM Insight Endpoints ────────────────────────────────────────────────────


class DiseaseInsightRequest(BaseModel):
    disease_name: str
    confidence: float
    is_healthy: bool
    sensor_data: Optional[dict] = None


class GradingInsightRequest(BaseModel):
    grade: str
    confidence: float
    grade_a_prob: float = 0.0
    grade_b_prob: float = 0.0
    grade_c_prob: float = 0.0
    sensor_data: Optional[dict] = None


class SensorInsightRequest(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    ph: Optional[float] = None


class InsightResponse(BaseModel):
    insight: str


@app.post("/insight/disease", response_model=InsightResponse)
async def disease_insight(request: DiseaseInsightRequest):
    """
    Generate LLM-powered treatment recommendation for detected disease.

    Combines disease detection result with optional sensor data to provide
    contextual, detailed farming advice in Indonesian using Google Gemini.
    """
    try:
        insight = await generate_disease_insight(
            disease_name=request.disease_name,
            confidence=request.confidence,
            is_healthy=request.is_healthy,
            sensor_data=request.sensor_data,
        )
        return InsightResponse(insight=insight)
    except Exception as e:
        logger.error(f"Disease insight error: {e}")
        raise HTTPException(status_code=500, detail="Gagal menghasilkan insight.")


@app.post("/insight/grading", response_model=InsightResponse)
async def grading_insight(request: GradingInsightRequest):
    """
    Generate LLM-powered quality insight for grading result.

    Provides market value context and improvement tips based on the grade.
    """
    try:
        grade_probs = {
            "grade_a_prob": request.grade_a_prob,
            "grade_b_prob": request.grade_b_prob,
            "grade_c_prob": request.grade_c_prob,
        }
        insight = await generate_grading_insight(
            grade=request.grade,
            confidence=request.confidence,
            grade_probs=grade_probs,
            sensor_data=request.sensor_data,
        )
        return InsightResponse(insight=insight)
    except Exception as e:
        logger.error(f"Grading insight error: {e}")
        raise HTTPException(status_code=500, detail="Gagal menghasilkan insight.")


@app.post("/insight/sensor", response_model=InsightResponse)
async def sensor_insight(request: SensorInsightRequest):
    """
    Generate LLM-powered environmental analysis from sensor readings.

    Analyzes current field conditions and provides actionable farming advice.
    """
    try:
        sensor_data = {
            "temperature": request.temperature,
            "humidity": request.humidity,
            "soil_moisture": request.soil_moisture,
            "ph": request.ph,
        }
        insight = await generate_sensor_insight(sensor_data)
        return InsightResponse(insight=insight)
    except Exception as e:
        logger.error(f"Sensor insight error: {e}")
        raise HTTPException(status_code=500, detail="Gagal menghasilkan insight.")
