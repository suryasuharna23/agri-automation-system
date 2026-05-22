"""
Crop Quality Grading Model using EfficientNet-B0.

This expects a local fine-tuned checkpoint with a custom classifier head for a
tomato freshness/quality dataset.

The grading is specialized for tomato (tomat) which is a common
Indonesian horticulture commodity.
"""

import logging
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

GRADES = ["A", "B", "C"]
MODEL_PATH = Path(__file__).parent.parent / "models" / "checkpoints" / "grading_model.pth"

# Image preprocessing for EfficientNet-B0
_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def _build_model(num_classes: int = 3) -> nn.Module:
    """Build EfficientNet-B0 with custom classifier for 3-class grading."""
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


class GradingModel:
    """
    Crop quality grading model.

    Uses EfficientNet-B0 with a fine-tuned classifier checkpoint.
    """

    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = _build_model()
        self.has_checkpoint = False

        if MODEL_PATH.exists():
            try:
                self.model.load_state_dict(
                    torch.load(MODEL_PATH, map_location=self.device, weights_only=True)
                )
                self.has_checkpoint = True
                logger.info("Grading model checkpoint loaded successfully.")
            except Exception as e:
                raise RuntimeError(f"Failed to load grading checkpoint at {MODEL_PATH}: {e}") from e
        else:
            logger.warning(f"Grading checkpoint not found at {MODEL_PATH}. Grading model is unavailable.")

        self.model.to(self.device)
        self.model.eval()

    @property
    def ready(self) -> bool:
        return self.has_checkpoint

    def predict(self, image: Image.Image) -> dict:
        """
        Predict crop quality grade from image.

        Returns dict with grade (A/B/C), confidence, and per-class probabilities.
        """
        if not self.has_checkpoint:
            raise RuntimeError(
                "Grading model checkpoint not loaded. "
                "Provide a fine-tuned checkpoint at: " + str(MODEL_PATH)
            )
        return self._predict_with_model(image)

    def predict_demo(self, image: Image.Image) -> dict:
        """Demo-only heuristic grading when ENABLE_DEMO_AI_FALLBACK=true."""
        img_array = np.array(image.resize((224, 224)).convert("RGB"))
        r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]

        color_std = np.mean([np.std(r), np.std(g), np.std(b)])
        green_ratio = np.mean(g) / (np.mean(r) + np.mean(g) + np.mean(b) + 1e-6)
        brightness = np.mean(img_array) / 255.0
        dark_pixels = np.sum(img_array.mean(axis=2) < 60) / (224 * 224)

        score = 0.0
        score += 30 if color_std < 40 else 20 if color_std < 55 else 10
        score += 30 if green_ratio > 0.38 else 20 if green_ratio > 0.33 else 10
        score += 20 if 0.3 < brightness < 0.7 else 12 if 0.2 < brightness < 0.8 else 5
        score += 20 if dark_pixels < 0.05 else 12 if dark_pixels < 0.15 else 5

        normalized = score / 100.0
        if normalized > 0.75:
            probs = [0.7 + (normalized - 0.75) * 0.8, 0.2 - (normalized - 0.75) * 0.4, 0.1 - (normalized - 0.75) * 0.4]
        elif normalized > 0.5:
            probs = [0.3, 0.5, 0.2]
        else:
            probs = [0.1, 0.25, 0.65]

        probs = [max(0.01, p) for p in probs]
        total = sum(probs)
        probs = [p / total for p in probs]

        grade_idx = int(np.argmax(probs))
        return {
            "grade": GRADES[grade_idx],
            "confidence": round(probs[grade_idx], 4),
            "grade_a_prob": round(probs[0], 4),
            "grade_b_prob": round(probs[1], 4),
            "grade_c_prob": round(probs[2], 4),
        }

    def _predict_with_model(self, image: Image.Image) -> dict:
        """Use the fine-tuned model for prediction."""
        tensor = _transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze().cpu().tolist()

        grade_idx = int(torch.argmax(torch.tensor(probs)))
        return {
            "grade": GRADES[grade_idx],
            "confidence": round(probs[grade_idx], 4),
            "grade_a_prob": round(probs[0], 4),
            "grade_b_prob": round(probs[1], 4),
            "grade_c_prob": round(probs[2], 4),
        }

_grading_model: GradingModel | None = None


def get_grading_model() -> GradingModel:
    global _grading_model
    if _grading_model is None:
        _grading_model = GradingModel()
    return _grading_model
