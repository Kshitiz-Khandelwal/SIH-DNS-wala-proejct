import sys
import os
import json

# Setup environment to load models from artifacts/
os.environ["MODEL_ARTIFACT_DIR"] = os.path.join(os.path.dirname(__file__), "..", "..", "artifacts")

# Import predict_one and the request model
sys.path.append(os.path.dirname(__file__))
from app import predict_one, PredictRequest

if __name__ == "__main__":
    req = PredictRequest(domain="1234567890abcdef.tk")
    result = predict_one(req)
    print(json.dumps(result, indent=2))
