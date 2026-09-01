import pandas as pd

# Create a clean offline test slice from CTU-13 with both benign and attack host traffic
df = pd.read_csv("data/ctu13_multistage_flows.csv", low_memory=False)
sample_test_df = df.tail(500).reset_index(drop=True)
sample_test_df.to_csv("data/sample_offline_telemetry.csv", index=False)
print(f"[+] Created data/sample_offline_telemetry.csv with {len(sample_test_df)} rows")
