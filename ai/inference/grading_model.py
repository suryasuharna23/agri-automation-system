"""
Crop Quality Grading Model using Google Gemini or local EfficientNet-B0 fallback.

Uses Gemini multimodal API to grade crop quality (Grade A/B/C) and reject non-crop images.
Falls back to local fine-tuned EfficientNet-B0 checkpoint if Gemini is not ready.
"""

import logging
from pathlib import Path
from PIL import Image
import numpy as np
from pydantic import BaseModel, Field
from typing import Optional

from ai.inference.llm_insight import llm_ready, demo_fallback_enabled, _get_client

logger = logging.getLogger(__name__)

GRADES = ["A", "B", "C"]
MODEL_PATH = Path(__file__).parent.parent / "models" / "checkpoints" / "grading_model.pth"


class GeminiGradingResult(BaseModel):
    is_valid_crop: bool = Field(
        description="Apakah gambar menampilkan produk hasil panen hortikultura/komoditas pertanian yang valid? Set ke True jika ya, set ke False jika bukan (misal: wajah manusia, pemandangan acak, gambar barang, teks, hewan, atau noise)."
    )
    error_message: Optional[str] = Field(
        None,
        description="Pesan error/penolakan dalam Bahasa Indonesia jika is_valid_crop adalah False (misal: 'Gambar terdeteksi bukan hasil panen komoditas pertanian. Silakan ambil foto komoditas yang benar.')."
    )
    grade: Optional[str] = Field(
        None,
        description="Kelas kualitas hasil panen: 'A' (kualitas premium/segar/bagus), 'B' (menengah/standar), atau 'C' (buruk/rusak/layak dibuang)."
    )
    confidence: Optional[float] = Field(
        None,
        description="Tingkat keyakinan grading (0.0 sampai 1.0)."
    )
    grade_a_prob: float = Field(0.0, description="Probabilitas masuk kelas A (0.0 s.d. 1.0).")
    grade_b_prob: float = Field(0.0, description="Probabilitas masuk kelas B (0.0 s.d. 1.0).")
    grade_c_prob: float = Field(0.0, description="Probabilitas masuk kelas C (0.0 s.d. 1.0).")


class GradingModel:
    """
    Crop quality grading model.

    Uses Gemini API for grading or falls back to EfficientNet-B0.
    """

    def __init__(self):
        self.has_checkpoint = False
        self.model = None

        if not llm_ready() and not demo_fallback_enabled():
            logger.info("Gemini API not ready. Attempting to load local PyTorch grading model...")
            if MODEL_PATH.exists():
                try:
                    import torch
                    import torch.nn as nn
                    from torchvision import models

                    def _build_model(num_classes: int = 3) -> nn.Module:
                        model = models.efficientnet_b0(weights=None)
                        model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
                        return model

                    self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
                    self.model = _build_model()
                    self.model.load_state_dict(
                        torch.load(MODEL_PATH, map_location=self.device, weights_only=True)
                    )
                    self.has_checkpoint = True
                    self.model.to(self.device)
                    self.model.eval()
                    logger.info("Grading model checkpoint loaded successfully.")
                except Exception as e:
                    logger.error(f"Failed to load grading checkpoint at {MODEL_PATH}: {e}")
            else:
                logger.warning(f"Grading checkpoint not found at {MODEL_PATH}. Grading model is unavailable.")

    @property
    def ready(self) -> bool:
        return llm_ready() or demo_fallback_enabled() or self.has_checkpoint

    def predict(self, image: Image.Image) -> dict:
        """
        Predict crop quality grade from image.

        Returns dict with grade (A/B/C), confidence, and per-class probabilities.
        """
        if llm_ready():
            return self._predict_with_gemini(image)
        elif self.has_checkpoint:
            return self._predict_with_model(image)
        elif demo_fallback_enabled():
            return self.predict_demo(image)
        else:
            raise RuntimeError("Grading model is not ready (Gemini not configured and checkpoint missing).")

    def _predict_with_gemini(self, image: Image.Image) -> dict:
        client = _get_client()
        if client is None:
            raise RuntimeError("Gemini client is not initialized.")

        from google.genai import types

        prompt = (
            "Lakukan grading kualitas komoditas hasil panen hortikultura pada gambar ini.\n"
            "Aturan:\n"
            "1. Pastikan gambar berisi hasil panen hortikultura/komoditas pertanian yang jelas (misal: tomat, cabai, sayuran, dsb). Jika tidak, set 'is_valid_crop' = False dan isi 'error_message' dengan penjelasan singkat dalam Bahasa Indonesia.\n"
            "2. Jika gambar valid, set 'is_valid_crop' = True, tentukan 'grade' ('A' / 'B' / 'C'), 'confidence' (0.0 s.d 1.0), serta berikan estimasi probabilitas masuk kelas A, B, dan C (pastikan jumlahnya mendekati 1.0)."
        )

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[image, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiGradingResult,
                ),
            )
            result = GeminiGradingResult.model_validate_json(response.text)
            
            if not result.is_valid_crop:
                raise ValueError(result.error_message or "Gambar terdeteksi bukan hasil panen komoditas.")

            # Make sure grade is uppercase and valid
            grade = (result.grade or "A").upper()
            if grade not in GRADES:
                grade = "A"

            return {
                "grade": grade,
                "confidence": round(result.confidence or 0.95, 4),
                "grade_a_prob": round(result.grade_a_prob, 4),
                "grade_b_prob": round(result.grade_b_prob, 4),
                "grade_c_prob": round(result.grade_c_prob, 4),
            }
        except Exception as e:
            logger.error(f"Gemini grading API call failed: {e}")
            raise

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
        import torch
        from torchvision import transforms

        _transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

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
