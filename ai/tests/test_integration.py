"""
Integration test: Tests the full flow from Backend API → AI Service.

This test starts the AI inference server and makes HTTP requests to it,
simulating how the backend service communicates with the AI service.

Run with: python -m ai.tests.test_integration
"""

import io
import sys
import logging
import time
import threading

import httpx
import uvicorn
from PIL import Image
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AI_SERVICE_PORT = 8099  # Use non-standard port for testing


def create_test_leaf_image() -> bytes:
    """Create a realistic-looking leaf image for testing."""
    img = np.zeros((224, 224, 3), dtype=np.uint8)
    # Green background (leaf)
    img[:, :, 1] = 120  # Green channel
    img[:, :, 0] = 40   # Red channel
    img[:, :, 2] = 30   # Blue channel
    # Add some variation
    noise = np.random.randint(-20, 20, img.shape, dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG")
    return buffer.getvalue()


def create_test_tomato_image() -> bytes:
    """Create a red tomato-like image for grading."""
    img = np.zeros((224, 224, 3), dtype=np.uint8)
    # Red tomato color
    img[:, :, 0] = 200  # Red
    img[:, :, 1] = 50   # Green
    img[:, :, 2] = 30   # Blue
    noise = np.random.randint(-15, 15, img.shape, dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    pil_img = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG")
    return buffer.getvalue()


def start_server():
    """Start the AI inference server in a background thread."""
    from ai.api.inference_server import app
    config = uvicorn.Config(app, host="127.0.0.1", port=AI_SERVICE_PORT, log_level="warning")
    server = uvicorn.Server(config)
    server.run()


def wait_for_server(url: str, timeout: int = 30):
    """Wait for the server to be ready."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = httpx.get(f"{url}/health", timeout=2)
            if resp.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def test_grading_endpoint(base_url: str):
    """Test the /grade endpoint."""
    logger.info("Testing /grade endpoint...")

    image_bytes = create_test_tomato_image()

    response = httpx.post(
        f"{base_url}/grade",
        files={"file": ("tomato.jpg", image_bytes, "image/jpeg")},
        data={"crop_id": "550e8400-e29b-41d4-a716-446655440000"},
        timeout=30,
    )

    assert response.status_code in (200, 503), f"Expected 200 or 503, got {response.status_code}: {response.text}"
    if response.status_code == 503:
        logger.info("  /grade unavailable as expected without checkpoint.")
        return True
    data = response.json()

    assert "crop_id" in data
    assert "grade" in data
    assert data["grade"] in ["A", "B", "C"]
    assert "confidence" in data
    assert 0 <= data["confidence"] <= 1
    assert "grade_a_prob" in data
    assert "grade_b_prob" in data
    assert "grade_c_prob" in data
    assert data.get("mode") in ["model", "demo_fallback"]

    # Verify probabilities sum to ~1
    prob_sum = data["grade_a_prob"] + data["grade_b_prob"] + data["grade_c_prob"]
    assert 0.95 <= prob_sum <= 1.05, f"Probabilities don't sum to 1: {prob_sum}"

    logger.info(f"  Grade: {data['grade']} (confidence: {data['confidence']:.4f})")
    logger.info(f"  Probs: A={data['grade_a_prob']:.4f}, B={data['grade_b_prob']:.4f}, C={data['grade_c_prob']:.4f}")
    logger.info("  ✓ /grade endpoint PASSED")
    return True


def test_diagnose_endpoint(base_url: str):
    """Test the /diagnose endpoint."""
    logger.info("Testing /diagnose endpoint...")

    image_bytes = create_test_leaf_image()

    response = httpx.post(
        f"{base_url}/diagnose",
        files={"file": ("leaf.jpg", image_bytes, "image/jpeg")},
        timeout=30,
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()

    assert "disease_name" in data
    assert "confidence" in data
    assert "recommendation" in data
    assert "is_healthy" in data
    assert isinstance(data["is_healthy"], bool)
    assert 0 <= data["confidence"] <= 1
    assert len(data["recommendation"]) > 0

    logger.info(f"  Disease: {data['disease_name']}")
    logger.info(f"  Confidence: {data['confidence']:.4f}")
    logger.info(f"  Healthy: {data['is_healthy']}")
    logger.info(f"  Recommendation: {data['recommendation'][:60]}...")
    logger.info("  ✓ /diagnose endpoint PASSED")
    return True


def test_health_endpoint(base_url: str):
    """Test the /health endpoint."""
    logger.info("Testing /health endpoint...")

    response = httpx.get(f"{base_url}/health", timeout=10)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] in ["ok", "unavailable"]
    assert "capabilities" in data
    assert {"diagnosis", "grading", "llm"}.issubset(data["capabilities"])

    logger.info(f"  Status: {data}")
    logger.info("  ✓ /health endpoint PASSED")
    return True


def test_error_handling(base_url: str):
    """Test error handling with invalid inputs."""
    logger.info("Testing error handling...")

    # Invalid image file
    response = httpx.post(
        f"{base_url}/grade",
        files={"file": ("bad.txt", b"not an image at all", "text/plain")},
        data={"crop_id": "test-id"},
        timeout=10,
    )
    assert response.status_code == 400
    logger.info("  Invalid image correctly returns 400")

    # Missing crop_id for grade
    response = httpx.post(
        f"{base_url}/grade",
        files={"file": ("test.jpg", create_test_tomato_image(), "image/jpeg")},
        timeout=10,
    )
    assert response.status_code == 422  # Validation error
    logger.info("  Missing crop_id correctly returns 422")

    logger.info("  ✓ Error handling PASSED")
    return True


def test_response_time(base_url: str):
    """Test that inference completes within acceptable time (<5 seconds per spec)."""
    logger.info("Testing response time (target: <5 seconds)...")

    image_bytes = create_test_leaf_image()

    start = time.time()
    response = httpx.post(
        f"{base_url}/diagnose",
        files={"file": ("leaf.jpg", image_bytes, "image/jpeg")},
        timeout=10,
    )
    elapsed = time.time() - start

    assert response.status_code == 200
    assert elapsed < 5.0, f"Inference took {elapsed:.2f}s, exceeds 5s target"

    logger.info(f"  Diagnosis inference time: {elapsed:.3f}s")

    start = time.time()
    response = httpx.post(
        f"{base_url}/grade",
        files={"file": ("tomato.jpg", create_test_tomato_image(), "image/jpeg")},
        data={"crop_id": "test-id"},
        timeout=10,
    )
    elapsed = time.time() - start

    assert response.status_code == 200
    assert elapsed < 5.0, f"Grading took {elapsed:.2f}s, exceeds 5s target"

    logger.info(f"  Grading inference time: {elapsed:.3f}s")
    logger.info("  ✓ Response time PASSED (both < 5s)")
    return True


def main():
    """Run integration tests."""
    logger.info("=" * 60)
    logger.info("AI SERVICE INTEGRATION TESTS")
    logger.info("=" * 60)

    base_url = f"http://127.0.0.1:{AI_SERVICE_PORT}"

    # Start server in background
    logger.info(f"Starting AI service on port {AI_SERVICE_PORT}...")
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    if not wait_for_server(base_url):
        logger.error("Server failed to start within timeout!")
        return 1

    logger.info("Server is ready.\n")

    results = {}
    tests = [
        ("health", test_health_endpoint),
        ("grading", test_grading_endpoint),
        ("diagnosis", test_diagnose_endpoint),
        ("error_handling", test_error_handling),
        ("response_time", test_response_time),
    ]

    for name, test_fn in tests:
        try:
            results[name] = test_fn(base_url)
        except Exception as e:
            logger.error(f"  ✗ {name} FAILED: {e}")
            results[name] = False

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("INTEGRATION TEST RESULTS")
    logger.info("=" * 60)
    for name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        logger.info(f"  {name}: {status}")

    all_passed = all(results.values())
    logger.info(f"\nOverall: {'ALL TESTS PASSED ✓' if all_passed else 'SOME TESTS FAILED ✗'}")
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
