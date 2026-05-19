"""Download sample test images from PlantVillage dataset for manual testing."""
import os
from datasets import load_dataset

os.makedirs("ai/test_images", exist_ok=True)

print("Loading PlantVillage dataset (test split)...")
ds = load_dataset("BrandonFors/Plant-Diseases-PlantVillage-Dataset", split="test")

labels = ds.features["label"].names
print(f"Total classes: {len(labels)}")

# Save one sample per target class
targets = {
    "Tomato___healthy": None,
    "Tomato___Early_blight": None,
    "Tomato___Late_blight": None,
    "Tomato___Leaf_Mold": None,
    "Pepper,_bell___Bacterial_spot": None,
    "Pepper,_bell___healthy": None,
}

for i, item in enumerate(ds):
    label_name = labels[item["label"]]
    if label_name in targets and targets[label_name] is None:
        safe_name = label_name.replace(",", "").replace(" ", "_")
        fname = f"ai/test_images/{safe_name}.jpg"
        item["image"].save(fname)
        targets[label_name] = fname
        print(f"  Saved: {fname} ({label_name})")
    if all(v is not None for v in targets.values()):
        break

print(f"\nDone! {sum(1 for v in targets.values() if v)} test images saved to ai/test_images/")
print("\nTo test in Swagger UI (http://localhost:8001/docs):")
print("  1. Click on POST /diagnose")
print("  2. Click 'Try it out'")
print("  3. Upload one of the images from ai/test_images/")
print("  4. Click 'Execute'")
print("  5. Check the response for disease_name and recommendation")
