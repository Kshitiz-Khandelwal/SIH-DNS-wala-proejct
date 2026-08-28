FROM python:3.11-slim
WORKDIR /app
COPY services/api-gateway/requirements.txt services/api-gateway/
RUN pip install --no-cache-dir -r services/api-gateway/requirements.txt
COPY services/api-gateway/app.py services/api-gateway/
COPY services/flow_ingest services/flow_ingest
COPY services/forecasting_engine services/forecasting_engine
WORKDIR /app/services/api-gateway
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
