"""DNS Shield X-Forecast — Temporal Flow Feature Extractor
Extracts standardized flow-level and packet-level features from raw network flow records (CTU-13, NetFlow/IPFIX, JSON telemetry, PCAP).
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Union

FEATURE_NAMES = [
    "duration_sec",
    "total_packets",
    "total_bytes",
    "src_bytes",
    "dst_bytes",
    "bytes_per_sec",
    "packets_per_sec",
    "avg_packet_size",
    "is_tcp",
    "is_udp",
    "is_icmp",
    "is_dns_port",
    "is_web_port",
    "is_lateral_port",  # 445 SMB, 139 NetBIOS, 389 LDAP, 88 Kerberos
    "is_internal_dst",
    "is_syn_or_scan",
]

def extract_flow_features(flow: Union[Dict[str, Any], pd.Series]) -> np.ndarray:
    """Extract a 16-dimensional normalized numeric feature vector from a single flow record."""
    if isinstance(flow, pd.Series):
        flow_dict = flow.to_dict()
    else:
        flow_dict = flow

    # 1. Flow Duration
    dur = float(flow_dict.get("Dur", flow_dict.get("duration", 0.0)) or 0.0)
    dur = max(0.0, dur)

    # 2. Packet and Byte Totals
    tot_pkts = float(flow_dict.get("TotPkts", flow_dict.get("total_packets", flow_dict.get("packets", 1))) or 1.0)
    tot_bytes = float(flow_dict.get("TotBytes", flow_dict.get("total_bytes", flow_dict.get("length", 64))) or 64.0)
    src_bytes = float(flow_dict.get("SrcBytes", flow_dict.get("src_bytes", tot_bytes * 0.5)) or (tot_bytes * 0.5))
    dst_bytes = max(0.0, tot_bytes - src_bytes)

    # 3. Rate & Size Metrics
    dur_denom = dur if dur > 1e-4 else 1e-4
    bytes_per_sec = tot_bytes / dur_denom
    packets_per_sec = tot_pkts / dur_denom
    avg_pkt_size = tot_bytes / max(1.0, tot_pkts)

    # 4. Protocol Flags
    proto = str(flow_dict.get("Proto", flow_dict.get("protocol", "tcp"))).lower()
    is_tcp = 1.0 if "tcp" in proto else 0.0
    is_udp = 1.0 if "udp" in proto else 0.0
    is_icmp = 1.0 if "icmp" in proto else 0.0

    # 5. Port Categories
    dport_raw = str(flow_dict.get("Dport", flow_dict.get("dst_port", "0")))
    try:
        if dport_raw.startswith("0x") or dport_raw.startswith("0X"):
            dport = int(dport_raw, 16)
        else:
            dport = int(dport_raw)
    except Exception:
        dport = 0

    is_dns = 1.0 if dport == 53 or flow_dict.get("dns_query") else 0.0
    is_web = 1.0 if dport in [80, 443, 8080, 8443] else 0.0
    is_lateral = 1.0 if dport in [445, 139, 389, 636, 88, 3389] else 0.0

    # 6. Destination Topology
    dst_ip = str(flow_dict.get("DstAddr", flow_dict.get("dst_ip", "")))
    is_internal = 1.0 if (dst_ip.startswith("10.") or dst_ip.startswith("192.168.") or dst_ip.startswith("172.") or dst_ip.startswith("147.32.")) else 0.0

    # 7. Scan / SYN / Small Packet indicators
    tcp_flags = flow_dict.get("tcp_flags") or {}
    is_syn = 1.0 if (isinstance(tcp_flags, dict) and tcp_flags.get("SYN")) or "s" in str(flow_dict.get("State", "")).lower() or (tot_pkts <= 2 and dur < 0.01) else 0.0

    # Assemble and apply log1p scaling to large continuous values for neural network stability
    vec = [
        np.log1p(dur),
        np.log1p(tot_pkts),
        np.log1p(tot_bytes),
        np.log1p(src_bytes),
        np.log1p(dst_bytes),
        np.log1p(bytes_per_sec),
        np.log1p(packets_per_sec),
        avg_pkt_size / 1500.0,  # normalized by MTU
        is_tcp,
        is_udp,
        is_icmp,
        is_dns,
        is_web,
        is_lateral,
        is_internal,
        is_syn,
    ]
    return np.array(vec, dtype=np.float32)

def extract_features_batch(df: pd.DataFrame) -> np.ndarray:
    """Extract feature matrix for a pandas dataframe of flows."""
    rows = []
    for _, row in df.iterrows():
        rows.append(extract_flow_features(row))
    return np.vstack(rows)
