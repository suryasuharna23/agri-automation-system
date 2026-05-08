from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

DISEASES = [
    "Healthy",
    "Bacterial Blight",
    "Downy Mildew",
    "Powdery Mildew",
    "Early Blight",
    "Late Blight",
    "Leaf Spot",
    "Root Rot",
]

RECOMMENDATIONS = {
    "Healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Bacterial Blight": "Semprotkan bakterisida berbasis tembaga. Hindari penyiraman dari atas.",
    "Downy Mildew": "Gunakan fungisida sistemik. Pastikan sirkulasi udara baik.",
    "Powdery Mildew": "Semprotkan larutan baking soda atau fungisida sulfur.",
    "Early Blight": "Pangkas daun yang terinfeksi. Gunakan fungisida mankozeb.",
    "Late Blight": "Segera aplikasikan fungisida preventif. Kurangi kelembapan.",
    "Leaf Spot": "Singkirkan daun terinfeksi. Aplikasikan fungisida tembaga.",
    "Root Rot": "Perbaiki drainase lahan. Aplikasikan fungisida tanah.",
}

MODEL_PATH = Path(__file__).parent.parent / "models" / "checkpoints" / "disease_model.pth"

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def _build_model(num_classes: int = len(DISEASES)) -> nn.Module:
    model = models.efficientnet_b0(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


class DiseaseModel:
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

        disease_idx = int(torch.argmax(torch.tensor(probs)))
        disease_name = DISEASES[disease_idx]
        return {
            "disease_name": disease_name,
            "confidence": round(probs[disease_idx], 4),
            "recommendation": RECOMMENDATIONS.get(disease_name, "Konsultasikan dengan ahli pertanian."),
            "is_healthy": disease_name == "Healthy",
        }


_disease_model: DiseaseModel | None = None


def get_disease_model() -> DiseaseModel:
    global _disease_model
    if _disease_model is None:
        _disease_model = DiseaseModel()
    return _disease_model
