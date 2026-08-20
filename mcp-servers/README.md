# DNS Shield — MCP Servers

This directory contains **4 MCP (Model Context Protocol) servers** that turn DNS Shield's security infrastructure into a collection of AI-callable tools.

## Available MCP Servers

| Server File | Focus Area | # Tools | Purpose |
|---|---|---|---|
| `mcp_domain_inspector.py` | Domain Evaluation | 3 | Inspect any domain via 7-stage ML pipeline |
| `mcp_threat_intel.py` | Threat Intelligence | 4 | IoC lookup, feed health, DGA family profiles |
| `mcp_soc_analytics.py` | SOC Analytics | 4 | Dashboard stats, event streams, shift reports |
| `mcp_device_fleet.py` | Device Fleet | 5 | Host quarantine, fleet risk, device lookup |
| `mcp_attack_simulator.py` | Red Team | 3 | Inject attack scenarios, run full exercises |

## Installation

```bash
pip install -r mcp-servers/requirements.txt
```

## How to Run

Start each MCP server as a background process (or in separate terminals):

```bash
# Terminal 1: Domain Inspector
python mcp-servers/mcp_domain_inspector.py

# Terminal 2: Threat Intelligence
python mcp-servers/mcp_threat_intel.py

# Terminal 3: SOC Analytics
python mcp-servers/mcp_soc_analytics.py

# Terminal 4: Device Fleet
python mcp-servers/mcp_device_fleet.py

# Terminal 5: Attack Simulator
python mcp-servers/mcp_attack_simulator.py
```

## Connect to Antigravity / Claude Desktop

Add the following to your `mcp_config.json` (located at `C:\Users\Admin\.gemini\config\mcp_config.json`):

```json
{
  "mcpServers": {
    "dns-shield-domain-inspector": {
      "command": "python",
      "args": ["C:/Users/Admin/Desktop/Kshitiz/SIH-DNS-wala-project/mcp-servers/mcp_domain_inspector.py"]
    },
    "dns-shield-threat-intel": {
      "command": "python",
      "args": ["C:/Users/Admin/Desktop/Kshitiz/SIH-DNS-wala-project/mcp-servers/mcp_threat_intel.py"]
    },
    "dns-shield-soc-analytics": {
      "command": "python",
      "args": ["C:/Users/Admin/Desktop/Kshitiz/SIH-DNS-wala-project/mcp-servers/mcp_soc_analytics.py"]
    },
    "dns-shield-device-fleet": {
      "command": "python",
      "args": ["C:/Users/Admin/Desktop/Kshitiz/SIH-DNS-wala-project/mcp-servers/mcp_device_fleet.py"]
    },
    "dns-shield-attack-simulator": {
      "command": "python",
      "args": ["C:/Users/Admin/Desktop/Kshitiz/SIH-DNS-wala-project/mcp-servers/mcp_attack_simulator.py"]
    }
  }
}
```

## Complete Tool Registry (19 Tools Across 5 Servers)

### 🔍 Domain Inspector (3 Tools)
- `inspect_domain(domain)` — Full 7-stage evaluation with TreeSHAP breakdown
- `batch_inspect_domains(domains[])` — Bulk inspect up to 50 domains, sorted by risk
- `calculate_domain_entropy(domain)` — Shannon entropy H(X) with risk classification

### 🛡️ Threat Intelligence (4 Tools)
- `lookup_ioc(indicator)` — Check domain/IP against 133,720 live threat indicators
- `get_feed_health()` — Real-time status of all 5 RPZ feed providers
- `sync_threat_feeds()` — Manually trigger a full refresh of all threat feeds
- `get_dga_family_profiles()` — Taxonomy of 50+ DGA malware families with signatures

### 📊 SOC Analytics (4 Tools)
- `get_dashboard_stats()` — Live 24-hour query volume and verdict breakdown
- `get_recent_events(limit)` — Last N DNS query events with full metadata
- `calculate_threat_ratio()` — Block/flag/clean rates + Threat Pressure Index (TPI)
- `generate_shift_report(analyst_name)` — Auto-generate formatted SOC handover report

### 🖥️ Device Fleet (5 Tools)
- `list_devices(status_filter)` — All 48 hosts, filterable by COMPROMISED/SUSPICIOUS/CLEAN
- `find_device(identifier)` — Look up any host by IP or hostname
- `quarantine_host(identifier, reason)` — DNS-level network isolation of a host
- `release_quarantine(identifier, analyst_sign_off)` — Restore network access post-remediation
- `get_fleet_risk_summary()` — Aggregate risk metrics for entire 48-host fleet

### ⚔️ Attack Simulator (3 Tools)
- `run_attack_simulation(attack_type)` — Inject DGA/phishing/tunnelling/C2/benign scenario
- `run_full_red_team_exercise()` — Execute all 5 attack types and get a pass/fail report
- `describe_attack_type(attack_type)` — Detailed MITRE ATT&CK mapping for each attack

## Example AI Workflows

Once connected, you can ask your AI assistant:

> *"Inspect the domain `xk9mqz7p2n.top` and tell me if it's malicious."*
> 
> *"Quarantine the device at IP 10.0.4.122 — it's beaconing to a C2 server."*
> 
> *"Sync all 5 threat feeds and give me the current fleet risk summary."*
> 
> *"Run a full red team exercise and generate the shift report."*
> 
> *"Check these 10 domains from the email I received and rank them by threat score."*
