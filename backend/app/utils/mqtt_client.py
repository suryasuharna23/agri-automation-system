import asyncio
import json
import logging
from typing import Callable, Awaitable

import aiomqtt

from app.config import settings

logger = logging.getLogger(__name__)

_message_handlers: dict[str, Callable[[dict], Awaitable[None]]] = {}


def register_handler(topic: str, handler: Callable[[dict], Awaitable[None]]):
    _message_handlers[topic] = handler


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
            logger.error(f"MQTT connection lost: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
