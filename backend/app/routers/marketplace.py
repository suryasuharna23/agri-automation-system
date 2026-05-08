import uuid

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.crop import Crop
from app.models.user import User, UserRole
from app.schemas.crop import CropCreate, CropUpdate, CropResponse
from app.services.auth_service import get_current_user, require_role
from app.services.ai_service import get_commodity_prices

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


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
    if not crop or crop.farmer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(crop, field, value)
    await db.commit()
    await db.refresh(crop)
    return crop


@router.get("/prices")
async def commodity_prices(_: User = Depends(get_current_user)):
    return await get_commodity_prices()
