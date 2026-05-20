"""
Agri Platform — Automated Test Suite
======================================
Runs against the running backend (port 8000) and AI service (port 8001).

Usage:
    cd backend && source .venv/Scripts/activate
    python ../scripts/run_tests.py [--smoke-only]

Prerequisites:
    - Backend running on http://localhost:8000
    - AI service running on http://localhost:8001
    - Test images exist at ../ai/test_images/
"""

import argparse
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx

# ── Config ───────────────────────────────────────────────────────────────────
BACKEND_API = "http://localhost:8000/api/v1"
BACKEND_DIRECT = "http://localhost:8000"
AI_URL = "http://localhost:8001"

TEST_EMAILS = {
    "farmer": f"autotest_farmer_{int(time.time())}@test.com",
    "buyer": f"autotest_buyer_{int(time.time())}@test.com",
    "admin": f"autotest_admin_{int(time.time())}@test.com",
}
TEST_PASSWORD = "test123"

TEST_IMAGES_DIR = Path(__file__).resolve().parent.parent / "ai" / "test_images"

# ── Test Results ─────────────────────────────────────────────────────────────
results: list[dict] = []
session_data: dict[str, Any] = {}
VERBOSE = False


def log(test_id: str, status: str, detail: str = ""):
    results.append({"id": test_id, "status": status, "detail": detail[:200]})
    icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⚠️"}.get(status, "?")
    print(f"  {icon} {test_id:<60} {status}")
    if detail and status != "PASS":
        for line in detail.split("\n"):
            print(f"     {line}")


def section(name: str):
    print(f"\n{'='*70}\n  {name}\n{'='*70}")


# ── HTTP Helpers ─────────────────────────────────────────────────────────────

def api(path: str, method: str = "POST", **kwargs) -> httpx.Response:
    """Backend API call under /api/v1 prefix."""
    url = f"{BACKEND_API}{path}"
    try:
        resp = httpx.request(method, url, timeout=30.0, **kwargs)
        return resp
    except httpx.ConnectError as e:
        raise RuntimeError(f"Cannot connect to {url}: {e}")
    except Exception as e:
        raise RuntimeError(f"Request failed: {url} — {e}")


def direct(path: str, method: str = "GET", **kwargs) -> httpx.Response:
    """Direct call (no /api/v1 prefix, e.g. /health)."""
    url = f"{BACKEND_DIRECT}{path}"
    try:
        return httpx.request(method, url, timeout=30.0, **kwargs)
    except Exception as e:
        raise RuntimeError(f"Request failed: {url} — {e}")


def ai(path: str, **kwargs) -> httpx.Response:
    """AI service call."""
    url = f"{AI_URL}{path}"
    # Remove timeout from kwargs if caller passed it (avoids duplicate)
    kwargs.pop("timeout", None)
    try:
        return httpx.request("POST", url, timeout=30.0, **kwargs)
    except Exception as e:
        raise RuntimeError(f"AI request failed: {url} — {e}")


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register(email: str, role: str) -> str:
    resp = api("/auth/register", json={
        "email": email, "password": TEST_PASSWORD,
        "full_name": f"Auto {role}", "role": role,
    })
    assert resp.status_code == 201, f"Register {role} failed: {resp.status_code} {resp.text[:100]}"
    return resp.json()["access_token"]


def login(email: str) -> str:
    resp = api("/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.status_code}"
    return resp.json()["access_token"]


def img(name: str) -> bytes:
    p = TEST_IMAGES_DIR / name
    assert p.exists(), f"Missing test image: {p}"
    return p.read_bytes()


# ── TESTS ────────────────────────────────────────────────────────────────────

def t_health():
    section("Health")
    r = direct("/health")
    ok = r.status_code == 200 and r.json().get("status") == "ok"
    log("HEALTH-01: Backend health", "PASS" if ok else "FAIL",
        f"Got {r.status_code}: {r.text[:80]}")


def t_auth():
    section("Auth")

    tokens = {}
    for role in ["farmer", "buyer", "admin"]:
        try:
            tokens[role] = register(TEST_EMAILS[role], role)
            log(f"AUTH-01: Register {role}", "PASS")
        except Exception as e:
            log(f"AUTH-01: Register {role}", "FAIL", str(e)[:150])
    session_data["tokens"] = tokens

    if not tokens.get("farmer"):
        log("AUTH-* (remaining)", "SKIP", "Farmer registration failed — cannot continue")
        return tokens

    try:
        r = api("/auth/register", json={"email": TEST_EMAILS["farmer"], "password": "x",
                                        "full_name": "Dup", "role": "farmer"})
        log("AUTH-04: Duplicate email", "PASS" if r.status_code == 409 else "FAIL",
            f"Expected 409, got {r.status_code}")
    except Exception as e:
        log("AUTH-04: Duplicate email", "FAIL", str(e)[:150])

    for label, email, pw, code in [
        ("AUTH-05: Login valid", TEST_EMAILS["farmer"], TEST_PASSWORD, 200),
        ("AUTH-06: Wrong password", TEST_EMAILS["farmer"], "wrongpass", 401),
        ("AUTH-07: Non-existent user", "nobody@x.com", "x", 401),
    ]:
        try:
            r = api("/auth/login", json={"email": email, "password": pw})
            log(label, "PASS" if r.status_code == code else "FAIL",
                f"Expected {code}, got {r.status_code}: {r.text[:60]}")
        except Exception as e:
            log(label, "FAIL", str(e)[:150])

    try:
        r = api("/auth/login", json={})
        log("AUTH-08: Missing fields", "PASS" if r.status_code == 422 else "FAIL",
            f"Expected 422, got {r.status_code}")
    except Exception as e:
        log("AUTH-08: Missing fields", "FAIL", str(e)[:150])

    try:
        r = api("/auth/me", method="GET", headers=auth(tokens["farmer"]))
        ok = r.status_code == 200 and r.json().get("email") == TEST_EMAILS["farmer"]
        log("AUTH-09: Get /me", "PASS" if ok else "FAIL",
            f"Got {r.status_code}: {r.text[:80]}")
    except Exception as e:
        log("AUTH-09: Get /me", "FAIL", str(e)[:150])

    try:
        r = api("/auth/me", method="GET")
        log("AUTH-10: /me no auth", "PASS" if r.status_code == 403 else "FAIL",
            f"Expected 403, got {r.status_code}")
    except Exception as e:
        log("AUTH-10: /me no auth", "FAIL", str(e)[:150])

    return tokens


def t_sensors(tokens: dict):
    section("Sensors")
    ft, bt = tokens.get("farmer"), tokens.get("buyer")
    if not ft:
        log("SENSOR-*", "SKIP", "No farmer token")
        return

    node_id = None
    uniq = int(time.time())
    try:
        r = api("/sensors/nodes", headers=auth(ft),
                json={"device_id": f"auto-esp-{uniq}", "name": "Auto Node", "location": "Lab"})
        ok = r.status_code == 201
        if ok:
            node_id = r.json().get("id")
            session_data["node_id"] = node_id
        log("SENSOR-01: Register node (farmer)", "PASS" if ok else "FAIL",
            f"Got {r.status_code}")
    except Exception as e:
        log("SENSOR-01: Register node (farmer)", "FAIL", str(e)[:150])

    if bt:
        try:
            r = api("/sensors/nodes", headers=auth(bt),
                    json={"device_id": "esp-buyer", "name": "Buyer Node"})
            log("SENSOR-02: Register node (buyer)", "PASS" if r.status_code == 403 else "FAIL",
                f"Expected 403, got {r.status_code}")
        except Exception as e:
            log("SENSOR-02: Register node (buyer)", "FAIL", str(e)[:150])

    try:
        r = api("/sensors/nodes", method="GET", headers=auth(ft))
        ok = r.status_code == 200 and isinstance(r.json(), list) and len(r.json()) > 0
        log("SENSOR-04: List nodes (farmer)", "PASS" if ok else "FAIL",
            f"Got {r.status_code}, count={len(r.json()) if r.status_code==200 else 0}")
    except Exception as e:
        log("SENSOR-04: List nodes (farmer)", "FAIL", str(e)[:150])

    if bt:
        try:
            r = api("/sensors/nodes", method="GET", headers=auth(bt))
            ok = r.status_code == 200 and r.json() == []
            log("SENSOR-05: List nodes (buyer — empty)", "PASS" if ok else "FAIL",
                f"Got {r.status_code}, count={len(r.json())}")
        except Exception as e:
            log("SENSOR-05: List nodes (buyer — empty)", "FAIL", str(e)[:150])

    try:
        r = api("/sensors/nodes", method="GET")
        log("SENSOR-06: List nodes no auth", "PASS" if r.status_code == 403 else "FAIL",
            f"Expected 403, got {r.status_code}")
    except Exception as e:
        log("SENSOR-06: List nodes no auth", "FAIL", str(e)[:150])

    # Ingest — these are no-auth endpoints
    for label, payload, code in [
        ("SENSOR-07: Ingest reading", {"device_id": f"auto-esp-{uniq}", "temperature": 28.5,
                                        "humidity": 65.0, "soil_moisture": 45.0, "ph": 6.2}, 204),
        ("SENSOR-08: Ingest unknown device", {"device_id": "unknown-xyz", "temperature": 30.0}, 204),
        ("SENSOR-09: Ingest partial", {"device_id": f"auto-esp-{uniq}", "temperature": 35.5}, 204),
        ("SENSOR-10: Ingest anomaly", {"device_id": f"auto-esp-{uniq}", "temperature": 42.0, "humidity": 95.0}, 204),
    ]:
        try:
            r = api("/sensors/ingest", json=payload)
            log(label, "PASS" if r.status_code == code else "FAIL",
                f"Expected {code}, got {r.status_code}")
        except Exception as e:
            log(label, "FAIL", str(e)[:150])

    try:
        r = api("/sensors/ingest", json={"device_id": f"auto-esp-{uniq}", "temperature": "bad"})
        log("SENSOR-11: Ingest invalid", "PASS" if r.status_code == 422 else "FAIL",
            f"Expected 422, got {r.status_code}")
    except Exception as e:
        log("SENSOR-11: Ingest invalid", "FAIL", str(e)[:150])

    if node_id:
        try:
            r = api(f"/sensors/nodes/{node_id}/readings?limit=10", method="GET", headers=auth(ft))
            ok = r.status_code == 200 and isinstance(r.json(), list)
            log("SENSOR-12: Get readings", "PASS" if ok else "FAIL",
                f"Got {r.status_code}, count={len(r.json()) if ok else 0}")
        except Exception as e:
            log("SENSOR-12: Get readings", "FAIL", str(e)[:150])

        try:
            r = api(f"/sensors/nodes/{node_id}/readings", method="GET", headers=auth(ft))
            ok = r.status_code == 200 and isinstance(r.json(), list)
            log("SENSOR-13: Readings default limit", "PASS" if ok else "FAIL",
                f"Got {r.status_code}")
        except Exception as e:
            log("SENSOR-13: Readings default limit", "FAIL", str(e)[:150])

    try:
        r = api("/sensors/nodes/00000000-0000-0000-0000-000000000000/readings",
                method="GET", headers=auth(ft))
        log("SENSOR-14: Other's node readings", "PASS" if r.status_code == 404 else "FAIL",
            f"Expected 404, got {r.status_code}")
    except Exception as e:
        log("SENSOR-14: Other's node readings", "FAIL", str(e)[:150])

    return node_id


def t_ai(tokens: dict):
    section("AI — Diagnosis & Grading")
    ft = tokens.get("farmer")
    bt = tokens.get("buyer")
    if not ft:
        log("AI-*", "SKIP", "No farmer token")
        return

    # Check test images exist
    required = ["Tomato___healthy.jpg", "Tomato___Late_blight.jpg",
                "Tomato___Early_blight.jpg", "Pepper_bell___Bacterial_spot.jpg"]
    missing = [f for f in required if not (TEST_IMAGES_DIR / f).exists()]
    if missing:
        log("AI-* (images)", "SKIP", f"Missing: {missing}")
        return

    # Diagnose as farmer
    for label, image, check in [
        ("AI-01: Diagnose healthy (farmer)", "Tomato___healthy.jpg",
         lambda d: d.get("is_healthy") is True),
        ("AI-02: Diagnose late blight", "Tomato___Late_blight.jpg",
         lambda d: d.get("is_healthy") is False),
        ("AI: Diagnose early blight", "Tomato___Early_blight.jpg",
         lambda d: "Early" in d.get("disease_name", "")),
        ("AI: Diagnose pepper bacterial spot", "Pepper_bell___Bacterial_spot.jpg",
         lambda d: "Bacterial" in d.get("disease_name", "")),
    ]:
        try:
            r = api("/ai/diagnose", files={"file": ("img.jpg", img(image), "image/jpeg")},
                    headers=auth(ft))
            ok = r.status_code == 200 and check(r.json())
            log(label, "PASS" if ok else "FAIL",
                f"Got {r.status_code}: {r.text[:100]}")
        except Exception as e:
            log(label, "FAIL", str(e)[:150])

    # Diagnose as buyer (should work)
    if bt:
        try:
            r = api("/ai/diagnose", files={"file": ("img.jpg", img("Tomato___healthy.jpg"), "image/jpeg")},
                    headers=auth(bt))
            log("AI-03: Diagnose as buyer", "PASS" if r.status_code == 200 else "FAIL",
                f"Expected 200, got {r.status_code}: {r.text[:80]}")
        except Exception as e:
            log("AI-03: Diagnose as buyer", "FAIL", str(e)[:150])

    # No auth
    try:
        r = api("/ai/diagnose", files={"file": ("img.jpg", b"fake", "image/jpeg")})
        log("AI-04: Diagnose no auth", "PASS" if r.status_code == 403 else "FAIL",
            f"Expected 403, got {r.status_code}")
    except Exception as e:
        log("AI-04: Diagnose no auth", "FAIL", str(e)[:150])

    # No file
    try:
        r = api("/ai/diagnose", headers=auth(ft))
        log("AI-05: Diagnose no file", "PASS" if r.status_code == 422 else "FAIL",
            f"Expected 422, got {r.status_code}")
    except Exception as e:
        log("AI-05: Diagnose no file", "FAIL", str(e)[:150])


def t_grading(tokens: dict, crop_id):
    """Grading tests — requires a crop to grade."""
    section("AI — Grading")
    ft, bt = tokens.get("farmer"), tokens.get("buyer")
    if not ft:
        log("GRADE-*", "SKIP", "No farmer token")
        return
    if not crop_id:
        log("GRADE-*", "SKIP", "No crop_id — create crop first")
        return

    # GRADE-01: Grade own crop as farmer
    try:
        r = api(f"/ai/grade/{crop_id}", files={"file": ("img.jpg", img("Tomato___healthy.jpg"), "image/jpeg")},
                headers=auth(ft))
        ok = r.status_code == 200 and r.json().get("grade") in ("A", "B", "C")
        log("GRADE-01: Grade own crop (farmer)", "PASS" if ok else "FAIL",
            f"Got {r.status_code}: grade={r.json().get('grade') if ok else r.text[:80]}")
    except Exception as e:
        log("GRADE-01: Grade own crop (farmer)", "FAIL", str(e)[:150])

    # GRADE-03: Grade as buyer — forbidden
    if bt:
        try:
            r = api(f"/ai/grade/{crop_id}", files={"file": ("img.jpg", b"fake", "image/jpeg")},
                    headers=auth(bt))
            log("GRADE-03: Grade as buyer", "PASS" if r.status_code == 403 else "FAIL",
                f"Expected 403, got {r.status_code}")
        except Exception as e:
            log("GRADE-03: Grade as buyer", "FAIL", str(e)[:150])

    # GRADE-04: Grade non-existent crop
    try:
        r = api("/ai/grade/00000000-0000-0000-0000-000000000000",
                files={"file": ("img.jpg", b"fake", "image/jpeg")},
                headers=auth(ft))
        log("GRADE-04: Non-existent crop", "PASS" if r.status_code == 404 else "FAIL",
            f"Expected 404, got {r.status_code}")
    except Exception as e:
        log("GRADE-04: Non-existent crop", "FAIL", str(e)[:150])
def t_marketplace(tokens: dict):
    section("Marketplace")
    ft, bt = tokens.get("farmer"), tokens.get("buyer")
    if not ft:
        log("MKT-*", "SKIP", "No farmer token")
        return

    crop_id = None
    try:
        r = api("/marketplace/crops", headers=auth(ft), json={
            "name": "Tomat Auto", "variety": "Cherry",
            "quantity_kg": 100, "price_per_kg": 15000,
        })
        ok = r.status_code == 201
        if ok:
            crop_id = r.json().get("id")
            session_data["crop_id"] = crop_id
        log("MKT-01: Create crop (farmer)", "PASS" if ok else "FAIL", f"Got {r.status_code}")
    except Exception as e:
        log("MKT-01: Create crop (farmer)", "FAIL", str(e)[:150])

    if bt:
        try:
            r = api("/marketplace/crops", headers=auth(bt),
                    json={"name": "X", "quantity_kg": 10, "price_per_kg": 5000})
            log("MKT-02: Create crop (buyer)", "PASS" if r.status_code == 403 else "FAIL",
                f"Expected 403, got {r.status_code}")
        except Exception as e:
            log("MKT-02: Create crop (buyer)", "FAIL", str(e)[:150])

    try:
        r = api("/marketplace/crops", headers=auth(ft), json={"name": "Partial"})
        log("MKT-03: Crop missing fields", "PASS" if r.status_code == 422 else "FAIL",
            f"Expected 422, got {r.status_code}")
    except Exception as e:
        log("MKT-03: Crop missing fields", "FAIL", str(e)[:150])

    try:
        r = api("/marketplace/crops?available_only=true", method="GET", headers=auth(ft))
        ok = r.status_code == 200 and isinstance(r.json(), list)
        log("MKT-04: List available", "PASS" if ok else "FAIL",
            f"Got {r.status_code}, count={len(r.json()) if ok else 0}")
    except Exception as e:
        log("MKT-04: List available", "FAIL", str(e)[:150])

    if crop_id:
        try:
            r = api(f"/marketplace/crops/{crop_id}", method="GET", headers=auth(ft))
            ok = r.status_code == 200 and r.json().get("id") == crop_id
            log("MKT-06: Get single crop", "PASS" if ok else "FAIL", f"Got {r.status_code}")
        except Exception as e:
            log("MKT-06: Get single crop", "FAIL", str(e)[:150])

        try:
            r = api(f"/marketplace/crops/{crop_id}", method="PATCH", headers=auth(ft),
                    json={"price_per_kg": 18000, "quantity_kg": 80})
            ok = r.status_code == 200 and r.json().get("price_per_kg") == 18000
            log("MKT-08: Update crop", "PASS" if ok else "FAIL", f"Got {r.status_code}")
        except Exception as e:
            log("MKT-08: Update crop", "FAIL", str(e)[:150])

    try:
        r = api("/marketplace/crops/00000000-0000-0000-0000-000000000000", method="GET", headers=auth(ft))
        log("MKT-07: Non-existent crop", "PASS" if r.status_code == 404 else "FAIL",
            f"Expected 404, got {r.status_code}")
    except Exception as e:
        log("MKT-07: Non-existent crop", "FAIL", str(e)[:150])

    try:
        r = api("/marketplace/prices", method="GET", headers=auth(ft))
        ok = r.status_code == 200 and "prices" in r.json()
        log("MKT-10: Get prices", "PASS" if ok else "FAIL",
            f"Got {r.status_code}, prices={len(r.json().get('prices',[])) if ok else 'N/A'}")
    except Exception as e:
        log("MKT-10: Get prices", "FAIL", str(e)[:150])

    return crop_id


def t_transactions(tokens: dict, crop_id):
    section("Transactions")
    ft, bt = tokens.get("farmer"), tokens.get("buyer")
    if not ft or not bt:
        log("TXN-*", "SKIP", "Need farmer + buyer tokens")
        return
    if not crop_id:
        log("TXN-*", "SKIP", "No crop_id available")
        return

    ikey = f"auto-{int(time.time())}"
    order_id = None

    try:
        r = api("/transactions/orders", headers={**auth(bt), "Idempotency-Key": ikey},
                json={"crop_id": crop_id, "quantity_kg": 10})
        ok = r.status_code == 201 and r.json().get("status") == "pending"
        if ok:
            order_id = r.json().get("id")
            session_data["order_id"] = order_id
        log("TXN-01: Create order (buyer)", "PASS" if ok else "FAIL",
            f"Got {r.status_code}: {r.text[:100]}")
    except Exception as e:
        log("TXN-01: Create order (buyer)", "FAIL", str(e)[:150])

    try:
        r = api("/transactions/orders", headers={**auth(ft), "Idempotency-Key": f"{ikey}-f" },
                json={"crop_id": crop_id, "quantity_kg": 5})
        log("TXN-02: Order as farmer", "PASS" if r.status_code == 403 else "FAIL",
            f"Expected 403, got {r.status_code}")
    except Exception as e:
        log("TXN-02: Order as farmer", "FAIL", str(e)[:150])

    if order_id:
        try:
            r = api("/transactions/orders", headers={**auth(bt), "Idempotency-Key": ikey},
                    json={"crop_id": crop_id, "quantity_kg": 999})
            # Backend returns 201 (route default) even for idempotent hits — accept both
            ok = r.status_code in (200, 201) and r.json().get("id") == order_id
            log("TXN-03: Idempotent order", "PASS" if ok else "FAIL",
                f"Got {r.status_code}, id match={r.json().get('id')==order_id}")
        except Exception as e:
            log("TXN-03: Idempotent order", "FAIL", str(e)[:150])

    try:
        r = api("/transactions/orders", headers={**auth(bt), "Idempotency-Key": f"{ikey}-huge"},
                json={"crop_id": crop_id, "quantity_kg": 999999})
        log("TXN-04: Insufficient stock", "PASS" if r.status_code == 400 else "FAIL",
            f"Expected 400, got {r.status_code}")
    except Exception as e:
        log("TXN-04: Insufficient stock", "FAIL", str(e)[:150])

    for label, user, key in [
        ("TXN-06: List orders (buyer)", "buyer", None),
        ("TXN-07: List orders (farmer)", "farmer", None),
    ]:
        try:
            t = tokens.get(user)
            r = api("/transactions/orders", method="GET", headers=auth(t))
            ok = r.status_code == 200 and isinstance(r.json(), list)
            log(label, "PASS" if ok else "FAIL",
                f"Got {r.status_code}, count={len(r.json()) if ok else 0}")
        except Exception as e:
            log(label, "FAIL", str(e)[:150])

    if order_id:
        try:
            r = api(f"/transactions/orders/{order_id}/status?new_status=confirmed",
                    method="PATCH", headers=auth(ft))
            ok = r.status_code == 200 and r.json().get("status") == "confirmed"
            log("TXN-09: Update order status", "PASS" if ok else "FAIL",
                f"Got {r.status_code}: {r.text[:80]}")
        except Exception as e:
            log("TXN-09: Update order status", "FAIL", str(e)[:150])

        try:
            r = api(f"/transactions/orders/{order_id}/status?new_status=confirmed",
                    method="PATCH", headers=auth(bt))
            log("TXN-11: Update as buyer", "PASS" if r.status_code == 403 else "FAIL",
                f"Expected 403, got {r.status_code}")
        except Exception as e:
            log("TXN-11: Update as buyer", "FAIL", str(e)[:150])

    try:
        r = api("/transactions/orders", headers=auth(bt),
                json={"crop_id": crop_id, "quantity_kg": 1})
        log("TXN-13: Missing Idempotency-Key", "PASS" if r.status_code == 422 else "FAIL",
            f"Expected 422, got {r.status_code}")
    except Exception as e:
        log("TXN-13: Missing Idempotency-Key", "FAIL", str(e)[:150])


def t_ai_direct():
    section("AI Service — Direct (port 8001)")

    try:
        r = httpx.get(f"{AI_URL}/health", timeout=10.0)
        d = r.json()
        ok = d.get("status") == "ok"
        log("AIHEALTH-01: Service health", "PASS" if ok else "FAIL",
            f"grading={d.get('grading_model')}, disease={d.get('disease_model')}")
    except Exception as e:
        log("AIHEALTH-01: Service health", "FAIL", str(e)[:150])

    for label, endpoint, payload in [
        ("AIDIAG-01: Diagnose healthy",
         "/diagnose",
         {"files": {"file": ("h.jpg", img("Tomato___healthy.jpg"), "image/jpeg")}}),
        ("AIGRADE-01: Grade healthy",
         "/grade",
         {"files": {"file": ("h.jpg", img("Tomato___healthy.jpg"), "image/jpeg")},
          "data": {"crop_id": "auto-test"}}),
    ]:
        try:
            r = httpx.post(f"{AI_URL}{endpoint}", timeout=30.0, **payload)
            ok = r.status_code == 200
            log(label, "PASS" if ok else "FAIL",
                f"Got {r.status_code}: {r.text[:100]}")
        except Exception as e:
            log(label, "FAIL", str(e)[:150])

    for label, endpoint, body in [
        ("AILLM-01: Disease insight", "/insight/disease",
         {"disease_name": "Late Blight (Tomat)", "confidence": 0.87, "is_healthy": False}),
        ("AILLM-03: Grading insight", "/insight/grading",
         {"grade": "A", "confidence": 0.92, "grade_a_prob": 0.92, "grade_b_prob": 0.05, "grade_c_prob": 0.03}),
        ("AILLM-05: Sensor insight", "/insight/sensor",
         {"temperature": 25.0, "humidity": 60.0, "soil_moisture": 50.0, "ph": 6.5}),
    ]:
        try:
            r = httpx.post(f"{AI_URL}{endpoint}", json=body, timeout=30.0)
            insight = r.json().get("insight", "")
            ok = r.status_code == 200 and len(insight) > 0
            log(label, "PASS" if ok else "FAIL",
                f"Got {r.status_code}, insight_len={len(insight)}")
        except Exception as e:
            log(label, "FAIL", str(e)[:150])


def t_security(tokens: dict):
    section("Security")
    ft = tokens.get("farmer")

    # CORS: OPTIONS preflight
    try:
        r = httpx.options(f"{BACKEND_DIRECT}/health", timeout=10.0,
                          headers={"Origin": "http://example.com",
                                   "Access-Control-Request-Method": "GET"})
        acao = r.headers.get("access-control-allow-origin", "")
        acam = r.headers.get("access-control-allow-methods", "")
        # With allow_credentials=True, some implementations echo the origin
        ok = acao == "*" or "GET" in acam
        log("SEC-07: CORS headers", "PASS" if ok else "FAIL",
            f"ACAO={acao}, ACAM={acam}")
    except Exception as e:
        log("SEC-07: CORS headers", "FAIL", str(e)[:150])

    # SQL injection: parameterized queries protect against this
    try:
        r = api("/sensors/ingest", json={
            "device_id": "'; DROP TABLE users; --",
            "temperature": 25.0,
        })
        ok = r.status_code == 204
        # Verify DB not corrupted by checking health + auth still works
        h = httpx.get(f"{BACKEND_DIRECT}/health", timeout=10.0)
        ok = ok and h.status_code == 200
        if ft:
            try:
                register(f"sqli_{int(time.time())}@test.com", "farmer")
            except:
                ok = False
        log("SEC-09: SQL injection attempt", "PASS" if ok else "FAIL",
            f"Ingest={r.status_code}, Health={h.status_code}")
    except Exception as e:
        log("SEC-09: SQL injection attempt", "FAIL", str(e)[:150])

    # Auth header required for protected endpoints
    if ft:
        for label, ep, method in [
            ("SEC-03a: /sensors/nodes requires auth", "/sensors/nodes", "GET"),
            ("SEC-03b: /marketplace/crops requires auth", "/marketplace/crops", "GET"),
        ]:
            try:
                r = api(ep, method=method)
                ok = r.status_code == 403
                log(label, "PASS" if ok else "FAIL",
                    f"Expected 403, got {r.status_code}")
            except Exception as e:
                log(label, "FAIL", str(e)[:150])


def t_regression(tokens: dict, crop_id):
    section("Regression Flows")

    ft, bt = tokens.get("farmer"), tokens.get("buyer")

    # R01: Full auth cycle
    try:
        e = f"reg_{int(time.time())}@test.com"
        t1 = register(e, "farmer")
        t2 = login(e)
        r = api("/auth/me", method="GET", headers=auth(t2))
        ok = r.status_code == 200 and r.json().get("email") == e
        log("R01: Auth full cycle", "PASS" if ok else "FAIL", f"Status={r.status_code}")
    except Exception as e:
        log("R01: Auth full cycle", "FAIL", str(e)[:150])

    # R02: Sensor pipeline
    nid = session_data.get("node_id")
    if ft and nid:
        try:
            r1 = api("/sensors/nodes", method="GET", headers=auth(ft))
            r2 = api(f"/sensors/nodes/{nid}/readings?limit=5", method="GET", headers=auth(ft))
            ok = r1.status_code == 200 and r2.status_code == 200
            log("R02: Sensor pipeline", "PASS" if ok else "FAIL",
                f"Nodes={r1.status_code}, Readings={r2.status_code}")
        except Exception as e:
            log("R02: Sensor pipeline", "FAIL", str(e)[:150])

    # R05: Marketplace → Order → Status
    if ft and bt and crop_id:
        try:
            k = f"reg_{int(time.time())}"
            r = api("/transactions/orders", headers={**auth(bt), "Idempotency-Key": k},
                    json={"crop_id": crop_id, "quantity_kg": 5})
            oid = r.json().get("id") if r.status_code in (200, 201) else None
            if oid:
                r2 = api(f"/transactions/orders/{oid}/status?new_status=confirmed",
                         method="PATCH", headers=auth(ft))
                ok = r2.status_code == 200 and r2.json().get("status") == "confirmed"
                log("R05: Marketplace→Order→Status", "PASS" if ok else "FAIL",
                    f"Create={r.status_code}, Update={r2.status_code}")
            else:
                log("R05: Marketplace→Order→Status", "FAIL",
                    f"Create failed: {r.status_code}")
        except Exception as e:
            log("R05: Marketplace→Order→Status", "FAIL", str(e)[:150])


# ── Main ─────────────────────────────────────────────────────────────────────

def check():
    errors = []
    try:
        r = httpx.get(f"{BACKEND_DIRECT}/health", timeout=5.0)
        if r.status_code != 200 or r.json().get("status") != "ok":
            errors.append(f"Backend unhealthy: {r.status_code} {r.text[:80]}")
    except Exception as e:
        errors.append(f"Backend unreachable: {e}")

    try:
        r = httpx.get(f"{AI_URL}/health", timeout=5.0)
        if r.status_code != 200:
            errors.append(f"AI unhealthy: {r.status_code}")
    except Exception as e:
        errors.append(f"AI unreachable: {e}")

    for img in ["Tomato___healthy.jpg", "Tomato___Late_blight.jpg"]:
        if not (TEST_IMAGES_DIR / img).exists():
            errors.append(f"Missing test image: {img}")
            break

    if errors:
        print("❌ Prerequisites failed:")
        for e in errors:
            print(f"   • {e}")
        return False
    return True


def summary():
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")
    total = len(results)

    print(f"\n{'='*70}")
    print(f"  TEST SUMMARY")
    print(f"{'='*70}")
    print(f"  Total:  {total}")
    print(f"  Passed: {passed} ✅")
    print(f"  Failed: {failed} ❌")
    print(f"  Skipped: {skipped} ⚠️")
    if total:
        print(f"  Rate:   {passed/total*100:.1f}%")

    if failed:
        print(f"\n  Failed:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"    ❌ {r['id']}")
                if r["detail"]:
                    print(f"       {r['detail']}")

    return failed == 0


def main():
    global VERBOSE
    parser = argparse.ArgumentParser(description="Agri Platform Automated Test Suite")
    parser.add_argument("--smoke-only", action="store_true", help="Run smoke tests only")
    args = parser.parse_args()

    print(f"{'='*70}")
    print(f"  Agri Platform — Automated Test Suite")
    print(f"  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Backend: {BACKEND_API}")
    print(f"  AI:      {AI_URL}")
    print(f"{'='*70}")

    if not check():
        sys.exit(1)

    try:
        t_health()

        if not args.smoke_only:
            tokens = t_auth()
            if tokens.get("farmer"):
                t_sensors(tokens)
                t_ai(tokens)
                crop_id = t_marketplace(tokens)
                t_grading(tokens, crop_id)
                t_transactions(tokens, crop_id)
                t_regression(tokens, crop_id)
            t_ai_direct()
            t_security(tokens)

        success = summary()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted")
        summary()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unhandled: {e}")
        traceback.print_exc()
        summary()
        sys.exit(1)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
