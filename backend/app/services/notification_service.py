import logging

logger = logging.getLogger(__name__)

_firebase_app = None


def _get_firebase():
    global _firebase_app
    if _firebase_app is None:
        try:
            import firebase_admin
            from firebase_admin import credentials
            from app.config import settings
            cred = credentials.Certificate(settings.firebase_credentials_path)
            _firebase_app = firebase_admin.initialize_app(cred)
        except Exception as e:
            logger.warning(f"Firebase not initialized: {e}")
    return _firebase_app


async def send_anomaly_notification(fcm_token: str, node_name: str, anomalies: list[str]):
    try:
        from firebase_admin import messaging
        _get_firebase()
        message = messaging.Message(
            notification=messaging.Notification(
                title=f"Peringatan Lahan: {node_name}",
                body="; ".join(anomalies),
            ),
            token=fcm_token,
        )
        messaging.send(message)
        logger.info(f"Notification sent to {fcm_token[:10]}...")
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")


async def send_order_notification(fcm_token: str, order_id: str, status: str):
    try:
        from firebase_admin import messaging
        _get_firebase()
        message = messaging.Message(
            notification=messaging.Notification(
                title="Update Pesanan",
                body=f"Pesanan #{order_id[:8]} status: {status}",
            ),
            token=fcm_token,
        )
        messaging.send(message)
    except Exception as e:
        logger.error(f"Failed to send order notification: {e}")
