"""
Crop Quality Grading Model using pretrained EfficientNet-B0.

For prototyping, this uses a pretrained EfficientNet-B0 (ImageNet weights) with
a custom classifier head fine-tuned on a tomato freshness/quality dataset.

The grading is specialized for tomato (tomat) which is a common
Indonesian horticulture commodity.
"""

import logging
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

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
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


class GradingModel:
    """
    Crop quality grading model.

    Uses pretrained EfficientNet-B0 with fine-tuned classifier.
    """

    def __init__(self):
        if not MODEL_PATH.exists():
            raise RuntimeError(
                "Grading model checkpoint not found. "
                "Provide a fine-tuned checkpoint at: " + str(MODEL_PATH)
            )

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = _build_model()
        self.has_checkpoint = False

        try:
            self.model.load_state_dict(
                torch.load(MODEL_PATH, map_location=self.device, weights_only=True)
            )
            self.has_checkpoint = True
            logger.info("Grading model checkpoint loaded successfully.")
        except Exception as e:
            raise RuntimeError(f"Failed to load grading checkpoint at {MODEL_PATH}: {e}") from e

        self.model.to(self.device)
        self.model.eval()

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
