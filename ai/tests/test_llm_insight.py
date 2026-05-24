"""
Test the LLM Insight endpoints.

Without GEMINI_API_KEY, these endpoints require ENABLE_DEMO_AI_FALLBACK=true
to return demo fallback responses.

Run with: python -m ai.tests.test_llm_insight
"""

import sys
import logging
import os
import threading
import time

import httpx
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PORT = 8096


def start_server():
    os.environ.setdefault("ENABLE_DEMO_AI_FALLBACK", "true")
    from ai.api.inference_server import app
    config = uvicorn.Config(app, host="127.0.0.1", port=PORT, log_level="warning")
    uvicorn.Server(config).run()


def main():
    logger.info("Starting AI server for LLM insight tests...")
    t = threading.Thread(target=start_server, daemon=True)
    t.start()

    base = f"http://127.0.0.1:{PORT}"
    for _ in range(30):
        try:
            r = httpx.get(f"{base}/health", timeout=2)
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(0.5)
    else:
        logger.error("Server failed to start!")
        return 1

    logger.info("Server ready. Testing LLM insight endpoints...\n")
    all_passed = True

    # Test 1: Disease insight
    logger.info("Test 1: POST /insight/disease")
    r = httpx.post(f"{base}/insight/disease", json={
        "disease_name": "Early Blight (Tomat)",
        "confidence": 0.92,
        "is_healthy": False,
        "sensor_data": {"temperature": 32, "humidity": 85, "soil_moisture": 60, "ph": 6.2}
    }, timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "insight" in data
    assert len(data["insight"]) > 20
    logger.info(f"  Status: {r.status_code}")
    logger.info(f"  Insight: {data['insight'][:120]}...")
    logger.info("  PASSED\n")

    # Test 2: Disease insight (healthy)
    logger.info("Test 2: POST /insight/disease (healthy)")
    r = httpx.post(f"{base}/insight/disease", json={
        "disease_name": "Healthy",
        "confidence": 0.95,
        "is_healthy": True,
    }, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "insight" in data
    assert len(data["insight"]) > 20
    logger.info(f"  Insight: {data['insight'][:120]}...")
    logger.info("  PASSED\n")

    # Test 3: Grading insight
    logger.info("Test 3: POST /insight/grading")
    r = httpx.post(f"{base}/insight/grading", json={
        "grade": "B",
        "confidence": 0.65,
        "grade_a_prob": 0.25,
        "grade_b_prob": 0.65,
        "grade_c_prob": 0.10,
    }, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "insight" in data
    assert len(data["insight"]) > 20
    logger.info(f"  Insight: {data['insight'][:120]}...")
    logger.info("  PASSED\n")

    # Test 4: Sensor insight
    logger.info("Test 4: POST /insight/sensor")
    r = httpx.post(f"{base}/insight/sensor", json={
        "temperature": 38,
        "humidity": 90,
        "soil_moisture": 25,
        "ph": 5.2,
    }, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "insight" in data
    assert len(data["insight"]) > 20
    logger.info(f"  Insight: {data['insight'][:120]}...")
    logger.info("  PASSED\n")

    # Test 5: Sensor insight (optimal conditions)
    logger.info("Test 5: POST /insight/sensor (optimal)")
    r = httpx.post(f"{base}/insight/sensor", json={
        "temperature": 26,
        "humidity": 65,
        "soil_moisture": 55,
        "ph": 6.5,
    }, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "insight" in data
    logger.info(f"  Insight: {data['insight'][:120]}...")
    logger.info("  PASSED\n")

    logger.info("=" * 50)
    logger.info("ALL LLM INSIGHT TESTS PASSED")
    logger.info("=" * 50)
    logger.info("\nNote: Tests ran in FALLBACK mode (no GEMINI_API_KEY).")
    logger.info("Set GEMINI_API_KEY env var to enable Gemini-powered responses.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
