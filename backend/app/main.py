import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import auth, sensor, ai, marketplace, transaction
from app.utils.mqtt_client import start_mqtt_listener, register_handler
from app.schemas.sensor import SensorReadingPayload
from app.services.sensor_service import process_sensor_reading
from app.services.notification_service import get_firebase_status
from app.database import AsyncSessionLocal
from app.config import settings
from app.utils.mqtt_client import get_mqtt_status

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agri API",
    description="Agriculture Intelligence of Things — Backend Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(sensor.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(marketplace.router, prefix="/api/v1")
app.include_router(transaction.router, prefix="/api/v1")


async def _handle_mqtt_sensor(payload: dict):
    async with AsyncSessionLocal() as db:
        await process_sensor_reading(SensorReadingPayload(**payload), db)


@app.on_event("startup")
async def startup():
    settings.validate_startup()
    await init_db()
    topic = f"{settings.mqtt_topic_prefix}/+"
    register_handler(topic, _handle_mqtt_sensor)
    asyncio.create_task(start_mqtt_listener())
    logger.info("Agri API started")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "optional_services": {
            "mqtt": get_mqtt_status(),
            "firebase": get_firebase_status(),
        },
    }
