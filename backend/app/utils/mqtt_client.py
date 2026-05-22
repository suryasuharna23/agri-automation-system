import asyncio
import json
import logging
from typing import Callable, Awaitable

import aiomqtt

from app.config import settings

logger = logging.getLogger(__name__)

_message_handlers: dict[str, Callable[[dict], Awaitable[None]]] = {}
_mqtt_status = {
    "enabled": True,
    "connected": False,
    "last_error": None,
}


def register_handler(topic: str, handler: Callable[[dict], Awaitable[None]]):
    _message_handlers[topic] = handler


def get_mqtt_status() -> dict:
    return dict(_mqtt_status)


async def start_mqtt_listener():
    while True:
        try:
            async with aiomqtt.Client(
                hostname=settings.mqtt_broker_host,
                port=settings.mqtt_broker_port,
                username=settings.mqtt_username,
                password=settings.mqtt_password,
            ) as client:
                subscribe_topic = f"{settings.mqtt_topic_prefix}/#"
                await client.subscribe(subscribe_topic, qos=1)
                _mqtt_status["connected"] = True
                _mqtt_status["last_error"] = None
                logger.info(f"MQTT subscribed to {subscribe_topic}")

                async for message in client.messages:
                    topic = str(message.topic)
                    try:
                        payload = json.loads(message.payload)
                        handler = _message_handlers.get(topic)
                        if handler:
                            await handler(payload)
                        else:
                            logger.debug(f"No handler for topic: {topic}")
                    except Exception as e:
                        logger.error(f"Error processing MQTT message on {topic}: {e}")
        except Exception as e:
            _mqtt_status["connected"] = False
            _mqtt_status["last_error"] = str(e)
            logger.warning(f"MQTT unavailable: {e}. Retrying in 5s...")
            await asyncio.sleep(5)
