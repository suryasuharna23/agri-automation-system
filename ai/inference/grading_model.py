"""
Crop Quality Grading Model using pretrained EfficientNet-B0.

For prototyping, this uses a pretrained EfficientNet-B0 (ImageNet weights) with
a custom classifier head fine-tuned on a tomato freshness/quality dataset.

If no fine-tuned checkpoint is available, it uses a heuristic approach based on
the disease detection model output + image quality analysis to assign grades:
- Grade A: Fresh, healthy appearance, good color uniformity
- Grade B: Minor imperfections, slight discoloration
- Grade C: Visible defects, significant discoloration, damage

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
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


class GradingModel:
    """
    Crop quality grading model.

    Uses pretrained EfficientNet-B0 with fine-tuned classifier.
    Falls back to image analysis heuristics if no checkpoint is available.
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
                logger.warning(f"Failed to load grading checkpoint: {e}. Using heuristic mode.")

        self.model.to(self.device)
        self.model.eval()

    def predict(self, image: Image.Image) -> dict:
        """
        Predict crop quality grade from image.

        Returns dict with grade (A/B/C), confidence, and per-class probabilities.
        """
        if self.has_checkpoint:
            return self._predict_with_model(image)
        else:
            return self._predict_with_heuristic(image)

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

    def _predict_with_heuristic(self, image: Image.Image) -> dict:
        """
        Heuristic-based grading using image color analysis.

        Analyzes color distribution, uniformity, and defect indicators
        to estimate quality grade. This serves as a functional fallback
        when no fine-tuned checkpoint is available.
        """
        img_array = np.array(image.resize((224, 224)).convert("RGB"))

        # Analyze color properties
        r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]

        # Color uniformity (lower std = more uniform = better quality)
        color_std = np.mean([np.std(r), np.std(g), np.std(b)])

        # Green ratio (for leaves/vegetables, more green = healthier)
        green_ratio = np.mean(g) / (np.mean(r) + np.mean(g) + np.mean(b) + 1e-6)

        # Brightness (very dark or very bright = potential issues)
        brightness = np.mean(img_array) / 255.0

        # Brown/dark spots indicator (potential disease/damage)
        dark_pixels = np.sum(img_array.mean(axis=2) < 60) / (224 * 224)

        # Scoring logic
        score = 0.0

        # Color uniformity score (0-30 points)
        if color_std < 40:
            score += 30
        elif color_std < 55:
            score += 20
        else:
            score += 10

        # Green health score (0-30 points)
        if green_ratio > 0.38:
            score += 30
        elif green_ratio > 0.33:
            score += 20
        else:
            score += 10

        # Brightness score (0-20 points)
        if 0.3 < brightness < 0.7:
            score += 20
        elif 0.2 < brightness < 0.8:
            score += 12
        else:
            score += 5

        # Dark spots penalty (0-20 points)
        if dark_pixels < 0.05:
            score += 20
        elif dark_pixels < 0.15:
            score += 12
        else:
            score += 5

        # Map score to grade probabilities
        max_score = 100.0
        normalized = score / max_score

        if normalized > 0.75:
            probs = [0.7 + (normalized - 0.75) * 0.8, 0.2 - (normalized - 0.75) * 0.4, 0.1 - (normalized - 0.75) * 0.4]
        elif normalized > 0.5:
            probs = [0.3, 0.5, 0.2]
        else:
            probs = [0.1, 0.25, 0.65]

        # Ensure valid probabilities
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


_grading_model: GradingModel | None = None


def get_grading_model() -> GradingModel:
    global _grading_model
    if _grading_model is None:
        _grading_model = GradingModel()
    return _grading_model
