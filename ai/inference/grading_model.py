from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

GRADES = ["A", "B", "C"]
MODEL_PATH = Path(__file__).parent.parent / "models" / "checkpoints" / "grading_model.pth"

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def _build_model(num_classes: int = 3) -> nn.Module:
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


class GradingModel:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = _build_model()
        if MODEL_PATH.exists():
            self.model.load_state_dict(torch.load(MODEL_PATH, map_location=self.device))
        self.model.to(self.device)
        self.model.eval()

    def predict(self, image: Image.Image) -> dict:
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
