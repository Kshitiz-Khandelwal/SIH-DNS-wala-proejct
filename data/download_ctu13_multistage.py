import urllib.request
import ssl
import os
import pandas as pd
import io

# CTU-13 Dataset Collection across 5 Scenarios:
# Scenario 1 (Botnet-42): Neris (IRC, Spam, Click Fraud)
# Scenario 3 (Botnet-44): Rbot (PortScan, USR, IRC)
# Scenario 8 (Botnet-49): Murlo (PortScan, UDP)
# Scenario 9 (Botnet-50): Neris (PortScan, Spam, C&C)
# Scenario 10 (Botnet-51): Rbot (DDoS, ICMP flooding, IRC)

scenarios = [
    {
        "id": "Scenario-1",
        "url": "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-42/detailed-bidirectional-flow-labels/capture20110810.binetflow",
        "infected_ip": "147.32.84.165"
    },
    {
        "id": "Scenario-3",
        "url": "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-44/detailed-bidirectional-flow-labels/capture20110812.binetflow",
        "infected_ip": "147.32.84.165"
    },
    {
        "id": "Scenario-8",
        "url": "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-49/detailed-bidirectional-flow-labels/capture20110816-3.binetflow",
        "infected_ip": "147.32.84.165"
    },
    {
        "id": "Scenario-9",
        "url": "https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-50/detailed-bidirectional-flow-labels/capture20110817.binetflow",
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
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
            for i, raw_line in enumerate(resp):
                line_str = raw_line.decode('utf-8', errors='ignore').strip()
                if i == 0:
                    header = line_str
                    continue
                
                # Capture infected/botnet flows and balanced benign flows per scenario
                if "botnet" in line_str.lower() or sc['infected_ip'] in line_str:
                    botnet_lines.append(line_str)
                elif len(benign_lines) < 15000:
                    benign_lines.append(line_str)
                    
                if len(botnet_lines) >= 15000 and len(benign_lines) >= 15000:
                    break
                if i >= 500000:
                    break
                    
        print(f"    -> Extracted {len(botnet_lines)} Botnet/Infected flows and {len(benign_lines)} Benign flows from {sc['id']}")
        
        csv_content = header + "\n" + "\n".join(botnet_lines + benign_lines)
        df_sc = pd.read_csv(io.StringIO(csv_content))
        df_sc['Scenario'] = sc['id']
        collected_dfs.append(df_sc)
    except Exception as e:
        print(f"    [-] Error downloading {sc['id']}: {e}")

df_all = pd.concat(collected_dfs, ignore_index=True)
df_all['StartTime'] = pd.to_datetime(df_all['StartTime'])
df_all = df_all.sort_values(by='StartTime').reset_index(drop=True)
df_all.to_csv(out_path, index=False)

print(f"\n[+] Saved multi-scenario CTU-13 dataset to {out_path} ({os.path.getsize(out_path)/(1024*1024):.2f} MB, {len(df_all)} total rows)")
print(f"    Scenario Breakdown:\n{df_all['Scenario'].value_counts()}")
