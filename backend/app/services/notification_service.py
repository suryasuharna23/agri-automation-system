import logging

logger = logging.getLogger(__name__)

_firebase_app = None
_firebase_status = {
    "enabled": True,
    "initialized": False,
    "last_error": None,
}


def _get_firebase():
    global _firebase_app
    if _firebase_app is None:
        try:
            import firebase_admin
            from firebase_admin import credentials
            from app.config import settings
            cred = credentials.Certificate(settings.firebase_credentials_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            _firebase_status["initialized"] = True
            _firebase_status["last_error"] = None
        except Exception as e:
            _firebase_status["initialized"] = False
            _firebase_status["last_error"] = str(e)
            logger.warning(f"Firebase unavailable; notifications will be skipped: {e}")
    return _firebase_app


def get_firebase_status() -> dict:
    return dict(_firebase_status)


async def send_anomaly_notification(fcm_token: str, node_name: str, anomalies: list[str]):
    try:
        from firebase_admin import messaging
        if _get_firebase() is None:
            logger.info("Anomaly notification skipped because Firebase is unavailable")
            return
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
        if _get_firebase() is None:
            logger.info("Order notification skipped because Firebase is unavailable")
            return
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
