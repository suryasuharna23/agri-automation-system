"""
Tests for AI models - grading and disease detection.

Run with: python -m pytest ai/tests/test_models.py -v
Or standalone: python -m ai.tests.test_models
"""

import sys
import logging
from pathlib import Path
from PIL import Image
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_test_image(color: tuple = (100, 150, 50), size: tuple = (224, 224)) -> Image.Image:
    """Create a synthetic test image."""
    img_array = np.random.randint(0, 255, (size[1], size[0], 3), dtype=np.uint8)
    # Add dominant color
    img_array[:, :, 0] = np.clip(img_array[:, :, 0] * 0.3 + color[0] * 0.7, 0, 255)
    img_array[:, :, 1] = np.clip(img_array[:, :, 1] * 0.3 + color[1] * 0.7, 0, 255)
    img_array[:, :, 2] = np.clip(img_array[:, :, 2] * 0.3 + color[2] * 0.7, 0, 255)
    return Image.fromarray(img_array.astype(np.uint8))


def test_grading_model():
    """Test the grading model with synthetic images."""
    logger.info("=" * 60)
    logger.info("Testing Grading Model")
    logger.info("=" * 60)

    from ai.inference.grading_model import get_grading_model

    model = get_grading_model()
    assert model is not None, "Grading model failed to load"

    # Test with a green (healthy-looking) image
    green_image = create_test_image(color=(50, 180, 50))
    result = model.predict(green_image)

    logger.info(f"Green image result: {result}")
    assert "grade" in result, "Missing 'grade' in result"
    assert result["grade"] in ["A", "B", "C"], f"Invalid grade: {result['grade']}"
    assert "confidence" in result, "Missing 'confidence' in result"
    assert 0 <= result["confidence"] <= 1, f"Invalid confidence: {result['confidence']}"
    assert "grade_a_prob" in result, "Missing 'grade_a_prob'"
    assert "grade_b_prob" in result, "Missing 'grade_b_prob'"
    assert "grade_c_prob" in result, "Missing 'grade_c_prob'"

    # Test with a brown (damaged-looking) image
    brown_image = create_test_image(color=(80, 50, 30))
    result2 = model.predict(brown_image)
    logger.info(f"Brown image result: {result2}")
    assert result2["grade"] in ["A", "B", "C"]

    # Test with a bright red (ripe tomato-like) image
    red_image = create_test_image(color=(200, 50, 30))
    result3 = model.predict(red_image)
    logger.info(f"Red image result: {result3}")
    assert result3["grade"] in ["A", "B", "C"]

    logger.info("✓ Grading model tests PASSED")
    return True


def test_disease_model():
    """Test the disease detection model."""
    logger.info("=" * 60)
    logger.info("Testing Disease Detection Model")
    logger.info("=" * 60)

    from ai.inference.disease_model import get_disease_model

    model = get_disease_model()
    assert model is not None, "Disease model failed to load"

    # Test with a green leaf-like image
    leaf_image = create_test_image(color=(60, 140, 40))
    result = model.predict(leaf_image)

    logger.info(f"Leaf image result: {result}")
    assert "disease_name" in result, "Missing 'disease_name'"
    assert "confidence" in result, "Missing 'confidence'"
    assert "recommendation" in result, "Missing 'recommendation'"
    assert "is_healthy" in result, "Missing 'is_healthy'"
    assert isinstance(result["is_healthy"], bool), "is_healthy should be bool"
    assert 0 <= result["confidence"] <= 1, f"Invalid confidence: {result['confidence']}"
    assert len(result["recommendation"]) > 0, "Recommendation should not be empty"

    # Test with a spotted leaf image (simulating disease)
    spotted_image = create_test_image(color=(120, 100, 40))
    result2 = model.predict(spotted_image)
    logger.info(f"Spotted image result: {result2}")
    assert "disease_name" in result2

    # Test with a very dark image
    dark_image = create_test_image(color=(20, 20, 20))
    result3 = model.predict(dark_image)
    logger.info(f"Dark image result: {result3}")
    assert "disease_name" in result3

    logger.info("✓ Disease model tests PASSED")
    return True


def test_inference_server():
    """Test the FastAPI inference server endpoints."""
    logger.info("=" * 60)
    logger.info("Testing Inference Server (unit)")
    logger.info("=" * 60)

    import io
    from fastapi.testclient import TestClient
    from ai.api.inference_server import app

    client = TestClient(app)

    # Test health endpoint
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "degraded"]
    logger.info(f"Health check: {data}")

    # Test grading endpoint
    test_image = create_test_image(color=(100, 150, 50))
    img_bytes = io.BytesIO()
    test_image.save(img_bytes, format="JPEG")
    img_bytes.seek(0)

    response = client.post(
        "/grade",
        files={"file": ("test.jpg", img_bytes, "image/jpeg")},
        data={"crop_id": "test-crop-123"},
    )
    assert response.status_code == 200, f"Grade endpoint failed: {response.text}"
    data = response.json()
    assert data["crop_id"] == "test-crop-123"
    assert data["grade"] in ["A", "B", "C"]
    logger.info(f"Grade endpoint: {data}")

    # Test diagnosis endpoint
    leaf_image = create_test_image(color=(60, 140, 40))
    img_bytes2 = io.BytesIO()
    leaf_image.save(img_bytes2, format="JPEG")
    img_bytes2.seek(0)

    response = client.post(
        "/diagnose",
        files={"file": ("leaf.jpg", img_bytes2, "image/jpeg")},
    )
    assert response.status_code == 200, f"Diagnose endpoint failed: {response.text}"
    data = response.json()
    assert "disease_name" in data
    assert "confidence" in data
    assert "recommendation" in data
    logger.info(f"Diagnose endpoint: {data}")

    # Test invalid image
    response = client.post(
        "/grade",
        files={"file": ("bad.txt", b"not an image", "text/plain")},
        data={"crop_id": "test"},
    )
    assert response.status_code == 400
    logger.info("Invalid image correctly rejected")

    logger.info("✓ Inference server tests PASSED")
    return True


def main():
    """Run all tests."""
    logger.info("=" * 60)
    logger.info("AGRI AI MODEL TESTS")
    logger.info("=" * 60)

    results = {}

    try:
        results["grading"] = test_grading_model()
    except Exception as e:
        logger.error(f"Grading model test FAILED: {e}")
        results["grading"] = False

    try:
        results["disease"] = test_disease_model()
    except Exception as e:
        logger.error(f"Disease model test FAILED: {e}")
        results["disease"] = False

    try:
        results["server"] = test_inference_server()
    except Exception as e:
        logger.error(f"Inference server test FAILED: {e}")
        results["server"] = False

    logger.info("\n" + "=" * 60)
    logger.info("TEST RESULTS SUMMARY")
    logger.info("=" * 60)
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        logger.info(f"  {test_name}: {status}")

    all_passed = all(results.values())
    logger.info(f"\nOverall: {'ALL TESTS PASSED ✓' if all_passed else 'SOME TESTS FAILED ✗'}")

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
