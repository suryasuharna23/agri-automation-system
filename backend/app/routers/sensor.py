import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sensor import SensorNode, SensorReading
from app.models.user import User, UserRole
from app.schemas.sensor import SensorNodeCreate, SensorNodeResponse, SensorReadingResponse, SensorReadingPayload
from app.services.auth_service import get_current_user, require_role
from app.services.sensor_service import get_recent_readings, process_sensor_reading

router = APIRouter(prefix="/sensors", tags=["sensors"])

FarmerUser = Annotated[User, Depends(require_role(UserRole.FARMER, UserRole.ADMIN))]


@router.post("/nodes", response_model=SensorNodeResponse, status_code=201)
async def register_node(
    data: SensorNodeCreate,
    current_user: FarmerUser,
    db: AsyncSession = Depends(get_db),
):
    node = SensorNode(**data.model_dump(), owner_id=current_user.id)
    db.add(node)
    await db.commit()
    await db.refresh(node)
    return node


@router.get("/nodes", response_model=list[SensorNodeResponse])
async def list_nodes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SensorNode).where(SensorNode.owner_id == current_user.id))
    return result.scalars().all()


@router.get("/nodes/{node_id}/readings", response_model=list[SensorReadingResponse])
async def get_readings(
    node_id: uuid.UUID,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    node = await db.get(SensorNode, node_id)
    if not node or node.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")
    return await get_recent_readings(node_id, limit, db)


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(
    node_id: uuid.UUID,
    current_user: FarmerUser,
    db: AsyncSession = Depends(get_db),
):
    node = await db.get(SensorNode, node_id)
    if not node or (current_user.role != UserRole.ADMIN and node.owner_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    await db.execute(delete(SensorReading).where(SensorReading.node_id == node_id))
    await db.delete(node)
    await db.commit()


@router.post("/ingest", status_code=204)
async def ingest_reading(payload: SensorReadingPayload, db: AsyncSession = Depends(get_db)):
    """IoT device pushes sensor data via HTTP (fallback to MQTT)."""
    await process_sensor_reading(payload, db)
