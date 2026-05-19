FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create model checkpoints directory
RUN mkdir -p /app/models/checkpoints

# Pre-download the disease model from Hugging Face during build
RUN python -c "from transformers import AutoModelForImageClassification, AutoImageProcessor; \
    AutoImageProcessor.from_pretrained('Diginsa/Plant-Disease-Detection-Project'); \
    AutoModelForImageClassification.from_pretrained('Diginsa/Plant-Disease-Detection-Project')" \
    || echo "Model download will happen at runtime"

EXPOSE 8001

CMD ["uvicorn", "ai.api.inference_server:app", "--host", "0.0.0.0", "--port", "8001"]
