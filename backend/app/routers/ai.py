import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "diagnosis"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

from app.database import get_db
from app.models.crop import Crop, CropGrade, DiagnosisRecord
from app.models.user import User, UserRole
from app.schemas.crop import GradingResult, DiagnosisResult, DiagnosisRecordResponse
from app.services.ai_service import (
    grade_crop_image,
    diagnose_plant_disease,
    get_disease_insight,
    get_grading_insight,
    get_sensor_insight,
)
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/ai", tags=["ai"])

FarmerUser = Depends(require_role(UserRole.FARMER, UserRole.ADMIN))


@router.post("/grade/{crop_id}", response_model=GradingResult)
async def grade_crop(
    crop_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = FarmerUser,
    db: AsyncSession = Depends(get_db),
):
    crop = await db.get(Crop, crop_id)
    if not crop or crop.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found")

    image_bytes = await file.read()
    try:
        result = await grade_crop_image(image_bytes, file.filename or "image.jpg", str(crop_id))
    except Exception as exc:
        detail = "Layanan grading AI belum tersedia saat ini."
        if getattr(exc, "response", None) is not None and exc.response.status_code == 400:
            try:
                detail = exc.response.json().get("detail", "Gambar tidak valid.")
            except Exception:
                detail = "Gambar tidak valid. Pastikan file foto dapat dibaca."
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail,
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )

    crop.grade = CropGrade(result.grade)
    crop.grade_confidence = result.confidence
    await db.commit()
    return result


@router.post("/diagnose", response_model=DiagnosisResult)
async def diagnose(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await file.read()

    ext = Path(file.filename or "image.jpg").suffix or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    (UPLOADS_DIR / filename).write_bytes(image_bytes)
    base = str(request.base_url).rstrip("/")
    image_url = f"{base}/uploads/diagnosis/{filename}"

    try:
        result = await diagnose_plant_disease(image_bytes, file.filename or "image.jpg")
    except Exception as exc:
        detail = "Layanan diagnosis AI belum tersedia saat ini."
        if getattr(exc, "response", None) is not None and exc.response.status_code == 400:
            try:
                detail = exc.response.json().get("detail", "Gambar tidak valid.")
            except Exception:
                detail = "Gambar tidak valid. Pastikan file foto dapat dibaca."
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail,
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )

    record = DiagnosisRecord(
        farmer_id=current_user.id,
        image_url=image_url,
        disease_name=result.disease_name,
        confidence=result.confidence,
        recommendation=result.recommendation,
    )
    db.add(record)
    await db.commit()
    return result.model_copy(update={"record_id": record.id})


class InsightSaveRequest(BaseModel):
    insight: str


@router.patch("/diagnoses/{record_id}/insight", status_code=204)
async def save_diagnosis_insight(
    record_id: uuid.UUID,
    body: InsightSaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(DiagnosisRecord, record_id)
    if not record or record.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagnosis record not found")
    record.ai_insight = body.insight
    await db.commit()


@router.get("/diagnoses", response_model=list[DiagnosisRecordResponse])
async def list_diagnoses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List diagnosis records for the current user, newest first."""
    from sqlalchemy import select
    stmt = (
        select(DiagnosisRecord)
        .where(DiagnosisRecord.farmer_id == current_user.id)
        .order_by(DiagnosisRecord.created_at.desc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return records



# ─── LLM Insight Endpoints ────────────────────────────────────────────────────


class DiseaseInsightRequest(BaseModel):
    """Request body for disease insight."""
    disease_name: str
    confidence: float
    is_healthy: bool = False
    sensor_data: dict | None = None


class GradingInsightRequest(BaseModel):
    """Request body for grading insight."""
    grade: str
    confidence: float
    grade_a_prob: float = 0.0
    grade_b_prob: float = 0.0
    grade_c_prob: float = 0.0
    sensor_data: dict | None = None


class SensorInsightRequest(BaseModel):
    """Request body for sensor insight."""
    temperature: float | None = None
    humidity: float | None = None
    soil_moisture: float | None = None
    ph: float | None = None


class InsightResponse(BaseModel):
    """Response containing LLM-generated insight."""
    insight: str
    actions: list[str] = []


@router.post("/insight/disease", response_model=InsightResponse)
async def disease_insight_endpoint(
    data: DiseaseInsightRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Get LLM-generated treatment recommendation for a detected disease.

    Combines disease detection result with contextual farming advice
    generated by Google Gemini in Indonesian.
    """
    try:
        insight = await get_disease_insight(
            disease_name=data.disease_name,
            confidence=data.confidence,
            is_healthy=data.is_healthy,
            sensor_data=data.sensor_data,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan insight AI belum tersedia saat ini.",
        )
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan insight AI belum tersedia saat ini.",
        )
    return InsightResponse(insight=insight)


@router.post("/insight/grading", response_model=InsightResponse)
async def grading_insight_endpoint(
    data: GradingInsightRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Get LLM-generated quality insight for a grading result.

    Provides market value context and tips to improve crop quality.
    """
    grade_probs = {
        "grade_a_prob": data.grade_a_prob,
        "grade_b_prob": data.grade_b_prob,
        "grade_c_prob": data.grade_c_prob,
    }
    try:
        insight = await get_grading_insight(
            grade=data.grade,
            confidence=data.confidence,
            grade_probs=grade_probs,
            sensor_data=data.sensor_data,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan insight AI belum tersedia saat ini.",
        )
    if not insight:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan insight AI belum tersedia saat ini.",
        )
    return InsightResponse(insight=insight)


@router.post("/insight/sensor", response_model=InsightResponse)
async def sensor_insight_endpoint(
    data: SensorInsightRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Get LLM-generated environmental analysis from sensor readings.

    Analyzes current field conditions and provides actionable farming advice
    generated by Google Gemini in Indonesian.
    """
    sensor_data = {
        "temperature": data.temperature,
        "humidity": data.humidity,
        "soil_moisture": data.soil_moisture,
        "ph": data.ph,
    }
    try:
        result = await get_sensor_insight(sensor_data)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan insight AI belum tersedia saat ini.",
        )
    if not result or not result.get("insight"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan insight AI belum tersedia saat ini.",
        )
    return InsightResponse(insight=result["insight"], actions=result.get("actions", []))
