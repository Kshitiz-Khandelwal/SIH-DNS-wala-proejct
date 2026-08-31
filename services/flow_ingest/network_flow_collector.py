"""
DNS Shield X-Forecast — Network Flow Collector & Temporal Session Buffer
========================================================================
Captures, aggregates, and computes statistical metrics on 5-tuple network flows
(Src IP, Dst IP, Src Port, Dst Port, Protocol) along with DNS query correlation.
Maintains a 15-minute sliding window temporal buffer for sequential attack forecasting.
"""

import time
import math
import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Tuple, Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("flow-collector")


@dataclass
class FlowPacket:
    timestamp: float
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str  # TCP, UDP, ICMP, DNS
    length: int
    tcp_flags: Dict[str, bool] = field(default_factory=dict)
    dns_query: Optional[str] = None
    dns_qtype: Optional[str] = None


@dataclass
class FlowRecord:
    flow_id: str
    src_ip: str
    dst_ip: str
    src_port: int
    dst_port: int
    protocol: str
    start_time: float
    last_time: float
    duration: float = 0.0
    packet_count: int = 0
    total_bytes: int = 0
    fwd_packets: int = 0
    bwd_packets: int = 0
    fwd_bytes: int = 0
    bwd_bytes: int = 0
    syn_count: int = 0
    ack_count: int = 0
    fin_count: int = 0
    rst_count: int = 0
    dns_queries: List[str] = field(default_factory=list)
    packet_lengths: List[int] = field(default_factory=list)
    inter_arrival_times: List[float] = field(default_factory=list)
    
    def compute_features(self) -> Dict[str, float]:
        """Compute statistical feature vector used for ML and forecasting."""
        self.duration = max(0.001, self.last_time - self.start_time)
        bytes_per_sec = self.total_bytes / self.duration
        pkts_per_sec = self.packet_count / self.duration
        
        # Inter-arrival time stats
        iat_mean = 0.0
        iat_std = 0.0
        if len(self.inter_arrival_times) > 0:
            iat_mean = sum(self.inter_arrival_times) / len(self.inter_arrival_times)
            variance = sum((x - iat_mean) ** 2 for x in self.inter_arrival_times) / len(self.inter_arrival_times)
            iat_std = math.sqrt(variance)
            
        # Packet length stats
        len_mean = 0.0
        len_std = 0.0
        if len(self.packet_lengths) > 0:
            len_mean = sum(self.packet_lengths) / len(self.packet_lengths)
            variance = sum((x - len_mean) ** 2 for x in self.packet_lengths) / len(self.packet_lengths)
            len_std = math.sqrt(variance)

        # Fwd/Bwd byte ratio
        fwd_bwd_ratio = float(self.fwd_bytes) / max(1.0, float(self.bwd_bytes))
        
        # Syn to Ack ratio (Scan detection)
        syn_ratio = float(self.syn_count) / max(1.0, float(self.packet_count))
        rst_ratio = float(self.rst_count) / max(1.0, float(self.packet_count))

        return {
            "duration": round(self.duration, 4),
            "packet_count": self.packet_count,
            "total_bytes": self.total_bytes,
            "bytes_per_sec": round(bytes_per_sec, 2),
            "pkts_per_sec": round(pkts_per_sec, 2),
            "iat_mean": round(iat_mean, 6),
            "iat_std": round(iat_std, 6),
            "len_mean": round(len_mean, 2),
            "len_std": round(len_std, 2),
            "fwd_bwd_ratio": round(fwd_bwd_ratio, 3),
            "syn_ratio": round(syn_ratio, 3),
            "rst_ratio": round(rst_ratio, 3),
            "dns_query_count": len(self.dns_queries),
        }


class TemporalHostSession:
    """Maintains a sliding temporal sequence of network events for a specific host."""
    def __init__(self, host_ip: str, window_seconds: float = 900.0):  # 15 minutes window
        self.host_ip = host_ip
        self.window_seconds = window_seconds
        self.events: deque = deque()
        self.stage_history: deque = deque(maxlen=50)
        self.last_forecast: Dict[str, Any] = {}

    def add_event(self, flow: FlowRecord):
        now = time.time()
        self.events.append((now, flow))
        self.evict_stale(now)

    def evict_stale(self, current_time: float):
        cutoff = current_time - self.window_seconds
        while self.events and self.events[0][0] < cutoff:
            self.events.popleft()

    def get_event_sequence(self) -> List[FlowRecord]:
        self.evict_stale(time.time())
        return [flow for _, flow in self.events]

    def get_summary_metrics(self) -> Dict[str, Any]:
        flows = self.get_event_sequence()
        if not flows:
            return {
                "active_flows": 0,
                "total_packets": 0,
                "total_bytes": 0,
                "unique_dst_ips": 0,
                "unique_dst_ports": 0,
                "syn_flood_indicator": 0.0,
                "dns_query_rate": 0.0
            }
        
        dst_ips = set(f.dst_ip for f in flows)
        dst_ports = set(f.dst_port for f in flows)
        total_syns = sum(f.syn_count for f in flows)
        total_pkts = sum(f.packet_count for f in flows)
        total_dns = sum(len(f.dns_queries) for f in flows)

        return {
            "active_flows": len(flows),
            "total_packets": total_pkts,
            "total_bytes": sum(f.total_bytes for f in flows),
            "unique_dst_ips": len(dst_ips),
            "unique_dst_ports": len(dst_ports),
            "syn_flood_indicator": round(total_syns / max(1, total_pkts), 3),
            "dns_query_rate": round(total_dns / (self.window_seconds / 60.0), 2)
        }


class NetworkFlowCollector:
    """Master Collector managing flow aggregation and host session timelines."""
    def __init__(self, session_window_sec: float = 900.0):
        self.active_flows: Dict[str, FlowRecord] = {}
        self.host_sessions: Dict[str, TemporalHostSession] = defaultdict(
            lambda: TemporalHostSession("", session_window_sec)
        )
        self.session_window_sec = session_window_sec
        logger.info(f"Initialized Network Flow Collector (Window: {session_window_sec}s)")

    def _get_flow_key(self, src_ip: str, dst_ip: str, src_port: int, dst_port: int, protocol: str) -> str:
        # Standardize bidirectional flow key
        if (src_ip, src_port) > (dst_ip, dst_port):
            return f"{protocol}:{dst_ip}:{dst_port}<->{src_ip}:{src_port}"
        return f"{protocol}:{src_ip}:{src_port}<->{dst_ip}:{dst_port}"

    def ingest_packet(
        self,
        src_ip: str,
        dst_ip: str,
        src_port: int,
        dst_port: int,
        protocol: str,
        length: int,
        tcp_flags: Optional[Dict[str, bool]] = None,
        dns_query: Optional[str] = None,
        timestamp: Optional[float] = None
    ) -> FlowRecord:
        """Process an individual network packet into the stateful flow tracker."""
        now = timestamp or time.time()
        flags = tcp_flags or {}
        flow_key = self._get_flow_key(src_ip, dst_ip, src_port, dst_port, protocol)

        if flow_key not in self.active_flows:
            record = FlowRecord(
                flow_id=flow_key,
                src_ip=src_ip,
                dst_ip=dst_ip,
                src_port=src_port,
                dst_port=dst_port,
                protocol=protocol,
                start_time=now,
                last_time=now
            )
            self.active_flows[flow_key] = record
        else:
            record = self.active_flows[flow_key]
            iat = now - record.last_time
            if iat >= 0:
                record.inter_arrival_times.append(iat)
            record.last_time = now

        # Update metrics
        record.packet_count += 1
        record.total_bytes += length
        record.packet_lengths.append(length)

        if src_ip == record.src_ip:
            record.fwd_packets += 1
            record.fwd_bytes += length
        else:
            record.bwd_packets += 1
            record.bwd_bytes += length

        if flags.get("SYN"):
            record.syn_count += 1
        if flags.get("ACK"):
            record.ack_count += 1
        if flags.get("FIN"):
            record.fin_count += 1
        if flags.get("RST"):
            record.rst_count += 1

        if dns_query:
            record.dns_queries.append(dns_query)

        # Update host session buffers
        if src_ip not in self.host_sessions:
            self.host_sessions[src_ip] = TemporalHostSession(src_ip, self.session_window_sec)
        self.host_sessions[src_ip].add_event(record)

        return record

    def get_host_timeline(self, host_ip: str) -> List[Dict[str, Any]]:
        """Retrieve all active flows and statistical vector for a host."""
        if host_ip not in self.host_sessions:
            return []
        session = self.host_sessions[host_ip]
        flows = session.get_event_sequence()
        return [
            {
                "flow_id": f.flow_id,
                "src_ip": f.src_ip,
                "dst_ip": f.dst_ip,
                "dst_port": f.dst_port,
                "protocol": f.protocol,
                "start_time": f.start_time,
                "last_time": f.last_time,
                "dns_queries": list(f.dns_queries),
                "total_bytes": f.total_bytes,
                "syn_count": f.syn_count,
                "features": f.compute_features()
            }
            for f in flows
        ]

    def reset_host_session(self, host_ip: str):
        """Cleanly purge all session buffers and active flow records for a host."""
        if host_ip in self.host_sessions:
            del self.host_sessions[host_ip]
        keys_to_del = [k for k, f in self.active_flows.items() if f.src_ip == host_ip or f.dst_ip == host_ip]
        for k in keys_to_del:
            del self.active_flows[k]

    def get_all_active_hosts(self) -> List[str]:
        return list(self.host_sessions.keys())


# Singleton instance for application-wide use
flow_collector = NetworkFlowCollector()
