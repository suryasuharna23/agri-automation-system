"""
Plant Disease Detection Model using pretrained MobileNetV2 from Hugging Face.

Uses the model trained on PlantVillage dataset (38 classes).
Specialized for tomato diseases which is common in Indonesian horticulture.

Model: Diginsa/Plant-Disease-Detection-Project (MobileNetV2, PlantVillage 38 classes)
"""

import logging
from pathlib import Path

import torch
from PIL import Image
from transformers import AutoModelForImageClassification, AutoImageProcessor

logger = logging.getLogger(__name__)

# The model's id2label config provides the class mapping at runtime.
# We keep a reference list for documentation purposes.
MODEL_ID = "Diginsa/Plant-Disease-Detection-Project"

# Indonesian recommendations for each disease (keys match model's id2label output)
RECOMMENDATIONS = {
    "Apple Apple scab": "Aplikasikan fungisida berbasis kaptan. Pangkas cabang yang terinfeksi.",
    "Apple Black rot": "Buang buah yang terinfeksi. Semprotkan fungisida mankozeb.",
    "Apple Cedar apple rust": "Gunakan fungisida mikonazol. Jauhkan dari pohon cedar.",
    "Apple healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Blueberry healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Cherry (including sour) Powdery mildew": "Semprotkan fungisida sulfur. Pastikan sirkulasi udara baik.",
    "Cherry (including sour) healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Corn (maize) Cercospora leaf spot Gray leaf spot": "Gunakan varietas tahan penyakit. Aplikasikan fungisida strobilurin.",
    "Corn (maize) Common rust ": "Semprotkan fungisida triazol. Tanam varietas tahan karat.",
    "Corn (maize) Northern Leaf Blight": "Aplikasikan fungisida mankozeb. Rotasi tanaman.",
    "Corn (maize) healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Grape Black rot": "Pangkas bagian terinfeksi. Gunakan fungisida kaptan.",
    "Grape Esca (Black Measles)": "Pangkas cabang mati. Lindungi luka potongan dengan fungisida.",
    "Grape Leaf blight (Isariopsis Leaf Spot)": "Aplikasikan fungisida tembaga. Kurangi kelembapan.",
    "Grape healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Orange Haunglongbing (Citrus greening)": "Kendalikan kutu loncat jeruk. Cabut tanaman terinfeksi berat.",
    "Peach Bacterial spot": "Semprotkan bakterisida tembaga. Hindari penyiraman dari atas.",
    "Peach healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Pepper, bell Bacterial spot": "Semprotkan bakterisida berbasis tembaga. Hindari penyiraman dari atas daun.",
    "Pepper, bell healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Potato Early blight": "Pangkas daun yang terinfeksi. Gunakan fungisida mankozeb.",
    "Potato Late blight": "Segera aplikasikan fungisida preventif. Kurangi kelembapan.",
    "Potato healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Raspberry healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Soybean healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Squash Powdery mildew": "Semprotkan larutan baking soda atau fungisida sulfur.",
    "Strawberry Leaf scorch": "Singkirkan daun terinfeksi. Pastikan drainase baik.",
    "Strawberry healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
    "Tomato Bacterial spot": "Semprotkan bakterisida berbasis tembaga. Hindari penyiraman dari atas daun.",
    "Tomato Early blight": "Pangkas daun yang terinfeksi. Gunakan fungisida mankozeb atau klorotalonil.",
    "Tomato Late blight": "Segera aplikasikan fungisida metalaksil. Kurangi kelembapan di sekitar tanaman.",
    "Tomato Leaf Mold": "Tingkatkan sirkulasi udara. Gunakan fungisida tembaga.",
    "Tomato Septoria leaf spot": "Singkirkan daun terinfeksi. Aplikasikan fungisida klorotalonil.",
    "Tomato Spider mites Two-spotted spider mite": "Semprotkan akarisida atau minyak neem. Jaga kelembapan udara.",
    "Tomato Target Spot": "Aplikasikan fungisida mankozeb. Jaga jarak tanam yang cukup.",
    "Tomato Tomato Yellow Leaf Curl Virus": "Kendalikan kutu kebul (whitefly). Gunakan mulsa perak.",
    "Tomato Tomato mosaic virus": "Cabut tanaman terinfeksi. Sterilkan alat pertanian.",
    "Tomato healthy": "Tanaman dalam kondisi sehat. Pertahankan perawatan rutin.",
}

# Human-readable disease names (keys match model's id2label output)
DISEASE_DISPLAY_NAMES = {
    "Apple Apple scab": "Apple Scab",
    "Apple Black rot": "Black Rot (Apple)",
    "Apple Cedar apple rust": "Cedar Apple Rust",
    "Apple healthy": "Healthy",
    "Blueberry healthy": "Healthy",
    "Cherry (including sour) Powdery mildew": "Powdery Mildew (Cherry)",
    "Cherry (including sour) healthy": "Healthy",
    "Corn (maize) Cercospora leaf spot Gray leaf spot": "Cercospora Leaf Spot",
    "Corn (maize) Common rust ": "Common Rust (Corn)",
    "Corn (maize) Northern Leaf Blight": "Northern Leaf Blight",
    "Corn (maize) healthy": "Healthy",
    "Grape Black rot": "Black Rot (Grape)",
    "Grape Esca (Black Measles)": "Esca (Black Measles)",
    "Grape Leaf blight (Isariopsis Leaf Spot)": "Leaf Blight (Grape)",
    "Grape healthy": "Healthy",
    "Orange Haunglongbing (Citrus greening)": "Citrus Greening (HLB)",
    "Peach Bacterial spot": "Bacterial Spot (Peach)",
    "Peach healthy": "Healthy",
    "Pepper, bell Bacterial spot": "Bacterial Spot (Pepper/Cabai)",
    "Pepper, bell healthy": "Healthy",
    "Potato Early blight": "Early Blight (Potato)",
    "Potato Late blight": "Late Blight (Potato)",
    "Potato healthy": "Healthy",
    "Raspberry healthy": "Healthy",
    "Soybean healthy": "Healthy",
    "Squash Powdery mildew": "Powdery Mildew (Squash)",
    "Strawberry Leaf scorch": "Leaf Scorch (Strawberry)",
    "Strawberry healthy": "Healthy",
    "Tomato Bacterial spot": "Bacterial Spot (Tomat)",
    "Tomato Early blight": "Early Blight (Tomat)",
    "Tomato Late blight": "Late Blight (Tomat)",
    "Tomato Leaf Mold": "Leaf Mold (Tomat)",
    "Tomato Septoria leaf spot": "Septoria Leaf Spot (Tomat)",
    "Tomato Spider mites Two-spotted spider mite": "Spider Mites (Tomat)",
    "Tomato Target Spot": "Target Spot (Tomat)",
    "Tomato Tomato Yellow Leaf Curl Virus": "Yellow Leaf Curl Virus (Tomat)",
    "Tomato Tomato mosaic virus": "Mosaic Virus (Tomat)",
    "Tomato healthy": "Healthy",
}

class DiseaseModel:
    """Plant disease detection using pretrained MobileNetV2 from Hugging Face."""

    def __init__(self):
        logger.info(f"Loading disease model from Hugging Face: {MODEL_ID}")
        try:
            self.processor = AutoImageProcessor.from_pretrained(MODEL_ID)
            self.model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
            self.model.eval()
            # Get label mapping from model config
            self.id2label = self.model.config.id2label
            logger.info(f"Disease model loaded successfully. Classes: {len(self.id2label)}")
        except Exception as e:
            logger.warning(f"Failed to load HF model: {e}. Using fallback.")
            self.processor = None
            self.model = None
            self.id2label = {}

    def predict(self, image: Image.Image) -> dict:
        if self.model is None or self.processor is None:
            return self._fallback_predict()

        inputs = self.processor(images=image, return_tensors="pt")

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=1).squeeze().cpu().tolist()

        predicted_idx = int(torch.argmax(torch.tensor(probs)))
        predicted_label = self.id2label.get(predicted_idx, f"Unknown class {predicted_idx}")
        confidence = probs[predicted_idx]

        # Map to display name
        disease_name = DISEASE_DISPLAY_NAMES.get(predicted_label, predicted_label)
        is_healthy = "healthy" in predicted_label.lower()
        recommendation = RECOMMENDATIONS.get(
            predicted_label,
            "Konsultasikan dengan ahli pertanian untuk diagnosis lebih lanjut."
        )

        return {
            "disease_name": disease_name,
            "confidence": round(confidence, 4),
            "recommendation": recommendation,
            "is_healthy": is_healthy,
        }

    def _fallback_predict(self) -> dict:
        """Fallback when model is not available."""
        return {
            "disease_name": "Model Unavailable",
            "confidence": 0.0,
            "recommendation": "Model AI tidak tersedia. Silakan coba lagi nanti.",
            "is_healthy": False,
        }


_disease_model: DiseaseModel | None = None


def get_disease_model() -> DiseaseModel:
    global _disease_model
    if _disease_model is None:
        _disease_model = DiseaseModel()
    return _disease_model
