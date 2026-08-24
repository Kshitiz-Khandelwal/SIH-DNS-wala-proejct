"""
Unit Tests for DNS Shield X-Forecast — Flow Ingestion, Attack Forecaster & Hardware Relay
Uses standard Python unittest for zero external test runner dependencies.
"""

import os
import sys
import unittest
import time

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.flow_ingest.network_flow_collector import NetworkFlowCollector, FlowRecord
from services.forecasting_engine.attack_forecaster import AttackForecastingEngine, STAGES


class TestAttackForecasting(unittest.TestCase):

    def test_flow_collector_ingestion(self):
        collector = NetworkFlowCollector(session_window_sec=60.0)
        
        # Ingest synthetic packet stream
        pkt1 = collector.ingest_packet(
            src_ip="172.28.0.101",
            dst_ip="192.168.1.1",
            src_port=54321,
            dst_port=53,
            protocol="DNS",
            length=84,
            dns_query="xq9m2kz7v4naplq.top"
        )
        
        self.assertEqual(pkt1.packet_count, 1)
        self.assertEqual(pkt1.total_bytes, 84)
        self.assertEqual(len(pkt1.dns_queries), 1)
        self.assertIn("xq9m2kz7v4naplq.top", pkt1.dns_queries)
        
        # Check host timeline
        timeline = collector.get_host_timeline("172.28.0.101")
        self.assertEqual(len(timeline), 1)
        self.assertEqual(timeline[0]["features"]["total_bytes"], 84)

    def test_attack_forecaster_benign(self):
        forecaster = AttackForecastingEngine()
        
        clean_flows = [
            {
                "features": {"total_bytes": 350, "syn_ratio": 0.05, "dns_query_count": 2, "unique_ports": 1, "iat_mean": 4.5, "c2_heartbeat_regularity": 0.0, "dns_tunnel_markers": 0},
                "dst_port": 53,
                "dst_ip": "1.1.1.1",
                "dns_queries": ["isro.gov.in", "nic.in"]
            }
        ]
        
        result = forecaster.evaluate_host_timeline("10.0.0.12", clean_flows)
        self.assertEqual(result.current_stage, "STAGE_0_BENIGN")
        self.assertLess(result.overall_threat_score, 25)
        self.assertFalse(result.hardware_relay_required)

    def test_attack_forecaster_multi_stage_apt(self):
        forecaster = AttackForecastingEngine()
        
        # Simulated lateral movement + exfiltration flows
        malicious_flows = [
            {
                "features": {"total_bytes": 12000, "syn_ratio": 0.8, "dns_query_count": 45, "unique_ports": 25, "iat_mean": 0.2, "c2_heartbeat_regularity": 0.95, "dns_tunnel_markers": 5},
                "dst_port": 53,
                "dst_ip": "192.168.1.50",
                "dns_queries": ["YWJjZDEyMzQ1Ng==.attacker-c2.net", "c2-beacon.dark-infra.cc"]
            }
        ]
        
        result = forecaster.evaluate_host_timeline("172.28.0.101", malicious_flows)
        self.assertIn(result.current_stage, ["STAGE_4_C2_PERSISTENCE", "STAGE_6_EXFILTRATION"])
        self.assertGreaterEqual(result.overall_threat_score, 70)
        self.assertGreater(result.forecast_horizon_15m.probability, 0.6)
        self.assertGreater(len(result.shap_explanations), 0)
        self.assertTrue(result.hardware_relay_required)


if __name__ == "__main__":
    unittest.main()
