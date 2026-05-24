import os
import sys
import tempfile
import asyncio
from pathlib import Path
from uuid import UUID, uuid4

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{Path(tempfile.gettempdir()) / 'agri_web_upload_tests.db'}")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.main import app
from app.models.crop import DiagnosisRecord
from app.models.sensor import SensorReading


def _register(client: TestClient, role: str = "farmer") -> str:
    email = f"{role}-{uuid4().hex}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": f"Test {role}",
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["access_token"]


def _register_with_user(client: TestClient, role: str = "farmer") -> tuple[str, dict]:
    email = f"{role}-{uuid4().hex}@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": f"Test {role}",
            "role": role,
        },
    )
    assert response.status_code == 201, response.text
    data = response.json()
    return data["access_token"], data["user"]


def _create_crop(client: TestClient, token: str) -> str:
    response = client.post(
        "/api/v1/marketplace/crops",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Tomat",
            "variety": "Cherry",
            "quantity_kg": 20,
            "price_per_kg": 16000,
            "description": "Tomat segar",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_crop_image_upload_success_persists_static_url():
    with TestClient(app) as client:
        token = _register(client)
        crop_id = _create_crop(client, token)

        response = client.post(
            f"/api/v1/marketplace/crops/{crop_id}/image",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("tomat.jpg", b"fake image bytes", "image/jpeg")},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["image_url"].startswith("/uploads/crops/")
        assert data["image_url"].endswith(".jpg")


def test_crop_image_upload_rejects_non_owner_farmer():
    with TestClient(app) as client:
        owner_token = _register(client)
        other_token = _register(client)
        crop_id = _create_crop(client, owner_token)

        response = client.post(
            f"/api/v1/marketplace/crops/{crop_id}/image",
            headers={"Authorization": f"Bearer {other_token}"},
            files={"file": ("tomat.jpg", b"fake image bytes", "image/jpeg")},
        )

        assert response.status_code == 404


def test_crop_image_upload_rejects_unsupported_file_type():
    with TestClient(app) as client:
        token = _register(client)
        crop_id = _create_crop(client, token)

        response = client.post(
            f"/api/v1/marketplace/crops/{crop_id}/image",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("notes.txt", b"not an image", "text/plain")},
        )

        assert response.status_code == 400


def test_crop_image_upload_rejects_empty_file():
    with TestClient(app) as client:
        token = _register(client)
        crop_id = _create_crop(client, token)

        response = client.post(
            f"/api/v1/marketplace/crops/{crop_id}/image",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("empty.png", b"", "image/png")},
        )

        assert response.status_code == 400


def test_delete_crop_blocks_active_orders_and_allows_owner_without_orders():
    with TestClient(app) as client:
        farmer_token = _register(client)
        buyer_token = _register(client, "buyer")
        blocked_crop_id = _create_crop(client, farmer_token)

        order_response = client.post(
            "/api/v1/transactions/orders",
            headers={"Authorization": f"Bearer {buyer_token}", "Idempotency-Key": f"test-{uuid4()}"},
            json={"crop_id": blocked_crop_id, "quantity_kg": 1},
        )
        assert order_response.status_code == 201, order_response.text

        blocked_delete = client.delete(
            f"/api/v1/marketplace/crops/{blocked_crop_id}",
            headers={"Authorization": f"Bearer {farmer_token}"},
        )
        assert blocked_delete.status_code == 409

        deletable_crop_id = _create_crop(client, farmer_token)
        ok_delete = client.delete(
            f"/api/v1/marketplace/crops/{deletable_crop_id}",
            headers={"Authorization": f"Bearer {farmer_token}"},
        )
        assert ok_delete.status_code == 204


def test_delete_diagnosis_owner_only():
    async def create_record(user_id: str) -> str:
        async with AsyncSessionLocal() as db:
            record = DiagnosisRecord(
                farmer_id=UUID(user_id),
                image_url="http://testserver/uploads/diagnosis/test.jpg",
                disease_name="Healthy",
                confidence=0.9,
                recommendation="Tanaman sehat.",
            )
            db.add(record)
            await db.commit()
            await db.refresh(record)
            return str(record.id)

    with TestClient(app) as client:
        owner_token, owner = _register_with_user(client)
        other_token = _register(client)
        record_id = asyncio.run(create_record(owner["id"]))

        forbidden = client.delete(
            f"/api/v1/ai/diagnoses/{record_id}",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert forbidden.status_code == 404

        ok = client.delete(
            f"/api/v1/ai/diagnoses/{record_id}",
            headers={"Authorization": f"Bearer {owner_token}"},
        )
        assert ok.status_code == 204


def test_delete_sensor_node_removes_readings():
    async def count_readings(node_id: str) -> int:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(SensorReading).where(SensorReading.node_id == UUID(node_id)))
            return len(result.scalars().all())

    with TestClient(app) as client:
        token = _register(client)
        device_id = f"ESP-{uuid4().hex}"
        node_response = client.post(
            "/api/v1/sensors/nodes",
            headers={"Authorization": f"Bearer {token}"},
            json={"device_id": device_id, "name": "Greenhouse Test", "location": "Blok A"},
        )
        assert node_response.status_code == 201, node_response.text
        node_id = node_response.json()["id"]

        ingest_response = client.post(
            "/api/v1/sensors/ingest",
            json={"device_id": device_id, "temperature": 28, "humidity": 70, "soil_moisture": 55, "ph": 6.4},
        )
        assert ingest_response.status_code == 204
        assert asyncio.run(count_readings(node_id)) == 1

        delete_response = client.delete(
            f"/api/v1/sensors/nodes/{node_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert delete_response.status_code == 204
        assert asyncio.run(count_readings(node_id)) == 0


def test_cancel_order_allows_pending_and_rejects_completed():
    with TestClient(app) as client:
        farmer_token = _register(client)
        buyer_token = _register(client, "buyer")

        crop_to_cancel = _create_crop(client, farmer_token)
        cancel_order = client.post(
            "/api/v1/transactions/orders",
            headers={"Authorization": f"Bearer {buyer_token}", "Idempotency-Key": f"test-{uuid4()}"},
            json={"crop_id": crop_to_cancel, "quantity_kg": 1},
        )
        assert cancel_order.status_code == 201, cancel_order.text
        cancel_response = client.delete(
            f"/api/v1/transactions/orders/{cancel_order.json()['id']}",
            headers={"Authorization": f"Bearer {farmer_token}"},
        )
        assert cancel_response.status_code == 200
        assert cancel_response.json()["status"] == "cancelled"

        crop_to_complete = _create_crop(client, farmer_token)
        complete_order = client.post(
            "/api/v1/transactions/orders",
            headers={"Authorization": f"Bearer {buyer_token}", "Idempotency-Key": f"test-{uuid4()}"},
            json={"crop_id": crop_to_complete, "quantity_kg": 1},
        )
        assert complete_order.status_code == 201, complete_order.text
        order_id = complete_order.json()["id"]
        for status_value in ["confirmed", "processing", "completed"]:
            status_response = client.patch(
                f"/api/v1/transactions/orders/{order_id}/status",
                headers={"Authorization": f"Bearer {farmer_token}"},
                params={"new_status": status_value},
            )
            assert status_response.status_code == 200, status_response.text

        rejected = client.delete(
            f"/api/v1/transactions/orders/{order_id}",
            headers={"Authorization": f"Bearer {farmer_token}"},
        )
        assert rejected.status_code == 400


if __name__ == "__main__":
    test_crop_image_upload_success_persists_static_url()
    test_crop_image_upload_rejects_non_owner_farmer()
    test_crop_image_upload_rejects_unsupported_file_type()
    test_crop_image_upload_rejects_empty_file()
    test_delete_crop_blocks_active_orders_and_allows_owner_without_orders()
    test_delete_diagnosis_owner_only()
    test_delete_sensor_node_removes_readings()
    test_cancel_order_allows_pending_and_rejects_completed()
