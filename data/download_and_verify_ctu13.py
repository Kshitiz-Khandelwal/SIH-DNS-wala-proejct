import urllib.request
import ssl
import os
import pandas as pd

# Download genuine CTU-13 Dataset from Stratosphere IPS Lab (Czech Technical University)
# CTU-13 is a recognized public benchmark dataset of real mixed benign and multi-stage botnet attack flow telemetry.
url = "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-51/detailed-bidirectional-flow-labels/capture20110818.binetflow"
out_path = os.path.join("data", "ctu13_scenario10_flows.csv")
os.makedirs("data", exist_ok=True)

print(f"[*] Downloading CTU-13 Scenario 10 from Stratosphere Lab: {url}")
ctx = ssl._create_unverified_context()
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

# Read first 120,000 lines (contains clean sequential timeline of benign background, port scan, C&C, and attack flows)
lines_to_read = 120000
line_count = 0

with urllib.request.urlopen(req, context=ctx, timeout=30) as resp, open(out_path, "wb") as f_out:
    for line in resp:
        f_out.write(line)
        line_count += 1
        if line_count >= lines_to_read:
            break

print(f"[+] Downloaded {line_count} raw flow records to {out_path} ({os.path.getsize(out_path) / (1024*1024):.2f} MB)")

# Verify with Pandas
df = pd.read_csv(out_path)
print("\n" + "="*70)
print("CTU-13 DATASET VERIFICATION")
print("="*70)
print(f"Total Rows: {len(df)}")
print(f"Total Columns: {len(df.columns)}")
print(f"Columns: {list(df.columns)}")
print("\n--- Raw Label Distribution (Top 10) ---")
print(df['Label'].value_counts().head(10))

# Normalize / map labels to attack types and MITRE stages
def map_ctu_label(label_str):
    l = str(label_str).lower()
    if "botnet" in l:
        if "cc" in l or "c&c" in l:
            return "C2_COMMUNICATION"
        elif "portscan" in l or "scan" in l:
            return "RECONNAISSANCE_PORTSCAN"
        elif "ddos" in l or "dos" in l:
            return "DENIAL_OF_SERVICE"
        else:
            return "BOTNET_ACTIVE"
    elif "background" in l or "benign" in l or "normal" in l:
        return "BENIGN"
    return "BENIGN"

df['AttackCategory'] = df['Label'].apply(map_ctu_label)
print("\n--- Categorized Class Distribution ---")
print(df['AttackCategory'].value_counts())

print("\n--- Sample 5 Raw Rows ---")
print(df[['StartTime', 'Dur', 'Proto', 'SrcAddr', 'Sport', 'DstAddr', 'Dport', 'TotPkts', 'TotBytes', 'Label', 'AttackCategory']].head(5).to_string())
print("="*70)
