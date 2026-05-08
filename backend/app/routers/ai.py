import uuid

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.crop import Crop, CropGrade, DiagnosisRecord
from app.models.user import User, UserRole
from app.schemas.crop import GradingResult, DiagnosisResult
from app.services.ai_service import grade_crop_image, diagnose_plant_disease
from app.services.auth_service import require_role

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
    result = await grade_crop_image(image_bytes, file.filename or "image.jpg", str(crop_id))

    crop.grade = CropGrade(result.grade)
    crop.grade_confidence = result.confidence
    await db.commit()
    return result


@router.post("/diagnose", response_model=DiagnosisResult)
async def diagnose(
    file: UploadFile = File(...),
    current_user: User = FarmerUser,
    db: AsyncSession = Depends(get_db),
):
    image_bytes = await file.read()
    result = await diagnose_plant_disease(image_bytes, file.filename or "image.jpg")

    record = DiagnosisRecord(
        farmer_id=current_user.id,
        image_url="",
        disease_name=result.disease_name,
        confidence=result.confidence,
        recommendation=result.recommendation,
    )
    db.add(record)
    await db.commit()
    return result
