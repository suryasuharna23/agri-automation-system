import uuid
from datetime import datetime

from pydantic import BaseModel


class SensorNodeCreate(BaseModel):
    device_id: str
    name: str
    location: str | None = None


class SensorNodeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    device_id: str
    name: str
    location: str | None
    is_active: bool
    last_seen: datetime | None
    created_at: datetime


class SensorReadingPayload(BaseModel):
    device_id: str
    temperature: float | None = None
    humidity: float | None = None
    soil_moisture: float | None = None
    ph: float | None = None


class SensorReadingResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    node_id: uuid.UUID
    temperature: float | None
    humidity: float | None
    soil_moisture: float | None
    ph: float | None
    is_anomaly: bool
    anomaly_description: str | None
    recorded_at: datetime


class AnomalyThresholds(BaseModel):
    temperature_min: float = 15.0
    temperature_max: float = 35.0
    humidity_min: float = 40.0
    humidity_max: float = 90.0
    soil_moisture_min: float = 20.0
    soil_moisture_max: float = 80.0
    ph_min: float = 5.5
    ph_max: float = 7.5
