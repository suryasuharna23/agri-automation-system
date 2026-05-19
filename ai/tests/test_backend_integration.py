"""
End-to-end test: Simulates the Backend → AI Service integration.

This test verifies that:
1. The AI service starts and responds correctly
2. The backend's ai_service.py client can communicate with the AI service
3. The response format matches the Pydantic schemas (GradingResult, DiagnosisResult)
4. Error handling works correctly

Run with: python -m ai.tests.test_backend_integration
"""

import asyncio
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

AI_SERVICE_PORT = 8098


def start_ai_server():
    """Start the AI inference server."""
    from ai.api.inference_server import app
    config = uvicorn.Config(app, host="127.0.0.1", port=AI_SERVICE_PORT, log_level="warning")
    server = uvicorn.Server(config)
    server.run()


def wait_for_server(timeout: int = 30) -> bool:
    """Wait for server to be ready."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = httpx.get(f"http://127.0.0.1:{AI_SERVICE_PORT}/health", timeout=2)
            if resp.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def create_leaf_image_bytes() -> bytes:
    """Create a test leaf image."""
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    img[:, :, 1] = 130
    img[:, :, 0] = 45
    img[:, :, 2] = 25
    noise = np.random.randint(-10, 10, img.shape, dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    pil_img = Image.fromarray(img)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG")
    return buf.getvalue()


async def test_backend_grading_client():
    """Test the backend's grade_crop_image function against the running AI service."""
    logger.info("Testing backend grading client...")

    # Temporarily override the AI service URL
    import app.config as config_module
    original_url = config_module.settings.ai_service_url
    config_module.settings.ai_service_url = f"http://127.0.0.1:{AI_SERVICE_PORT}"

    try:
        from app.services.ai_service import grade_crop_image
        from app.schemas.crop import GradingResult

        image_bytes = create_leaf_image_bytes()
        result = await grade_crop_image(image_bytes, "test_tomato.jpg", "550e8400-e29b-41d4-a716-446655440000")

        assert isinstance(result, GradingResult), f"Expected GradingResult, got {type(result)}"
        assert result.grade in ["A", "B", "C"], f"Invalid grade: {result.grade}"
        assert 0 <= result.confidence <= 1
        assert 0 <= result.grade_a_prob <= 1
        assert 0 <= result.grade_b_prob <= 1
        assert 0 <= result.grade_c_prob <= 1

        logger.info(f"  Result: Grade {result.grade} (confidence: {result.confidence:.4f})")
        logger.info("  ✓ Backend grading client PASSED")
        return True
    finally:
        config_module.settings.ai_service_url = original_url


async def test_backend_diagnosis_client():
    """Test the backend's diagnose_plant_disease function."""
    logger.info("Testing backend diagnosis client...")

    import app.config as config_module
    original_url = config_module.settings.ai_service_url
    config_module.settings.ai_service_url = f"http://127.0.0.1:{AI_SERVICE_PORT}"

    try:
        from app.services.ai_service import diagnose_plant_disease
        from app.schemas.crop import DiagnosisResult

        image_bytes = create_leaf_image_bytes()
        result = await diagnose_plant_disease(image_bytes, "test_leaf.jpg")

        assert isinstance(result, DiagnosisResult), f"Expected DiagnosisResult, got {type(result)}"
        assert len(result.disease_name) > 0
        assert 0 <= result.confidence <= 1
        assert len(result.recommendation) > 0
        assert isinstance(result.is_healthy, bool)

        logger.info(f"  Result: {result.disease_name} (confidence: {result.confidence:.4f})")
        logger.info(f"  Healthy: {result.is_healthy}")
        logger.info(f"  Recommendation: {result.recommendation[:50]}...")
        logger.info("  ✓ Backend diagnosis client PASSED")
        return True
    finally:
        config_module.settings.ai_service_url = original_url


async def test_commodity_prices():
    """Test the commodity prices fallback."""
    logger.info("Testing commodity prices (fallback)...")

    from app.services.ai_service import get_commodity_prices

    result = await get_commodity_prices()
    assert isinstance(result, dict)
    # Since the external API likely won't be available, we should get fallback data
    if "prices" in result:
        assert len(result["prices"]) > 0
        logger.info(f"  Got {len(result['prices'])} commodity prices (fallback)")
    else:
        logger.info(f"  Got response: {list(result.keys())}")

    logger.info("  ✓ Commodity prices PASSED")
    return True


async def run_tests():
    """Run all async tests."""
    results = {}

    try:
        results["grading_client"] = await test_backend_grading_client()
    except Exception as e:
        logger.error(f"  ✗ Grading client FAILED: {e}")
        results["grading_client"] = False

    try:
        results["diagnosis_client"] = await test_backend_diagnosis_client()
    except Exception as e:
        logger.error(f"  ✗ Diagnosis client FAILED: {e}")
        results["diagnosis_client"] = False

    try:
        results["commodity_prices"] = await test_commodity_prices()
    except Exception as e:
        logger.error(f"  ✗ Commodity prices FAILED: {e}")
        results["commodity_prices"] = False

    return results


def main():
    logger.info("=" * 60)
    logger.info("BACKEND ↔ AI SERVICE INTEGRATION TESTS")
    logger.info("=" * 60)

    # Add backend to path
    sys.path.insert(0, str((Path(__file__).parent.parent.parent / "backend").resolve()))

    # Start AI server
    logger.info(f"Starting AI service on port {AI_SERVICE_PORT}...")
    server_thread = threading.Thread(target=start_ai_server, daemon=True)
    server_thread.start()

    if not wait_for_server():
        logger.error("AI server failed to start!")
        return 1

    logger.info("AI server ready.\n")

    # Run tests
    results = asyncio.run(run_tests())

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("RESULTS")
    logger.info("=" * 60)
    for name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        logger.info(f"  {name}: {status}")

    all_passed = all(results.values())
    logger.info(f"\nOverall: {'ALL TESTS PASSED ✓' if all_passed else 'SOME TESTS FAILED ✗'}")
    return 0 if all_passed else 1


if __name__ == "__main__":
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent.parent / "backend"))
    sys.exit(main())
