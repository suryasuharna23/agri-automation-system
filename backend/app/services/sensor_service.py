import logging
from datetime import datetime, timezone

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sensor import SensorNode, SensorReading
from app.models.user import User
from app.schemas.sensor import SensorReadingPayload, AnomalyThresholds
from app.services.notification_service import send_anomaly_notification

logger = logging.getLogger(__name__)

THRESHOLDS = AnomalyThresholds()


async def _get_or_create_node(device_id: str, db: AsyncSession) -> SensorNode | None:
    node = await db.scalar(select(SensorNode).where(SensorNode.device_id == device_id))
    if node:
        return node
    # Auto-create node assigned to the first available user (dev convenience)
    owner = await db.scalar(select(User).limit(1))
    if not owner:
        logger.warning(f"No users in DB — cannot auto-create node for device_id: {device_id}")
        return None
    node = SensorNode(device_id=device_id, name=device_id, owner_id=owner.id, is_active=True)
    db.add(node)
    await db.flush()
    logger.info(f"Auto-created sensor node '{device_id}' assigned to user {owner.email}")
    return node


async def process_sensor_reading(payload: SensorReadingPayload, db: AsyncSession):
    node = await _get_or_create_node(payload.device_id, db)
    if not node:
        return

    anomalies = _detect_anomalies(payload)

    reading = SensorReading(
        node_id=node.id,
        temperature=payload.temperature,
        humidity=payload.humidity,
        soil_moisture=payload.soil_moisture,
        ph=payload.ph,
        is_anomaly=bool(anomalies),
        anomaly_description="; ".join(anomalies) if anomalies else None,
    )
    node.last_seen = datetime.now(timezone.utc)
    db.add(reading)
    await db.commit()

    if anomalies:
        owner = await db.get(User, node.owner_id)
        if owner and owner.fcm_token:
            await send_anomaly_notification(owner.fcm_token, node.name, anomalies)


def _detect_anomalies(payload: SensorReadingPayload) -> list[str]:
    issues = []
    t = THRESHOLDS
    if payload.temperature is not None:
        if payload.temperature < t.temperature_min:
            issues.append(f"Suhu terlalu rendah: {payload.temperature}°C")
        elif payload.temperature > t.temperature_max:
            issues.append(f"Suhu terlalu tinggi: {payload.temperature}°C")
    if payload.humidity is not None:
        if payload.humidity < t.humidity_min:
            issues.append(f"Kelembapan terlalu rendah: {payload.humidity}%")
        elif payload.humidity > t.humidity_max:
            issues.append(f"Kelembapan terlalu tinggi: {payload.humidity}%")
    if payload.soil_moisture is not None:
        if payload.soil_moisture < t.soil_moisture_min:
            issues.append(f"Kelembapan tanah terlalu rendah: {payload.soil_moisture}%")
        elif payload.soil_moisture > t.soil_moisture_max:
            issues.append(f"Kelembapan tanah terlalu tinggi: {payload.soil_moisture}%")
    if payload.ph is not None:
        if payload.ph < t.ph_min:
            issues.append(f"pH terlalu rendah (asam): {payload.ph}")
        elif payload.ph > t.ph_max:
            issues.append(f"pH terlalu tinggi (basa): {payload.ph}")
    return issues


async def get_recent_readings(node_id, limit: int, db: AsyncSession):
    result = await db.execute(
        select(SensorReading)
        .where(SensorReading.node_id == node_id)
        .order_by(desc(SensorReading.recorded_at))
        .limit(limit)
    )
    return result.scalars().all()
