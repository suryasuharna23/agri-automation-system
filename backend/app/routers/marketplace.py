import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.crop import Crop, TraceabilityLog
from app.models.transaction import OrderStatus, Transaction
from app.models.user import User, UserRole
from app.schemas.crop import CropCreate, CropUpdate, CropResponse
from app.services.auth_service import get_current_user, require_role
from app.services.ai_service import get_commodity_prices

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "crops"
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


@router.post("/crops", response_model=CropResponse, status_code=201)
async def create_crop(
    data: CropCreate,
    current_user: User = Depends(require_role(UserRole.FARMER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    crop = Crop(**data.model_dump(), farmer_id=current_user.id)
    db.add(crop)
    await db.commit()
    await db.refresh(crop)
    return crop


@router.get("/crops", response_model=list[CropResponse])
async def list_crops(
    available_only: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Crop)
    if available_only:
        query = query.where(Crop.is_available == True)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/crops/{crop_id}", response_model=CropResponse)
async def get_crop(
    crop_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    crop = await db.get(Crop, crop_id)
    if not crop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found")
    return crop


@router.patch("/crops/{crop_id}", response_model=CropResponse)
async def update_crop(
    crop_id: uuid.UUID,
    data: CropUpdate,
    current_user: User = Depends(require_role(UserRole.FARMER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    crop = await db.get(Crop, crop_id)
    if not crop or (current_user.role != UserRole.ADMIN and crop.farmer_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(crop, field, value)
    await db.commit()
    await db.refresh(crop)
    return crop


@router.post("/crops/{crop_id}/image", response_model=CropResponse)
async def upload_crop_image(
    crop_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.FARMER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    crop = await db.get(Crop, crop_id)
    if not crop or (current_user.role != UserRole.ADMIN and crop.farmer_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found")

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File gambar kosong.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{crop_id}-{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_DIR / filename
    destination.write_bytes(contents)

    crop.image_url = f"/uploads/crops/{filename}"
    await db.commit()
    await db.refresh(crop)
    return crop


@router.delete("/crops/{crop_id}", status_code=204)
async def delete_crop(
    crop_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.FARMER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    crop = await db.get(Crop, crop_id)
    if not crop or (current_user.role != UserRole.ADMIN and crop.farmer_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found")

    active_order = await db.scalar(
        select(Transaction).where(
            Transaction.crop_id == crop_id,
            Transaction.status != OrderStatus.CANCELLED,
        )
    )
    if active_order:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Crop cannot be deleted while it has active orders.",
        )

    await db.execute(delete(TraceabilityLog).where(TraceabilityLog.crop_id == crop_id))
    await db.delete(crop)
    await db.commit()


@router.get("/prices")
async def commodity_prices(_: User = Depends(get_current_user)):
    try:
        return await get_commodity_prices()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Layanan harga pasar tidak tersedia saat ini.",
        )
