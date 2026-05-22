import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.crop import CropGrade


class CropCreate(BaseModel):
    name: str
    variety: str | None = None
    quantity_kg: float
    price_per_kg: float
    description: str | None = None
    harvest_date: datetime | None = None


class CropUpdate(BaseModel):
    quantity_kg: float | None = None
    price_per_kg: float | None = None
    description: str | None = None
    is_available: bool | None = None


class CropResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    farmer_id: uuid.UUID
    name: str
    variety: str | None
    quantity_kg: float
    price_per_kg: float
    grade: CropGrade
    grade_confidence: float | None
    image_url: str | None
    description: str | None
    is_available: bool
    harvest_date: datetime | None
    created_at: datetime


class GradingResult(BaseModel):
    crop_id: uuid.UUID
    grade: CropGrade
    confidence: float
    grade_a_prob: float
    grade_b_prob: float
    grade_c_prob: float
    mode: str = "model"


class DiagnosisResult(BaseModel):
    disease_name: str
    confidence: float
    recommendation: str
    is_healthy: bool
    mode: str = "model"


class DiagnosisRecordResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    farmer_id: uuid.UUID
    image_url: str
    disease_name: str | None
    confidence: float | None
    recommendation: str | None
    created_at: datetime
