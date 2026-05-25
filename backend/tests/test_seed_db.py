import asyncio
import os
import subprocess
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{Path(tempfile.gettempdir()) / 'agri_seed_tests.db'}")

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from PIL import Image, ImageStat
from sqlalchemy import select

from app.database import AsyncSessionLocal, init_db
from app.main import app
from app.models.crop import Crop, DiagnosisRecord, TraceabilityLog
from app.models.sensor import SensorNode, SensorReading
from app.models.transaction import Transaction
from app.models.user import User
from scripts import seed_db


def _run(coro):
    return asyncio.run(coro)


async def _counts():
    async with AsyncSessionLocal() as db:
        return {
            "users": len((await db.execute(select(User).where(User.email.like("%.demo@agri.local")))).scalars().all())
            + len((await db.execute(select(User).where(User.email == "farmer.second@agri.local"))).scalars().all()),
            "crops": len((await db.execute(select(Crop).where(Crop.image_url.like("/uploads/seed/%")))).scalars().all()),
            "logs": len((await db.execute(select(TraceabilityLog).where(TraceabilityLog.event_data.like('%"seed_key"%')))).scalars().all()),
            "diagnoses": len((await db.execute(select(DiagnosisRecord).where(DiagnosisRecord.image_url.like("/uploads/seed/%")))).scalars().all()),
            "nodes": len((await db.execute(select(SensorNode).where(SensorNode.device_id.like("ESP32-SEED-%")))).scalars().all()),
            "readings": len(
                (
                    await db.execute(
                        select(SensorReading)
                        .join(SensorNode, SensorReading.node_id == SensorNode.id)
                        .where(SensorNode.device_id.like("ESP32-SEED-%"))
                    )
                )
                .scalars()
                .all()
            ),
            "orders": len((await db.execute(select(Transaction).where(Transaction.idempotency_key.like("seed-order-%")))).scalars().all()),
        }


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": seed_db.DEMO_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_seed_database_is_idempotent_and_api_visible():
    _run(seed_db.seed_database())
    _run(seed_db.seed_database())

    assert _run(_counts()) == {
        "users": 4,
        "crops": 5,
        "logs": 15,
        "diagnoses": 3,
        "nodes": 3,
        "readings": 36,
        "orders": 6,
    }

    for asset in seed_db.IMAGE_ASSETS:
        path = seed_db.UPLOAD_DIR / asset.filename
        assert path.exists(), f"Missing {path}"
        assert path.stat().st_size > 1024
        with Image.open(path) as image:
            assert image.format == "JPEG"
            stat = ImageStat.Stat(image.convert("RGB"))
            assert sum(stat.var) > 0, f"{asset.filename} looks like a single-color placeholder"

    attribution = seed_db.ATTRIBUTION_PATH.read_text(encoding="utf-8")
    for asset in seed_db.IMAGE_ASSETS:
        assert asset.filename in attribution
        assert asset.author in attribution

    with TestClient(app) as client:
        farmer_token = _login(client, "farmer.demo@agri.local")
        second_farmer_token = _login(client, "farmer.second@agri.local")
        buyer_token = _login(client, "buyer.demo@agri.local")
        admin_token = _login(client, "admin.demo@agri.local")

        marketplace = client.get("/api/v1/marketplace/crops", headers={"Authorization": f"Bearer {buyer_token}"})
        assert marketplace.status_code == 200, marketplace.text
        crops = marketplace.json()
        assert len(crops) == 4
        assert {crop["name"] for crop in crops} == {"Cabai Merah", "Tomat", "Bawang Merah", "Mentimun"}

        all_crops = client.get(
            "/api/v1/marketplace/crops",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"available_only": False},
        )
        assert all_crops.status_code == 200, all_crops.text
        assert len(all_crops.json()) == 5

        buyer_orders = client.get("/api/v1/transactions/orders", headers={"Authorization": f"Bearer {buyer_token}"})
        assert buyer_orders.status_code == 200, buyer_orders.text
        assert len(buyer_orders.json()) == 5

        farmer_orders = client.get("/api/v1/transactions/orders", headers={"Authorization": f"Bearer {farmer_token}"})
        assert farmer_orders.status_code == 200, farmer_orders.text
        assert len(farmer_orders.json()) == 3

        second_farmer_orders = client.get("/api/v1/transactions/orders", headers={"Authorization": f"Bearer {second_farmer_token}"})
        assert second_farmer_orders.status_code == 200, second_farmer_orders.text
        assert len(second_farmer_orders.json()) == 3

        diagnoses = client.get("/api/v1/ai/diagnoses", headers={"Authorization": f"Bearer {farmer_token}"})
        assert diagnoses.status_code == 200, diagnoses.text
        assert {item["disease_name"] for item in diagnoses.json()} == {"Healthy", "Early Blight"}

        nodes = client.get("/api/v1/sensors/nodes", headers={"Authorization": f"Bearer {farmer_token}"})
        assert nodes.status_code == 200, nodes.text
        assert len(nodes.json()) == 2
        for node in nodes.json():
            readings = client.get(
                f"/api/v1/sensors/nodes/{node['id']}/readings",
                headers={"Authorization": f"Bearer {farmer_token}"},
                params={"limit": 20},
            )
            assert readings.status_code == 200, readings.text
            assert len(readings.json()) == 12
        assert any(
            reading["is_anomaly"]
            for node in nodes.json()
            for reading in client.get(
                f"/api/v1/sensors/nodes/{node['id']}/readings",
                headers={"Authorization": f"Bearer {farmer_token}"},
                params={"limit": 20},
            ).json()
        )


def test_seed_script_command_exits_zero():
    db_path = Path(tempfile.gettempdir()) / "agri_seed_subprocess_tests.db"
    db_path.unlink(missing_ok=True)
    env = os.environ.copy()
    env["SECRET_KEY"] = "test-secret-key"
    env["DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
    result = subprocess.run(
        [sys.executable, str(BACKEND_DIR / "scripts" / "seed_db.py")],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert result.returncode == 0, result.stderr
    assert "Seed database complete." in result.stdout
    assert "farmer.demo@agri.local / Password123!" in result.stdout


if __name__ == "__main__":
    test_seed_database_is_idempotent_and_api_visible()
    test_seed_script_command_exits_zero()
