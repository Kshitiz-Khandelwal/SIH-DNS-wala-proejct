import subprocess
import json
import time

def run_benchmark(cmd):
    start = time.time()
    try:
        # We need PYTHONPATH=. to resolve dns_shield_features
        res = subprocess.run(["powershell", "-Command", f"$env:PYTHONPATH='.'; $env:PYTHONUNBUFFERED='1'; {cmd}"], capture_output=True, text=True, check=True)
        # Parse output line that starts with {
        output_str = res.stdout
        try:
            start_idx = output_str.index('{')
            end_idx = output_str.rindex('}') + 1
            json_str = output_str[start_idx:end_idx]
            data = json.loads(json_str)
            data["time_seconds"] = round(time.time() - start, 2)
            return data
        except ValueError:
            print(f"Error: no JSON found in output.\\nOutput: {output_str}\\nStderr: {res.stderr}")
            return None
    except subprocess.CalledProcessError as e:
        print(f"Error running {cmd}: {e.stderr}")
        return None

results = []
print("Running RF (50 trees)...")
results.append(("RF-50", run_benchmark("python ml-training/train.py --data data/dga_dataset.csv --name dga --version 50 --source simulated --no-tune --algorithm rf --tree-count 50")))

print("Running RF (150 trees)...")
results.append(("RF-150", run_benchmark("python ml-training/train.py --data data/dga_dataset.csv --name dga --version 150 --source simulated --no-tune --algorithm rf --tree-count 150")))

print("Running XGBoost...")
results.append(("XGBoost", run_benchmark("python ml-training/train.py --data data/dga_dataset.csv --name dga --version xgb --source simulated --no-tune --algorithm xgboost --tree-count 150")))

print("Running LightGBM...")
results.append(("LightGBM", run_benchmark("python ml-training/train.py --data data/dga_dataset.csv --name dga --version lgbm --source simulated --no-tune --algorithm lgbm --tree-count 150")))

print("Running Cross-family holdout (RF-150)...")
results.append(("Cross-Family", run_benchmark("python ml-training/train.py --data data/dga_dataset.csv --name dga --version xfam --source simulated --no-tune --algorithm rf --tree-count 150 --cross-family")))

with open("benchmark_temp.json", "w") as f:
    json.dump(results, f, indent=2)

print("\n--- RESULTS ---")
for name, res in results:
    if res:
        print(f"{name:15}: F1={res['weighted_f1']:.4f} Time={res['time_seconds']}s")
    else:
        print(f"{name:15}: FAILED")
