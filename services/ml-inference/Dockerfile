FROM python:3.11-slim
WORKDIR /app
COPY services/ml-inference/requirements.txt services/ml-inference/
RUN pip install --no-cache-dir -r services/ml-inference/requirements.txt
COPY services/ml-inference/app.py services/ml-inference/xai_formatter.py services/ml-inference/
COPY dns_shield_features.py .
WORKDIR /app/services/ml-inference
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
