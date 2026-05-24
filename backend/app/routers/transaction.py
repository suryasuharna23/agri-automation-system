import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.crop import Crop
from app.models.transaction import Transaction, OrderStatus
from app.models.user import User, UserRole
from app.services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/transactions", tags=["transactions"])


class OrderCreate(BaseModel):
    crop_id: uuid.UUID
    quantity_kg: float
    notes: str | None = None


class OrderResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    crop_id: uuid.UUID
    seller_id: uuid.UUID
    buyer_id: uuid.UUID
    quantity_kg: float
    price_per_kg: float
    total_amount: float
    status: OrderStatus
    payment_reference: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


@router.post("/orders", response_model=OrderResponse, status_code=201)
async def create_order(
    data: OrderCreate,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    current_user: User = Depends(require_role(UserRole.BUYER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.scalar(select(Transaction).where(Transaction.idempotency_key == idempotency_key))
    if existing:
        return existing

    crop = await db.get(Crop, data.crop_id)
    if not crop or not crop.is_available:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Crop not available")
    if data.quantity_kg > crop.quantity_kg:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")

    order = Transaction(
        idempotency_key=idempotency_key,
        seller_id=crop.farmer_id,
        buyer_id=current_user.id,
        crop_id=data.crop_id,
        quantity_kg=data.quantity_kg,
        price_per_kg=crop.price_per_kg,
        total_amount=data.quantity_kg * crop.price_per_kg,
        notes=data.notes,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


@router.get("/orders", response_model=list[OrderResponse])
async def list_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role == UserRole.BUYER:
        query = select(Transaction).where(Transaction.buyer_id == current_user.id)
    elif current_user.role == UserRole.FARMER:
        query = select(Transaction).where(Transaction.seller_id == current_user.id)
    else:
        query = select(Transaction)
    result = await db.execute(query)
    return result.scalars().all()


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    new_status: OrderStatus,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.FARMER)),
    db: AsyncSession = Depends(get_db),
):
    order = await db.get(Transaction, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role != UserRole.ADMIN and order.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = new_status
    await db.commit()
    await db.refresh(order)
    return order


@router.delete("/orders/{order_id}", response_model=OrderResponse)
async def cancel_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.ADMIN, UserRole.FARMER)),
    db: AsyncSession = Depends(get_db),
):
    order = await db.get(Transaction, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if current_user.role != UserRole.ADMIN and order.seller_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status not in {OrderStatus.PENDING, OrderStatus.CONFIRMED}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending or confirmed orders can be cancelled.",
        )

    order.status = OrderStatus.CANCELLED
    await db.commit()
    await db.refresh(order)
    return order
