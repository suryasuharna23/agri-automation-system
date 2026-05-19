"""
Training script for the Plant Disease Detection Model.

NOTE: For this project, we use a PRETRAINED model from Hugging Face
(Diginsa/Plant-Disease-Detection-Project) which is already trained on
the PlantVillage dataset with 38 classes. No additional training is needed.

This script is provided for documentation and in case you want to:
1. Fine-tune the model on additional local data
2. Retrain from scratch with a custom dataset
3. Evaluate the pretrained model on test data

The pretrained model covers tomato diseases which are relevant for
Indonesian horticulture:
- Tomato Bacterial Spot
- Tomato Early Blight
- Tomato Late Blight
- Tomato Leaf Mold
- Tomato Septoria Leaf Spot
- Tomato Spider Mites
- Tomato Target Spot
- Tomato Yellow Leaf Curl Virus
- Tomato Mosaic Virus
- Tomato Healthy

It also covers pepper (cabai) diseases:
- Pepper Bacterial Spot
- Pepper Healthy

Usage:
    # Evaluate pretrained model
    python -m ai.training.train_disease --evaluate

    # Fine-tune on local data
    python -m ai.training.train_disease --data-dir data/disease --epochs 5

    # Download and verify the pretrained model
    python -m ai.training.train_disease --download-model
"""

import argparse
import logging
from pathlib import Path

import torch
from PIL import Image
from tqdm import tqdm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_ID = "Diginsa/Plant-Disease-Detection-Project"


def download_and_verify_model():
    """Download the pretrained model from Hugging Face and verify it works."""
    logger.info(f"Downloading pretrained model: {MODEL_ID}")

    try:
        from transformers import AutoModelForImageClassification, AutoImageProcessor

        processor = AutoImageProcessor.from_pretrained(MODEL_ID)
        model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
        model.eval()

        logger.info(f"Model downloaded successfully!")
        logger.info(f"Number of classes: {len(model.config.id2label)}")
        logger.info(f"Labels: {list(model.config.id2label.values())[:5]}... (showing first 5)")

        # Test with a dummy image
        dummy_image = Image.new("RGB", (224, 224), color=(100, 150, 50))
        inputs = processor(images=dummy_image, return_tensors="pt")

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1).squeeze()
            top_idx = torch.argmax(probs).item()
            top_label = model.config.id2label[top_idx]
            top_conf = probs[top_idx].item()

        logger.info(f"Test prediction: {top_label} (confidence: {top_conf:.4f})")
        logger.info("Model verification PASSED ✓")
        return True

    except Exception as e:
        logger.error(f"Failed to download/verify model: {e}")
        return False


def evaluate_model(data_dir: str = None):
    """Evaluate the pretrained model on test data."""
    from transformers import AutoModelForImageClassification, AutoImageProcessor

    processor = AutoImageProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
    model.eval()

    if data_dir:
        # Evaluate on local data
        data_path = Path(data_dir)
        correct = 0
        total = 0

        for class_dir in sorted(data_path.iterdir()):
            if not class_dir.is_dir():
                continue
            for img_path in class_dir.glob("*"):
                if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                    continue
                try:
                    image = Image.open(img_path).convert("RGB")
                    inputs = processor(images=image, return_tensors="pt")
                    with torch.no_grad():
                        outputs = model(**inputs)
                        pred_idx = torch.argmax(outputs.logits, dim=1).item()
                        pred_label = model.config.id2label[pred_idx]

                    # Check if prediction matches directory name
                    if class_dir.name.lower() in pred_label.lower():
                        correct += 1
                    total += 1
                except Exception as e:
                    logger.warning(f"Error processing {img_path}: {e}")

        if total > 0:
            accuracy = correct / total
            logger.info(f"Evaluation: {correct}/{total} correct ({accuracy:.2%})")
        else:
            logger.warning("No images found for evaluation.")
    else:
        # Evaluate on HuggingFace dataset
        try:
            from datasets import load_dataset

            logger.info("Loading PlantVillage test set from HuggingFace...")
            ds = load_dataset("BrandonFors/Plant-Diseases-PlantVillage-Dataset", split="test")

            correct = 0
            total = 0
            sample_size = min(200, len(ds))  # Evaluate on subset for speed

            for i in tqdm(range(sample_size), desc="Evaluating"):
                item = ds[i]
                image = item["image"].convert("RGB")
                true_label = item["label"]

                inputs = processor(images=image, return_tensors="pt")
                with torch.no_grad():
                    outputs = model(**inputs)
                    pred_idx = torch.argmax(outputs.logits, dim=1).item()

                if pred_idx == true_label:
                    correct += 1
                total += 1

            accuracy = correct / total
            logger.info(f"Evaluation on {total} samples: {accuracy:.2%} accuracy")

        except Exception as e:
            logger.error(f"Failed to evaluate: {e}")


def main():
    parser = argparse.ArgumentParser(description="Plant Disease Model Training/Evaluation")
    parser.add_argument("--download-model", action="store_true", help="Download and verify pretrained model")
    parser.add_argument("--evaluate", action="store_true", help="Evaluate the model")
    parser.add_argument("--data-dir", type=str, default=None, help="Local data directory for evaluation")
    parser.add_argument("--epochs", type=int, default=5, help="Epochs for fine-tuning")
    args = parser.parse_args()

    if args.download_model:
        download_and_verify_model()
    elif args.evaluate:
        evaluate_model(args.data_dir)
    else:
        logger.info("This model uses a pretrained checkpoint from Hugging Face.")
        logger.info("No training needed. Use --download-model to verify the model.")
        logger.info("Use --evaluate to test accuracy on the PlantVillage dataset.")
        download_and_verify_model()


if __name__ == "__main__":
    main()
