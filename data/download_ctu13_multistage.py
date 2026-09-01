import urllib.request
import ssl
import os
import pandas as pd
import io

# CTU-13 Dataset collection: Download Scenario 1 (Botnet-42) and Scenario 10 (Botnet-51)
# Contains thousands of Botnet flows (PortScan, C&C, DDoS, Spam) plus Benign Background flows
scenarios = [
    {
        "id": "Scenario-1",
        "url": "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-42/detailed-bidirectional-flow-labels/capture20110810.binetflow",
        "infected_ip": "147.32.84.165"
    },
    {
        "id": "Scenario-10",
        "url": "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-51/detailed-bidirectional-flow-labels/capture20110818.binetflow",
        "infected_ip": "147.32.84.165"
    }
]

out_path = os.path.join("data", "ctu13_multistage_flows.csv")
os.makedirs("data", exist_ok=True)
ctx = ssl._create_unverified_context()

collected_dfs = []

for sc in scenarios:
    print(f"[*] Streaming {sc['id']} ({sc['url']})...")
    req = urllib.request.Request(sc['url'], headers={'User-Agent': 'Mozilla/5.0'})
    botnet_lines = []
    benign_lines = []
    header = None
    
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        for i, raw_line in enumerate(resp):
            line_str = raw_line.decode('utf-8', errors='ignore').strip()
            if i == 0:
                header = line_str
                continue
            
            # Keep all Botnet flows, plus a balanced sample of benign flows
            if "botnet" in line_str.lower() or sc['infected_ip'] in line_str:
                botnet_lines.append(line_str)
            elif len(benign_lines) < 25000:
                benign_lines.append(line_str)
                
            if len(botnet_lines) >= 30000 and len(benign_lines) >= 25000:
                break
            if i >= 600000:  # Search window
                break
                
    print(f"    -> Extracted {len(botnet_lines)} Botnet/Infected flows and {len(benign_lines)} Benign flows from {sc['id']}")
    
    csv_content = header + "\n" + "\n".join(botnet_lines + benign_lines)
    df_sc = pd.read_csv(io.StringIO(csv_content))
    df_sc['Scenario'] = sc['id']
    collected_dfs.append(df_sc)

df_all = pd.concat(collected_dfs, ignore_index=True)
# Sort chronologically by StartTime
df_all['StartTime'] = pd.to_datetime(df_all['StartTime'])
df_all = df_all.sort_values(by='StartTime').reset_index(drop=True)
df_all.to_csv(out_path, index=False)

print(f"\n[+] Saved consolidated CTU-13 dataset to {out_path} ({os.path.getsize(out_path)/(1024*1024):.2f} MB)")

# Verification Output
print("\n" + "="*70)
print("CTU-13 MULTI-STAGE DATASET VERIFICATION")
print("="*70)
print(f"Actual Row Count: {len(df_all)}")
print(f"Columns ({len(df_all.columns)}): {list(df_all.columns)}")

# MITRE ATT&CK Mapping
def map_mitre_stage(row):
    lbl = str(row.get('Label', '')).lower()
    proto = str(row.get('Proto', '')).lower()
    dport = str(row.get('Dport', ''))
    
    if "botnet" in lbl or "147.32.84.165" in str(row.get('SrcAddr', '')):
        if "portscan" in lbl or "scan" in lbl:
            return "STAGE_1_RECONNAISSANCE"
        elif "cc" in lbl or "c&c" in lbl or "irc" in lbl or dport in ['6667', '80', '443']:
            return "STAGE_4_C2_PERSISTENCE"
        elif "attack" in lbl or "ddos" in lbl:
            return "STAGE_6_EXFILTRATION"
        elif dport in ['445', '139', '389', '88']:
            return "STAGE_5_LATERAL_MOVEMENT"
        else:
            return "STAGE_2_INITIAL_ACCESS"
    return "STAGE_0_BENIGN"

df_all['MITRE_Stage'] = df_all.apply(map_mitre_stage, axis=1)

print("\n--- Class Distribution by MITRE Stage ---")
print(df_all['MITRE_Stage'].value_counts())

print("\n--- Sample 5 Raw Rows ---")
print(df_all[['StartTime', 'Dur', 'Proto', 'SrcAddr', 'Sport', 'DstAddr', 'Dport', 'TotPkts', 'TotBytes', 'Label', 'MITRE_Stage']].head(5).to_string())
print("="*70)
