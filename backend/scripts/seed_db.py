from __future__ import annotations

import asyncio
import json
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env", override=False)

from app.database import AsyncSessionLocal, init_db
from app.models.crop import Crop, CropGrade, DiagnosisRecord, TraceabilityLog
from app.models.sensor import SensorNode, SensorReading
from app.models.transaction import OrderStatus, Transaction
from app.models.user import User, UserRole
from app.utils.security import hash_password

BASE_TIME = datetime(2026, 5, 25, 3, 0, tzinfo=timezone.utc)
DEMO_PASSWORD = "Password123!"
UPLOAD_DIR = BACKEND_DIR / "uploads" / "seed"
ATTRIBUTION_PATH = UPLOAD_DIR / "ATTRIBUTION.json"


@dataclass(frozen=True)
class ImageAsset:
    filename: str
    source_url: str
    author: str
    license: str
    original_filename: str
    local_source: Path | None = None

    @property
    def destination(self) -> Path:
        return UPLOAD_DIR / self.filename


IMAGE_ASSETS = [
    ImageAsset(
        filename="cabai-merah.jpg",
        source_url="https://commons.wikimedia.org/wiki/Special:Redirect/file/Capsicum%20annuum-Red%20Chilli%20Pepper%2001.jpg",
        author="Sabina Bajracharya",
        license="CC BY-SA 4.0",
        original_filename="Capsicum annuum-Red Chilli Pepper 01.jpg",
    ),
    ImageAsset(
        filename="tomat.jpg",
        source_url=str(REPO_ROOT / "ai" / "test_images" / "tomato_fruit.png"),
        author="Local AI test image fixture",
        license="Repository fixture",
        original_filename="tomato_fruit.png",
        local_source=REPO_ROOT / "ai" / "test_images" / "tomato_fruit.png",
    ),
    ImageAsset(
        filename="pak-choy.jpg",
        source_url="https://commons.wikimedia.org/wiki/Special:Redirect/file/Pak-ch.jpg",
        author="Webvet~enwiki",
        license="Public domain",
        original_filename="Pak-ch.jpg",
    ),
    ImageAsset(
        filename="bawang-merah.jpg",
        source_url="https://commons.wikimedia.org/wiki/Special:Redirect/file/Bawang%20brebes.jpg",
        author="Blue tooth7",
        license="CC BY 3.0",
        original_filename="Bawang brebes.jpg",
    ),
    ImageAsset(
        filename="mentimun.jpg",
        source_url="https://commons.wikimedia.org/wiki/Special:Redirect/file/ARS%20cucumber.jpg",
        author="USDA ARS",
        license="Public domain",
        original_filename="ARS cucumber.jpg",
    ),
    ImageAsset(
        filename="diagnosis-healthy.jpg",
        source_url=str(REPO_ROOT / "ai" / "test_images" / "Tomato___healthy.jpg"),
        author="Local AI test image fixture",
        license="Repository fixture",
        original_filename="Tomato___healthy.jpg",
        local_source=REPO_ROOT / "ai" / "test_images" / "Tomato___healthy.jpg",
    ),
    ImageAsset(
        filename="diagnosis-leaf-spot.jpg",
        source_url=str(REPO_ROOT / "ai" / "test_images" / "Tomato___Early_blight.jpg"),
        author="Local AI test image fixture",
        license="Repository fixture",
        original_filename="Tomato___Early_blight.jpg",
        local_source=REPO_ROOT / "ai" / "test_images" / "Tomato___Early_blight.jpg",
    ),
    ImageAsset(
        filename="diagnosis-bacterial-spot.jpg",
        source_url=str(REPO_ROOT / "ai" / "test_images" / "Pepper_bell___Bacterial_spot.jpg"),
        author="Local AI test image fixture",
        license="Repository fixture",
        original_filename="Pepper_bell___Bacterial_spot.jpg",
        local_source=REPO_ROOT / "ai" / "test_images" / "Pepper_bell___Bacterial_spot.jpg",
    ),
]

USERS = [
    {
        "email": "farmer.demo@agri.local",
        "role": UserRole.FARMER,
        "full_name": "Petani Demo",
        "phone": "081234560001",
        "bank_name": "BRI",
        "bank_account": "0011223344",
    },
    {
        "email": "farmer.second@agri.local",
        "role": UserRole.FARMER,
        "full_name": "Petani Kedua",
        "phone": "081234560002",
        "bank_name": "BNI",
        "bank_account": "5566778899",
    },
    {
        "email": "buyer.demo@agri.local",
        "role": UserRole.BUYER,
        "full_name": "Pembeli Demo",
        "phone": "081234560003",
        "bank_name": None,
        "bank_account": None,
    },
    {
        "email": "admin.demo@agri.local",
        "role": UserRole.ADMIN,
        "full_name": "Admin Demo",
        "phone": "081234560004",
        "bank_name": None,
        "bank_account": None,
    },
]

CROPS = [
    {
        "farmer_email": "farmer.demo@agri.local",
        "name": "Cabai Merah",
        "variety": "Keriting",
        "quantity_kg": 120.0,
        "price_per_kg": 32000.0,
        "grade": CropGrade.A,
        "grade_confidence": 0.94,
        "is_available": True,
        "harvest_date": datetime(2026, 5, 20, tzinfo=timezone.utc),
        "image_url": "/uploads/seed/cabai-merah.jpg",
        "description": "Cabai merah keriting segar dari greenhouse Blok A.",
    },
    {
        "farmer_email": "farmer.demo@agri.local",
        "name": "Tomat",
        "variety": "Servo F1",
        "quantity_kg": 85.0,
        "price_per_kg": 18000.0,
        "grade": CropGrade.B,
        "grade_confidence": 0.82,
        "is_available": True,
        "harvest_date": datetime(2026, 5, 18, tzinfo=timezone.utc),
        "image_url": "/uploads/seed/tomat.jpg",
        "description": "Tomat merah ukuran seragam untuk kebutuhan ritel dan horeca.",
    },
    {
        "farmer_email": "farmer.demo@agri.local",
        "name": "Pak Choy",
        "variety": "Nauli",
        "quantity_kg": 40.0,
        "price_per_kg": 15000.0,
        "grade": CropGrade.UNGRADED,
        "grade_confidence": None,
        "is_available": False,
        "harvest_date": datetime(2026, 5, 22, tzinfo=timezone.utc),
        "image_url": "/uploads/seed/pak-choy.jpg",
        "description": "Pak choy hidroponik sedang disortir sebelum kembali tersedia.",
    },
    {
        "farmer_email": "farmer.second@agri.local",
        "name": "Bawang Merah",
        "variety": "Bima Brebes",
        "quantity_kg": 200.0,
        "price_per_kg": 41000.0,
        "grade": CropGrade.A,
        "grade_confidence": 0.91,
        "is_available": True,
        "harvest_date": datetime(2026, 5, 15, tzinfo=timezone.utc),
        "image_url": "/uploads/seed/bawang-merah.jpg",
        "description": "Bawang merah kering panen Brebes, siap kirim karungan.",
    },
    {
        "farmer_email": "farmer.second@agri.local",
        "name": "Mentimun",
        "variety": "Harmony",
        "quantity_kg": 65.0,
        "price_per_kg": 12000.0,
        "grade": CropGrade.C,
        "grade_confidence": 0.68,
        "is_available": True,
        "harvest_date": datetime(2026, 5, 23, tzinfo=timezone.utc),
        "image_url": "/uploads/seed/mentimun.jpg",
        "description": "Mentimun segar grade C untuk olahan, katering, dan pasar harian.",
    },
]

DIAGNOSES = [
    {
        "farmer_email": "farmer.demo@agri.local",
        "image_url": "/uploads/seed/diagnosis-healthy.jpg",
        "disease_name": "Healthy",
        "confidence": 0.96,
        "recommendation": "Tanaman terlihat sehat. Pertahankan jadwal penyiraman dan pemupukan seimbang.",
        "ai_insight": "Kondisi daun stabil. Lanjutkan monitoring harian dan jaga sirkulasi udara greenhouse.",
    },
    {
        "farmer_email": "farmer.demo@agri.local",
        "image_url": "/uploads/seed/diagnosis-leaf-spot.jpg",
        "disease_name": "Early Blight",
        "confidence": 0.87,
        "recommendation": "Pangkas daun terinfeksi, hindari penyiraman dari atas, dan gunakan fungisida sesuai label.",
        "ai_insight": "Gejala awal perlu ditangani cepat agar tidak menyebar ke tanaman sehat di bedeng sekitar.",
    },
    {
        "farmer_email": "farmer.second@agri.local",
        "image_url": "/uploads/seed/diagnosis-bacterial-spot.jpg",
        "disease_name": "Bacterial Spot",
        "confidence": 0.79,
        "recommendation": "Pisahkan tanaman bergejala, kurangi kelembapan daun, dan sanitasi alat kerja setelah digunakan.",
        "ai_insight": "Risiko meningkat saat kelembapan tinggi. Prioritaskan ventilasi dan pengamatan tanaman tetangga.",
    },
]

NODES = [
    {
        "owner_email": "farmer.demo@agri.local",
        "device_id": "ESP32-SEED-001",
        "name": "Greenhouse Cabai",
        "location": "Blok A - Bedeng 1",
        "last_seen": BASE_TIME - timedelta(minutes=5),
    },
    {
        "owner_email": "farmer.demo@agri.local",
        "device_id": "ESP32-SEED-002",
        "name": "Screenhouse Tomat",
        "location": "Blok B - Bedeng 3",
        "last_seen": BASE_TIME - timedelta(minutes=15),
    },
    {
        "owner_email": "farmer.second@agri.local",
        "device_id": "ESP32-SEED-003",
        "name": "Lahan Bawang",
        "location": "Blok C - Petak 2",
        "last_seen": BASE_TIME - timedelta(minutes=8),
    },
]

ORDERS = [
    ("seed-order-pending-cabai", "buyer.demo@agri.local", "Cabai Merah", "Keriting", 10.0, OrderStatus.PENDING, "Butuh pengiriman besok pagi"),
    ("seed-order-confirmed-tomat", "buyer.demo@agri.local", "Tomat", "Servo F1", 15.0, OrderStatus.CONFIRMED, "Kirim ke gudang Bandung"),
    ("seed-order-processing-bawang", "buyer.demo@agri.local", "Bawang Merah", "Bima Brebes", 25.0, OrderStatus.PROCESSING, "Dikemas ukuran karung 5 kg"),
    ("seed-order-completed-cabai", "buyer.demo@agri.local", "Cabai Merah", "Keriting", 8.0, OrderStatus.COMPLETED, "Pesanan demo selesai"),
    ("seed-order-cancelled-mentimun", "buyer.demo@agri.local", "Mentimun", "Harmony", 12.0, OrderStatus.CANCELLED, "Dibatalkan oleh pembeli"),
    ("seed-order-admin-bawang", "admin.demo@agri.local", "Bawang Merah", "Bima Brebes", 5.0, OrderStatus.COMPLETED, "Pembelian audit admin"),
]


def _download_url_for(asset: ImageAsset) -> str:
    if "/wiki/Special:Redirect/file/" in asset.source_url:
        return asset.source_url
    quoted = urllib.parse.quote(asset.original_filename)
    return f"https://commons.wikimedia.org/wiki/Special:Redirect/file/{quoted}"


def _read_asset_bytes(asset: ImageAsset) -> bytes:
    if asset.local_source:
        if not asset.local_source.exists():
            raise FileNotFoundError(f"Missing local seed image: {asset.local_source}")
        return asset.local_source.read_bytes()

    request = urllib.request.Request(
        _download_url_for(asset),
        headers={"User-Agent": "agri-automation-seed/1.0 (local development seed script)"},
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return response.read()
    except Exception as exc:
        raise RuntimeError(f"Failed to download real seed image {asset.original_filename}: {asset.source_url}") from exc


def prepare_seed_images() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    attribution: dict[str, dict[str, str]] = {}
    for asset in IMAGE_ASSETS:
        if not asset.destination.exists():
            raw = _read_asset_bytes(asset)
            tmp_path = asset.destination.with_suffix(".source")
            tmp_path.write_bytes(raw)
            try:
                with Image.open(tmp_path) as image:
                    image = image.convert("RGB")
                    image.thumbnail((1280, 1280))
                    image.save(asset.destination, "JPEG", quality=88, optimize=True)
            finally:
                tmp_path.unlink(missing_ok=True)

        attribution[asset.filename] = {
            "source_url": asset.source_url,
            "author": asset.author,
            "license": asset.license,
            "original_filename": asset.original_filename,
        }

    ATTRIBUTION_PATH.write_text(json.dumps(attribution, indent=2, ensure_ascii=False), encoding="utf-8")


async def _upsert_user(db: AsyncSession, data: dict[str, Any]) -> tuple[User, bool]:
    user = await db.scalar(select(User).where(User.email == data["email"]))
    created = user is None
    if user is None:
        user = User(email=data["email"], hashed_password=hash_password(DEMO_PASSWORD))
        db.add(user)
    user.full_name = data["full_name"]
    user.phone = data["phone"]
    user.role = data["role"]
    user.is_active = True
    user.bank_name = data["bank_name"]
    user.bank_account = data["bank_account"]
    return user, created


async def _upsert_crop(db: AsyncSession, users: dict[str, User], data: dict[str, Any]) -> tuple[Crop, bool]:
    farmer = users[data["farmer_email"]]
    crop = await db.scalar(
        select(Crop).where(
            Crop.farmer_id == farmer.id,
            Crop.name == data["name"],
            Crop.variety == data["variety"],
        )
    )
    created = crop is None
    if crop is None:
        crop = Crop(farmer_id=farmer.id, name=data["name"], variety=data["variety"])
        db.add(crop)
    for field in [
        "quantity_kg",
        "price_per_kg",
        "grade",
        "grade_confidence",
        "image_url",
        "description",
        "is_available",
        "harvest_date",
    ]:
        setattr(crop, field, data[field])
    return crop, created


async def _upsert_traceability_logs(db: AsyncSession, crop: Crop) -> tuple[int, int]:
    created = 0
    updated = 0
    existing = (await db.execute(select(TraceabilityLog).where(TraceabilityLog.crop_id == crop.id))).scalars().all()
    by_key: dict[str, TraceabilityLog] = {}
    for log in existing:
        try:
            payload = json.loads(log.event_data or "{}")
        except json.JSONDecodeError:
            continue
        if payload.get("seed_key"):
            by_key[payload["seed_key"]] = log

    events = [
        ("harvested", "Panen dicatat dari lahan demo.", BASE_TIME - timedelta(days=5)),
        ("graded", f"Produk diberi grade {crop.grade.value}.", BASE_TIME - timedelta(days=4, hours=18)),
        ("listed", "Produk ditampilkan di marketplace demo.", BASE_TIME - timedelta(days=4, hours=12)),
    ]
    for event_type, note, recorded_at in events:
        seed_key = f"{crop.name.lower().replace(' ', '-')}-{event_type}"
        event_data = json.dumps(
            {
                "seed_key": seed_key,
                "location": "Gudang demo Agri AIoT",
                "operator": "Seeder",
                "note": note,
            },
            ensure_ascii=False,
        )
        log = by_key.get(seed_key)
        if log is None:
            log = TraceabilityLog(crop_id=crop.id)
            db.add(log)
            created += 1
        else:
            updated += 1
        log.event_type = event_type
        log.event_data = event_data
        log.recorded_at = recorded_at
    return created, updated


async def _upsert_diagnosis(db: AsyncSession, users: dict[str, User], data: dict[str, Any]) -> tuple[DiagnosisRecord, bool]:
    farmer = users[data["farmer_email"]]
    record = await db.scalar(
        select(DiagnosisRecord).where(
            DiagnosisRecord.farmer_id == farmer.id,
            DiagnosisRecord.image_url == data["image_url"],
        )
    )
    created = record is None
    if record is None:
        record = DiagnosisRecord(farmer_id=farmer.id, image_url=data["image_url"])
        db.add(record)
    record.disease_name = data["disease_name"]
    record.confidence = data["confidence"]
    record.recommendation = data["recommendation"]
    record.ai_insight = data["ai_insight"]
    record.created_at = BASE_TIME - timedelta(days=2, hours=len(data["image_url"]))
    return record, created


async def _upsert_node(db: AsyncSession, users: dict[str, User], data: dict[str, Any]) -> tuple[SensorNode, bool]:
    owner = users[data["owner_email"]]
    node = await db.scalar(select(SensorNode).where(SensorNode.device_id == data["device_id"]))
    created = node is None
    if node is None:
        node = SensorNode(device_id=data["device_id"])
        db.add(node)
    node.owner_id = owner.id
    node.name = data["name"]
    node.location = data["location"]
    node.is_active = True
    node.last_seen = data["last_seen"]
    return node, created


def _reading_payload(device_id: str, index: int) -> dict[str, Any]:
    base = {
        "temperature": 27.0 + (index % 4) * 0.6,
        "humidity": 68.0 - (index % 3) * 1.4,
        "soil_moisture": 52.0 + (index % 5) * 1.1,
        "ph": 6.4 + (index % 3) * 0.08,
        "is_anomaly": False,
        "anomaly_description": None,
    }
    if index == 8 and device_id == "ESP32-SEED-001":
        base.update({"soil_moisture": 18.0, "is_anomaly": True, "anomaly_description": "Kelembapan tanah rendah"})
    if index == 7 and device_id == "ESP32-SEED-002":
        base.update({"temperature": 36.8, "is_anomaly": True, "anomaly_description": "Suhu terlalu tinggi"})
    if index == 9 and device_id == "ESP32-SEED-003":
        base.update({"ph": 5.1, "is_anomaly": True, "anomaly_description": "pH tanah terlalu asam"})
    return base


async def _upsert_readings(db: AsyncSession, node: SensorNode) -> tuple[int, int]:
    created = 0
    updated = 0
    existing = (await db.execute(select(SensorReading).where(SensorReading.node_id == node.id))).scalars().all()
    by_time = {reading.recorded_at.replace(tzinfo=timezone.utc): reading for reading in existing}
    for index in range(12):
        recorded_at = BASE_TIME - timedelta(minutes=30 * (11 - index))
        reading = by_time.get(recorded_at)
        if reading is None:
            reading = SensorReading(node_id=node.id, recorded_at=recorded_at)
            db.add(reading)
            created += 1
        else:
            updated += 1
        for field, value in _reading_payload(node.device_id, index).items():
            setattr(reading, field, value)
    return created, updated


async def _upsert_order(
    db: AsyncSession,
    users: dict[str, User],
    crops: dict[tuple[str, str], Crop],
    order_data: tuple[str, str, str, str, float, OrderStatus, str],
) -> tuple[Transaction, bool]:
    key, buyer_email, crop_name, variety, quantity_kg, status, notes = order_data
    buyer = users[buyer_email]
    crop = crops[(crop_name, variety)]
    order = await db.scalar(select(Transaction).where(Transaction.idempotency_key == key))
    created = order is None
    if order is None:
        order = Transaction(idempotency_key=key)
        db.add(order)
    order.seller_id = crop.farmer_id
    order.buyer_id = buyer.id
    order.crop_id = crop.id
    order.quantity_kg = quantity_kg
    order.price_per_kg = crop.price_per_kg
    order.total_amount = quantity_kg * crop.price_per_kg
    order.status = status
    order.payment_reference = f"PAY-SEED-{status.value}"
    order.notes = notes
    order.created_at = BASE_TIME - timedelta(days=1, minutes=len(key))
    order.updated_at = BASE_TIME - timedelta(hours=12, minutes=len(key))
    return order, created


def _bump(summary: dict[str, dict[str, int]], group: str, created: bool) -> None:
    bucket = summary.setdefault(group, {"created": 0, "updated": 0})
    bucket["created" if created else "updated"] += 1


async def seed_database() -> dict[str, dict[str, int]]:
    prepare_seed_images()
    await init_db()
    summary: dict[str, dict[str, int]] = {}

    async with AsyncSessionLocal() as db:
        users: dict[str, User] = {}
        for user_data in USERS:
            user, created = await _upsert_user(db, user_data)
            users[user.email] = user
            _bump(summary, "users", created)
        await db.flush()

        crops: dict[tuple[str, str], Crop] = {}
        for crop_data in CROPS:
            crop, created = await _upsert_crop(db, users, crop_data)
            crops[(crop.name, crop.variety or "")] = crop
            _bump(summary, "crops", created)
        await db.flush()

        for crop in crops.values():
            created_count, updated_count = await _upsert_traceability_logs(db, crop)
            summary.setdefault("traceability_logs", {"created": 0, "updated": 0})
            summary["traceability_logs"]["created"] += created_count
            summary["traceability_logs"]["updated"] += updated_count

        for diagnosis_data in DIAGNOSES:
            _, created = await _upsert_diagnosis(db, users, diagnosis_data)
            _bump(summary, "diagnosis_records", created)

        nodes: dict[str, SensorNode] = {}
        for node_data in NODES:
            node, created = await _upsert_node(db, users, node_data)
            nodes[node.device_id] = node
            _bump(summary, "sensor_nodes", created)
        await db.flush()

        for node in nodes.values():
            created_count, updated_count = await _upsert_readings(db, node)
            summary.setdefault("sensor_readings", {"created": 0, "updated": 0})
            summary["sensor_readings"]["created"] += created_count
            summary["sensor_readings"]["updated"] += updated_count

        for order_data in ORDERS:
            _, created = await _upsert_order(db, users, crops, order_data)
            _bump(summary, "transactions", created)

        await db.commit()

    return summary


def _print_summary(summary: dict[str, dict[str, int]]) -> None:
    print("Seed database complete.")
    print("Credentials:")
    for user in USERS:
        print(f"- {user['role'].value}: {user['email']} / {DEMO_PASSWORD}")
    print("Counts:")
    for group in sorted(summary):
        counts = summary[group]
        print(f"- {group}: created={counts['created']} updated={counts['updated']}")


def main() -> None:
    summary = asyncio.run(seed_database())
    _print_summary(summary)


if __name__ == "__main__":
    main()
