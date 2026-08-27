import { NextResponse } from "next/server";

export async function GET() {
  const payload = {
    host_ip: "172.28.0.101",
    current_stage: "STAGE_2_INITIAL_ACCESS",
    current_stage_confidence: 0.88,
    overall_threat_score: 74,
    forecast_15m: { stage: "STAGE_4_C2_PERSISTENCE", confidence: 0.85, label: "C2 Beaconing", time_min: 15 },
    forecast_30m: { stage: "STAGE_5_LATERAL_MOVEMENT", confidence: 0.72, label: "Lateral Movement", time_min: 30 },
    forecast_60m: { stage: "STAGE_6_EXFILTRATION", confidence: 0.65, label: "Exfiltration", time_min: 60 },
    shap_explanations: [
      { feature: "Port Sweep Diversity", value: "14 ports", shap_value: 0.32 },
      { feature: "C2 Heartbeat Periodicity", value: "0.91 regularity", shap_value: 0.41 },
      { feature: "DNS Tunneling Markers", value: "3 tags", shap_value: 0.48 },
      { feature: "SYN Flood Ratio", value: "45.0%", shap_value: 0.25 },
    ],
    all_stages: {
      STAGE_1_RECONNAISSANCE: { label: "Network & DNS Reconnaissance", description: "Port sweeps and aggressive DNS enumeration.", mitre_tactics: ["TA0043"] },
      STAGE_2_INITIAL_ACCESS: { label: "Initial Access & DGA Contact", description: "Malicious DGA seed queries and homoglyphs.", mitre_tactics: ["TA0001", "T1568"] },
      STAGE_3_DISCOVERY: { label: "Internal Subnet Discovery", description: "Internal lateral port sweeps and LDAP probes.", mitre_tactics: ["TA0007"] },
      STAGE_4_C2_PERSISTENCE: { label: "Command & Control (C2) Beaconing", description: "Periodic heartbeat pulses and Cobalt Strike sync.", mitre_tactics: ["TA0011"] },
      STAGE_5_LATERAL_MOVEMENT: { label: "Lateral Pivot & DB Target", description: "SMB/RPC propagation to crown jewel database.", mitre_tactics: ["TA0008"] },
      STAGE_6_EXFILTRATION: { label: "Covert DNS Tunnel Exfiltration", description: "Base64 exfiltration over Port 53.", mitre_tactics: ["TA0010", "T1071.004"] },
    },
    hardware_relay_required: false,
  };

  return NextResponse.json(payload);
}
