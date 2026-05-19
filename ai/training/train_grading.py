"""
Training script for the Crop Quality Grading Model.

Fine-tunes EfficientNet-B0 (pretrained on ImageNet) for 3-class quality grading:
- Grade A: Fresh, excellent quality
- Grade B: Acceptable quality, minor imperfections
- Grade C: Poor quality, visible defects

Dataset: Uses the fruit-ripeness-detection-dataset from Hugging Face
(darthraider/fruit-ripeness-detection-dataset) which contains fresh/rotten
fruit images. We map these to our 3-class grading system.

For prototyping, we also support training from a local folder structure:
    data/grading/
        grade_a/
        grade_b/
        grade_c/

Usage:
    python -m ai.training.train_grading --epochs 10 --batch-size 32
    python -m ai.training.train_grading --data-dir data/grading --epochs 15
    python -m ai.training.train_grading --use-hf-dataset --epochs 10
"""

import argparse
import logging
import os
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import models, transforms
from PIL import Image
from tqdm import tqdm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GRADES = ["A", "B", "C"]
CHECKPOINT_DIR = Path(__file__).parent.parent / "models" / "checkpoints"


def get_transforms(train: bool = True):
    """Get image transforms for training or validation."""
    if train:
        return transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
            transforms.RandomRotation(15),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    else:
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])


class LocalGradingDataset(Dataset):
    """Dataset from local folder structure: grade_a/, grade_b/, grade_c/"""

    def __init__(self, root_dir: str, transform=None):
        self.transform = transform
        self.samples = []
        self.labels = []

        root = Path(root_dir)
        for grade_idx, grade_name in enumerate(["grade_a", "grade_b", "grade_c"]):
            grade_dir = root / grade_name
            if not grade_dir.exists():
                logger.warning(f"Directory not found: {grade_dir}")
                continue
            for img_path in grade_dir.glob("*"):
                if img_path.suffix.lower() in (".jpg", ".jpeg", ".png", ".bmp"):
                    self.samples.append(str(img_path))
                    self.labels.append(grade_idx)

        logger.info(f"Loaded {len(self.samples)} images from {root_dir}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img = Image.open(self.samples[idx]).convert("RGB")
        label = self.labels[idx]
        if self.transform:
            img = self.transform(img)
        return img, label


class HuggingFaceGradingDataset(Dataset):
    """
    Dataset from Hugging Face fruit-ripeness-detection-dataset.
    Maps freshness levels to quality grades:
    - freshapples, freshbanana, freshoranges -> Grade A
    - (intermediate if available) -> Grade B
    - rottenapples, rottenbanana, rottenoranges -> Grade C
    """

    def __init__(self, split: str = "train", transform=None):
        self.transform = transform
        self.samples = []
        self.labels = []

        try:
            from datasets import load_dataset
            logger.info("Loading dataset from Hugging Face: darthraider/fruit-ripeness-detection-dataset")
            ds = load_dataset("darthraider/fruit-ripeness-detection-dataset", split=split)

            for item in ds:
                image = item["image"]
                label = item["label"]  # 0-5 classes

                # Map: 0,1,2 = fresh (Grade A), 3,4,5 = rotten (Grade C)
                # We create Grade B by randomly assigning some fresh items
                if label in [0, 1, 2]:
                    grade = 0  # Grade A
                else:
                    grade = 2  # Grade C

                self.samples.append(image)
                self.labels.append(grade)

            # Create Grade B by taking some borderline samples
            # (every 3rd fresh sample becomes Grade B for balanced training)
            grade_a_indices = [i for i, l in enumerate(self.labels) if l == 0]
            for i, idx in enumerate(grade_a_indices):
                if i % 3 == 0:
                    self.labels[idx] = 1  # Reassign to Grade B

            logger.info(f"HF Dataset loaded: {len(self.samples)} images")
            grade_counts = {g: self.labels.count(g) for g in range(3)}
            logger.info(f"Grade distribution: A={grade_counts[0]}, B={grade_counts[1]}, C={grade_counts[2]}")

        except Exception as e:
            logger.error(f"Failed to load HF dataset: {e}")
            raise

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img = self.samples[idx]
        if not isinstance(img, Image.Image):
            img = Image.open(img).convert("RGB")
        else:
            img = img.convert("RGB")
        label = self.labels[idx]
        if self.transform:
            img = self.transform(img)
        return img, label


def build_model(num_classes: int = 3) -> nn.Module:
    """Build EfficientNet-B0 with pretrained ImageNet weights."""
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)

    # Freeze early layers for transfer learning
    for param in model.features[:5].parameters():
        param.requires_grad = False

    # Replace classifier
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, num_classes)
    return model


def train_one_epoch(model, dataloader, criterion, optimizer, device):
    """Train for one epoch."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for images, labels in tqdm(dataloader, desc="Training"):
        images, labels = images.to(device), labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

    return running_loss / len(dataloader), correct / total


def validate(model, dataloader, criterion, device):
    """Validate the model."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in tqdm(dataloader, desc="Validation"):
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    return running_loss / len(dataloader), correct / total


def main():
    parser = argparse.ArgumentParser(description="Train crop quality grading model")
    parser.add_argument("--data-dir", type=str, default=None, help="Local data directory")
    parser.add_argument("--use-hf-dataset", action="store_true", help="Use HuggingFace dataset")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--val-split", type=float, default=0.2, help="Validation split ratio")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")

    # Load dataset
    if args.use_hf_dataset:
        train_dataset = HuggingFaceGradingDataset(split="train", transform=get_transforms(train=True))
        val_dataset = HuggingFaceGradingDataset(split="test", transform=get_transforms(train=False))
    elif args.data_dir:
        full_dataset = LocalGradingDataset(args.data_dir, transform=get_transforms(train=True))
        val_size = int(len(full_dataset) * args.val_split)
        train_size = len(full_dataset) - val_size
        train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
    else:
        logger.error("Specify --data-dir or --use-hf-dataset")
        return

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=2)

    logger.info(f"Train samples: {len(train_dataset)}, Val samples: {len(val_dataset)}")

    # Build model
    model = build_model().to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)

    # Training loop
    best_val_acc = 0.0
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    for epoch in range(args.epochs):
        logger.info(f"\nEpoch {epoch + 1}/{args.epochs}")

        train_loss, train_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step()

        logger.info(f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f}")
        logger.info(f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            save_path = CHECKPOINT_DIR / "grading_model.pth"
            torch.save(model.state_dict(), save_path)
            logger.info(f"Best model saved: {save_path} (acc: {val_acc:.4f})")

    logger.info(f"\nTraining complete. Best validation accuracy: {best_val_acc:.4f}")


if __name__ == "__main__":
    main()
