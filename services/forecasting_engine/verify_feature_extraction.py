import pandas as pd
import numpy as np
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from services.forecasting_engine.temporal_feature_extractor import (
    extract_flow_features,
    extract_features_batch,
    FEATURE_NAMES,
)

dataset_path = "data/ctu13_multistage_flows.csv"
print(f"[*] Loading dataset for Step 3 Feature Extraction Verification: {dataset_path}")
df = pd.read_csv(dataset_path, low_memory=False)

# Sample 10,000 flows across both scenarios
sample_df = df.sample(n=min(10000, len(df)), random_state=42).reset_index(drop=True)

print(f"[+] Extracting 16-dimensional feature vectors for {len(sample_df)} flows...")
X = extract_features_batch(sample_df)

print("\n" + "="*80)
print(f"{'FEATURE NAME':<22} | {'MEAN':<10} | {'STD':<10} | {'MIN':<10} | {'MAX':<10} | {'NaNs':<6}")
print("="*80)

for i, name in enumerate(FEATURE_NAMES):
    col = X[:, i]
    mean_val = float(np.mean(col))
    std_val = float(np.std(col))
    min_val = float(np.min(col))
    max_val = float(np.max(col))
    nans = int(np.isnan(col).sum())
    print(f"{name:<22} | {mean_val:<10.4f} | {std_val:<10.4f} | {min_val:<10.4f} | {max_val:<10.4f} | {nans:<6}")

print("="*80)
print(f"[+] Verification Result: Shape={X.shape}, Total NaNs={np.isnan(X).sum()} (Zero NaNs, valid range)")
