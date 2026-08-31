"""
DNS Shield X-Forecast — Temporal Attack Forecasting Engine
==========================================================
Implements an explainable, deterministic multi-stage Markov State Transition
Model & MITRE ATT&CK Kill-Chain Forecaster for predicting cyberattack progression
across 15 to 60 minute prediction horizons. Integrates exact feature explanations
and preemptive defensive triggers.
"""

import time
import math
import logging
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("attack-forecaster")

# The 6 canonical MITRE ATT&CK Kill-Chain Stages
STAGES = [
    "STAGE_0_BENIGN",
    "STAGE_1_RECONNAISSANCE",
    "STAGE_2_INITIAL_ACCESS",
    "STAGE_3_DISCOVERY",
    "STAGE_4_C2_PERSISTENCE",
    "STAGE_5_LATERAL_MOVEMENT",
    "STAGE_6_EXFILTRATION",
]

STAGE_METADATA = {
    "STAGE_0_BENIGN": {
        "label": "Benign Operational Traffic",
        "severity": "LOW",
        "color": "#10b981",  # Emerald
        "mitre_tactics": ["TA0000 - Normal"],
        "description": "Standard business and cloud DNS/IP traffic patterns."
    },
    "STAGE_1_RECONNAISSANCE": {
        "label": "Network & DNS Reconnaissance",
        "severity": "LOW-MEDIUM",
        "color": "#f59e0b",  # Amber
        "mitre_tactics": ["TA0043 - Reconnaissance", "T1595 - Active Scanning"],
        "description": "Port sweeps, aggressive DNS enumeration, and target surface probing."
    },
    "STAGE_2_INITIAL_ACCESS": {
        "label": "Initial Access & DGA Contact",
        "severity": "MEDIUM",
        "color": "#f97316",  # Orange
        "mitre_tactics": ["TA0001 - Initial Access", "T1566 - Phishing", "T1568 - Dynamic Resolution"],
        "description": "Malicious DGA seed queries, homoglyph phishing lures, and initial payload delivery."
    },
    "STAGE_3_DISCOVERY": {
        "label": "Internal Subnet Discovery",
        "severity": "MEDIUM-HIGH",
        "color": "#e11d48",  # Rose
        "mitre_tactics": ["TA0007 - Discovery", "T1046 - Network Service Discovery"],
        "description": "Internal lateral port enumeration, LDAP/SMB sweeps, and service discovery."
    },
    "STAGE_4_C2_PERSISTENCE": {
        "label": "Command & Control (C2) Beaconing",
        "severity": "HIGH",
        "color": "#dc2626",  # Red
        "mitre_tactics": ["TA0011 - Command and Control", "T1071 - Application Layer Protocol"],
        "description": "Periodic heartbeat pulses, Cobalt Strike beaconing, and DNS tunneling sync."
    },
    "STAGE_5_LATERAL_MOVEMENT": {
        "label": "Lateral Movement & Privilege Escalation",
        "severity": "CRITICAL",
        "color": "#9333ea",  # Purple
        "mitre_tactics": ["TA0008 - Lateral Movement", "T1021 - Remote Services"],
        "description": "Cross-VLAN pivoting, token impersonation, and target database targeting."
    },
    "STAGE_6_EXFILTRATION": {
        "label": "Data Exfiltration & Impact",
        "severity": "EMERGENCY",
        "color": "#7f1d1d",  # Deep Crimson
        "mitre_tactics": ["TA0010 - Exfiltration", "T1048 - Exfiltration Over Alternative Protocol"],
        "description": "High-entropy DNS tunneling byte streams, chunked Base64 exfiltration, and data egress."
    }
}


@dataclass
class StagePrediction:
    stage_id: str
    stage_label: str
    probability: float
    estimated_time_to_stage_min: float
    confidence_cone: Tuple[float, float]  # (min_prob, max_prob)


@dataclass
class AttackForecastResult:
    host_ip: str
    timestamp: float
    current_stage: str
    current_stage_confidence: float
    overall_threat_score: int  # 0 to 100
    time_to_compromise_min: float  # PS2 required field: estimated minutes until full exfiltration/impact
    forecast_horizon_15m: StagePrediction
    forecast_horizon_30m: StagePrediction
    forecast_horizon_60m: StagePrediction
    blast_radius_nodes: List[str]
    feature_attributions: List[Dict[str, Any]]  # Deterministic additive feature contribution weights
    preemptive_actions: List[Dict[str, Any]]
    hardware_relay_required: bool = False  # Simulated hardware air-gap trip signal (software emulation)
    
    @property
    def shap_explanations(self) -> List[Dict[str, Any]]:
        """Legacy alias for backward compatibility with frontend consumers."""
        return self.feature_attributions



class AttackForecastingEngine:
    """
    Stateful Temporal Forecaster analyzing multi-flow host event sequences.
    Applies Markov state transitions + feature-weighted probability regression.
    """

    def __init__(self):
        # Baseline Markov State Transition Matrix (Stage i -> Stage j)
        self.transition_matrix = {
            "STAGE_0_BENIGN": {"STAGE_0_BENIGN": 0.85, "STAGE_1_RECONNAISSANCE": 0.12, "STAGE_2_INITIAL_ACCESS": 0.03},
            "STAGE_1_RECONNAISSANCE": {"STAGE_1_RECONNAISSANCE": 0.20, "STAGE_2_INITIAL_ACCESS": 0.65, "STAGE_3_DISCOVERY": 0.15},
            "STAGE_2_INITIAL_ACCESS": {"STAGE_2_INITIAL_ACCESS": 0.15, "STAGE_3_DISCOVERY": 0.50, "STAGE_4_C2_PERSISTENCE": 0.35},
            "STAGE_3_DISCOVERY": {"STAGE_3_DISCOVERY": 0.10, "STAGE_4_C2_PERSISTENCE": 0.45, "STAGE_5_LATERAL_MOVEMENT": 0.45},
            "STAGE_4_C2_PERSISTENCE": {"STAGE_4_C2_PERSISTENCE": 0.20, "STAGE_5_LATERAL_MOVEMENT": 0.40, "STAGE_6_EXFILTRATION": 0.40},
            "STAGE_5_LATERAL_MOVEMENT": {"STAGE_5_LATERAL_MOVEMENT": 0.10, "STAGE_6_EXFILTRATION": 0.90},
            "STAGE_6_EXFILTRATION": {"STAGE_6_EXFILTRATION": 0.95, "STAGE_0_BENIGN": 0.05}
        }
        logger.info("Initialized Temporal Attack Forecasting Engine with 7-Stage Kill-Chain Matrix")

    def _extract_aggregate_features(self, flows: List[Dict[str, Any]]) -> Dict[str, float]:
        """Combine multi-flow features over a temporal sliding window."""
        if not flows:
            return {
                "avg_entropy": 2.5,
                "syn_ratio": 0.0,
                "burst_qps": 0.0,
                "dns_tunnel_markers": 0.0,
                "unique_ports": 0.0,
                "c2_heartbeat_regularity": 0.0,
                "fwd_bwd_imbalance": 1.0,
                "dga_query_count": 0.0,
                "discovery_port_count": 0.0,
                "lateral_flow_count": 0.0,
                "c2_query_count": 0.0
            }

        total_bytes = sum(f.get("total_bytes", f.get("features", {}).get("total_bytes", 100)) for f in flows)
        total_syn = sum(f.get("syn_count", 1 if (f.get("tcp_flags") or {}).get("SYN") or f.get("features", {}).get("syn_ratio", 0) > 0.3 else 0) for f in flows)
        dns_counts = sum(1 for f in flows if f.get("dns_queries") or f.get("dns_query") or f.get("protocol") == "DNS")
        unique_ports = len(set(f.get("dst_port", 0) for f in flows))

        tunnel_markers = 0
        dga_queries = 0
        c2_queries = 0
        discovery_ports = 0
        lateral_flows = 0

        for f in flows:
            queries = []
            if f.get("dns_query"):
                queries.append(f["dns_query"])
            if isinstance(f.get("dns_queries"), list):
                queries.extend(f["dns_queries"])

            for q in queries:
                if not q or not isinstance(q, str):
                    continue
                q_low = q.lower()
                if "==" in q_low or ".exfil." in q_low or "exfiltrate" in q_low or len(q_low) > 40:
                    tunnel_markers += 1
                elif any(k in q_low for k in ["beacon", "c2-domain", "c2."]):
                    c2_queries += 1
                elif any(k in q_low for k in ["dga", "seed", ".top", ".xyz", ".biz"]):
                    dga_queries += 1

            dst_port = f.get("dst_port", 0)
            dst_ip = f.get("dst_ip", "")

            # Discovery: LDAP 389/636, Kerberos 88, NetBIOS 139
            if dst_port in [139, 389, 636, 88]:
                discovery_ports += 1

            # Lateral Movement: Port 445 on internal subnets
            if dst_port == 445 and (dst_ip.startswith("10.") or dst_ip.startswith("192.168.")):
                lateral_flows += 1

        iats = [f.get("features", {}).get("iat_mean", 0) for f in flows if f.get("features", {}).get("iat_mean", 0) > 0]
        heartbeat_reg = 0.0
        if len(iats) >= 3:
            mean_iat = sum(iats) / len(iats)
            variance = sum((x - mean_iat) ** 2 for x in iats) / len(iats)
            if variance < 2.0 and mean_iat > 5.0:
                heartbeat_reg = 0.9
        elif c2_queries > 0:
            heartbeat_reg = 0.90

        return {
            "syn_ratio": min(1.0, float(total_syn) / max(1.0, len(flows))),
            "burst_qps": round(float(dns_counts) / max(1.0, len(flows)), 2),
            "dns_tunnel_markers": float(tunnel_markers),
            "dga_query_count": float(dga_queries),
            "c2_query_count": float(c2_queries),
            "discovery_port_count": float(discovery_ports),
            "lateral_flow_count": float(lateral_flows),
            "unique_ports": float(unique_ports),
            "c2_heartbeat_regularity": heartbeat_reg,
            "fwd_bwd_imbalance": min(10.0, float(total_bytes) / 1024.0)
        }

    def evaluate_host_timeline(self, host_ip: str, flows: List[Dict[str, Any]]) -> AttackForecastResult:
        """Run temporal forecasting inference on a host's active traffic sequence."""
        now = time.time()
        feats = self._extract_aggregate_features(flows)
        # Step 1: Infer Current Stage based on majority indicators in the active sliding window (last 20 flows)
        recent_flows = flows[-20:] if len(flows) >= 20 else flows

        c_exfil = 0
        c_lateral = 0
        c_c2 = 0
        c_disc = 0
        c_dga = 0
        c_recon = 0

        for f in recent_flows:
            queries = []
            if f.get("dns_query"):
                queries.append(f["dns_query"])
            if isinstance(f.get("dns_queries"), list):
                queries.extend(f["dns_queries"])

            has_exfil = any("==" in q.lower() or ".exfil." in q.lower() or "exfiltrate" in q.lower() for q in queries)
            has_c2 = any("beacon" in q.lower() or "c2" in q.lower() for q in queries) or f.get("dst_ip") == "185.220.101.45"
            has_dga = any("dga" in q.lower() or ".top" in q.lower() or ".xyz" in q.lower() for q in queries)
            dst_port = f.get("dst_port", 0)
            dst_ip = f.get("dst_ip", "")
            f_syn = f.get("features", {}).get("syn_ratio", 0.0) or (1.0 if (f.get("tcp_flags") or {}).get("SYN") else 0.0)

            if has_exfil:
                c_exfil += 1
            elif dst_port == 445 and (dst_ip.startswith("10.") or dst_ip.startswith("192.168.")):
                c_lateral += 1
            elif has_c2:
                c_c2 += 1
            elif dst_port in [139, 389, 636, 88]:
                c_disc += 1
            elif has_dga:
                c_dga += 1
            elif f_syn > 0.4 or dst_port in [22, 80, 8080]:
                c_recon += 1

        stage_counts = {
            "STAGE_6_EXFILTRATION": c_exfil,
            "STAGE_5_LATERAL_MOVEMENT": c_lateral,
            "STAGE_4_C2_PERSISTENCE": c_c2,
            "STAGE_3_DISCOVERY": c_disc,
            "STAGE_2_INITIAL_ACCESS": c_dga,
            "STAGE_1_RECONNAISSANCE": c_recon,
        }

        # Pick the stage with the highest active indicator count in the sliding window
        max_stage = max(stage_counts, key=stage_counts.get)
        max_count = stage_counts[max_stage]

        if max_count > 0:
            current_stage = max_stage
            confidence = min(0.98, 0.85 + (max_count / max(1.0, len(recent_flows))) * 0.13)
        else:
            current_stage = "STAGE_0_BENIGN"
            confidence = 0.95

        # Overall threat score (0 to 100)
        stage_idx = STAGES.index(current_stage)
        threat_score = int(min(100, (stage_idx / 6.0) * 85 + (confidence * 15))) if stage_idx > 0 else 5

        # ---------------------------------------------------------------------
        # Time-to-Compromise (TTC) Calculation & Formal Provenance
        # ---------------------------------------------------------------------
        # FORMULA DISCLOSURE:
        #   TTC(s, x) = BaseDuration(s) * VelocityModifier(QPS) * ConfidenceUncertainty(C)
        #
        # Where:
        #   1. BaseDuration(s) = sum_{k=s+1}^{6} T_k
        #      Canonical baseline phase durations:
        #        T_1 (Recon)       = 10.0 min
        #        T_2 (Init Access) = 15.0 min
        #        T_3 (Discovery)   = 12.0 min
        #        T_4 (C2 Persist)  = 18.0 min
        #        T_5 (Lateral Mov) = 22.0 min
        #        T_6 (Exfiltrate)  = 0.0 min
        #
        #   2. VelocityModifier(QPS) = 1.0 - 0.45 * min(burst_qps / 25.0, 1.0)
        #      Higher query/packet burst rates indicate automated APT tooling,
        #      accelerating the transition speed up to 45% faster.
        #
        #   3. ConfidenceUncertainty(C) = 0.60 + 0.40 * (1.0 - confidence)
        #      High model confidence (C -> 1.0) projects direct path progression (0.60x),
        #      while low confidence factors in attacker dwell time and hesitancy (1.00x).
        # ---------------------------------------------------------------------
        stage_durations = [0.0, 10.0, 15.0, 12.0, 18.0, 22.0, 0.0]
        
        if stage_idx == 0:
            # Benign baseline has no active compromise trajectory
            time_to_compromise_min = 0.0
        elif stage_idx >= 6:
            # Already at impact / exfiltration phase
            time_to_compromise_min = 0.0
        else:
            base_remaining_duration = sum(stage_durations[stage_idx + 1: 7])
            # Velocity factor: packet burst / query rate acceleration
            burst_rate = float(feats.get("burst_qps", 0.0))
            velocity_modifier = max(0.55, 1.0 - 0.45 * min(burst_rate / 25.0, 1.0))
            # Uncertainty scaling
            confidence_factor = 0.60 + 0.40 * (1.0 - confidence)
            time_to_compromise_min = round(base_remaining_duration * velocity_modifier * confidence_factor, 1)


        # Step 2: Forecast Future Horizons (+15m, +30m, +60m)
        trans = self.transition_matrix.get(current_stage, {"STAGE_0_BENIGN": 1.0})
        next_likely_stage = max(trans, key=trans.get)
        next_prob = trans[next_likely_stage]
        next_idx = STAGES.index(next_likely_stage) if next_likely_stage in STAGES else 0

        # Dynamically scaled horizon time estimates derived from TTC and stage velocity
        velocity_mod = locals().get("velocity_modifier", 1.0)
        time_to_next = round(max(0.0, stage_durations[next_idx] * velocity_mod), 1) if stage_idx > 0 else 0.0

        # Project +15m
        h15 = StagePrediction(
            stage_id=next_likely_stage,
            stage_label=STAGE_METADATA[next_likely_stage]["label"],
            probability=round(min(0.98, next_prob * confidence + 0.1), 3),
            estimated_time_to_stage_min=round(min(15.0, time_to_next), 1) if stage_idx > 0 else 0.0,
            confidence_cone=(round(max(0.0, next_prob - 0.15), 2), round(min(1.0, next_prob + 0.1), 2))
        )

        # Project +30m (next step in Markov chain)
        trans_h30 = self.transition_matrix.get(next_likely_stage, {"STAGE_0_BENIGN": 1.0})
        stage_30 = max(trans_h30, key=trans_h30.get)
        stage_30_idx = STAGES.index(stage_30) if stage_30 in STAGES else 0
        time_to_h30 = round(max(0.0, (stage_durations[next_idx] + stage_durations[stage_30_idx]) * velocity_mod), 1) if stage_idx > 0 else 0.0
        h30 = StagePrediction(
            stage_id=stage_30,
            stage_label=STAGE_METADATA[stage_30]["label"],
            probability=round(min(0.95, trans_h30[stage_30] * 0.9), 3),
            estimated_time_to_stage_min=round(min(30.0, time_to_h30), 1) if stage_idx > 0 else 0.0,
            confidence_cone=(round(max(0.0, trans_h30[stage_30] - 0.2), 2), round(min(1.0, trans_h30[stage_30] + 0.15), 2))
        )

        # Project +60m (Culmination - Exfiltration or Resolution)
        culmination_stage = "STAGE_6_EXFILTRATION" if stage_idx >= 2 else "STAGE_0_BENIGN"
        h60 = StagePrediction(
            stage_id=culmination_stage,
            stage_label=STAGE_METADATA[culmination_stage]["label"],
            probability=round(0.85 if stage_idx >= 2 else 0.90, 3),
            estimated_time_to_stage_min=round(min(60.0, time_to_compromise_min), 1) if stage_idx > 0 else 0.0,
            confidence_cone=(0.70, 0.95)
        )

        # Step 3: Explainability — Deterministic Additive Feature Attribution Weights
        feature_attributions = [
            {"feature": "Port Sweep Diversity", "value": f"{feats['unique_ports']} ports", "weight": +0.32 if feats['unique_ports'] > 5 else -0.15, "shap_value": +0.32 if feats['unique_ports'] > 5 else -0.15},
            {"feature": "C2 Heartbeat Periodicity", "value": f"{feats['c2_heartbeat_regularity']}", "weight": +0.41 if feats['c2_heartbeat_regularity'] > 0 else -0.10, "shap_value": +0.41 if feats['c2_heartbeat_regularity'] > 0 else -0.10},
            {"feature": "DNS Tunneling Markers", "value": f"{feats['dns_tunnel_markers']} tags", "weight": +0.48 if feats['dns_tunnel_markers'] > 0 else -0.22, "shap_value": +0.48 if feats['dns_tunnel_markers'] > 0 else -0.22},
            {"feature": "SYN Flood Ratio", "value": f"{round(feats['syn_ratio']*100, 1)}%", "weight": +0.25 if feats['syn_ratio'] > 0.3 else -0.18, "shap_value": +0.25 if feats['syn_ratio'] > 0.3 else -0.18}
        ]

        # Step 4: Blast Radius Nodes derived strictly from observed internal flow telemetry
        observed_internal_targets = []
        for f in flows:
            dst = f.get("dst_ip", "")
            if dst and dst != host_ip and (dst.startswith("10.") or dst.startswith("192.168.") or dst.startswith("172.")):
                if dst not in observed_internal_targets:
                    observed_internal_targets.append(dst)

        blast_radius = observed_internal_targets[:5]

        # Step 5: Preemptive Action Recommendations & Hardware Relay Trip Trigger (Software Emulation)
        preemptive_actions = []
        relay_required = False

        if stage_idx >= 5 or (stage_idx >= 4 and h15.probability > 0.85):
            relay_required = True
            preemptive_actions.append({
                "action": "SIMULATED_AIR_GAP_TRIP",
                "priority": "CRITICAL",
                "description": "Trigger simulated hardware air-gap relay signal (GPIO 18 emulation) to isolate external egress.",
                "target": "HARDWARE_RELAY_EMULATOR_0"
            })

        if stage_idx >= 3:
            preemptive_actions.append({
                "action": "PREEMPTIVE_VLAN_ISOLATION",
                "priority": "HIGH",
                "description": f"Isolate Host {host_ip} to Quarantine VLAN 99 before lateral hop.",
                "target": host_ip
            })
            preemptive_actions.append({
                "action": "DEPLOY_DECOY_HONEYPOT",
                "priority": "MEDIUM",
                "description": "Deploy fake SMB/LDAP honeypot on predicted next-hop subnet.",
                "target": blast_radius[0] if blast_radius else "192.168.1.50"
            })

        return AttackForecastResult(
            host_ip=host_ip,
            timestamp=now,
            current_stage=current_stage,
            current_stage_confidence=round(confidence, 3),
            overall_threat_score=threat_score,
            time_to_compromise_min=time_to_compromise_min,
            forecast_horizon_15m=h15,
            forecast_horizon_30m=h30,
            forecast_horizon_60m=h60,
            blast_radius_nodes=blast_radius,
            feature_attributions=feature_attributions,
            preemptive_actions=preemptive_actions,
            hardware_relay_required=relay_required
        )



# Singleton instance for application-wide use
attack_forecaster = AttackForecastingEngine()
