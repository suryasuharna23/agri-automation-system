import io

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from PIL import Image

from ai.inference.grading_model import get_grading_model
from ai.inference.disease_model import get_disease_model

app = FastAPI(title="Agri AI Inference Service", version="1.0.0")


@app.on_event("startup")
async def load_models():
    get_grading_model()
    get_disease_model()


@app.post("/grade")
async def grade(file: UploadFile = File(...), crop_id: str = Form(...)):
    try:
        image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    result = get_grading_model().predict(image)
    return {"crop_id": crop_id, **result}


@app.post("/diagnose")
async def diagnose(file: UploadFile = File(...)):
    try:
        image = Image.open(io.BytesIO(await file.read())).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    return get_disease_model().predict(image)


@app.get("/health")
async def health():
    return {"status": "ok"}
