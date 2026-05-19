"""AI Inference modules for grading and disease detection."""
from ai.inference.grading_model import get_grading_model
from ai.inference.disease_model import get_disease_model

__all__ = ["get_grading_model", "get_disease_model"]
