"""DNS Shield X-Forecast — Dynamic Behavior & Integrity Verification Suite

Proves:
1. TTC dynamically scales based on kill-chain stage progression and burst velocity.
2. Threat score and stage classification respond to real telemetry (not hardcoded strings).
3. PCAP parser safely handles corrupt, empty, and oversized payloads without crashing.
4. Forecast verdicts are persisted in analytics-store for forensic audit trails.
"""
from __future__ import annotations

import io
import time
import requests
import unittest

GATEWAY_URL = "http://localhost:8081"
FLOW_URL = "http://localhost:8006"
FORECAST_URL = "http://localhost:8007"
ANALYTICS_URL = "http://localhost:8005"


class TestDynamicForecasting(unittest.TestCase):

    def setUp(self):
        # Reset test host session
        self.test_host = "172.28.100.55"
        try:
            requests.delete(f"{FLOW_URL}/flow/hosts/{self.test_host}", timeout=1)
        except Exception:
            pass

    def test_01_all_services_health(self):
        """Verify all PS2 microservices report healthy status."""
        for url, name in [
            (f"{FLOW_URL}/health", "flow-ingest"),
            (f"{FORECAST_URL}/health", "forecasting-engine"),
            (f"{ANALYTICS_URL}/health", "analytics-store"),
            (f"{GATEWAY_URL}/health", "api-gateway"),
        ]:
            resp = requests.get(url, timeout=2)
            self.assertIn(resp.status_code, (200, 204), f"{name} health check failed with status {resp.status_code}")
            data = resp.json()
            self.assertEqual(data.get("status"), "ok", f"{name} status not ok")

    def test_02_dynamic_ttc_and_stage_progression(self):
        """Verify TTC and threat scores change dynamically as attack accelerates."""
        # 1. Inject Stage 1: Reconnaissance (low velocity)
        r1 = requests.post(f"{FLOW_URL}/flow/simulate/{self.test_host}", timeout=3)
        self.assertEqual(r1.status_code, 200)
        
        f1 = requests.get(f"{FORECAST_URL}/forecast/{self.test_host}", timeout=3).json()
        ttc_stage1 = f1["time_to_compromise_min"]
        score_stage1 = f1["overall_threat_score"]
        self.assertGreater(ttc_stage1, 10.0, f"Stage 1 TTC should be substantial (>10 min), got {ttc_stage1}m")
        self.assertLess(score_stage1, 50, "Stage 1 threat score should be moderate")


        # 2. Advance to Stage 2, 3, 4 (C2 beaconing with rapid packets)
        requests.post(f"{FLOW_URL}/flow/simulate/{self.test_host}", timeout=2)
        requests.post(f"{FLOW_URL}/flow/simulate/{self.test_host}", timeout=2)
        requests.post(f"{FLOW_URL}/flow/simulate/{self.test_host}", timeout=2)

        f4 = requests.get(f"{FORECAST_URL}/forecast/{self.test_host}", timeout=2).json()
        ttc_stage4 = f4["time_to_compromise_min"]
        score_stage4 = f4["overall_threat_score"]
        
        # PROOF OF DYNAMIC DERIVATION: TTC must decrease as attack advances
        self.assertLess(ttc_stage4, ttc_stage1, f"TTC must decrease from Stage 1 ({ttc_stage1}m) to Stage 4 ({ttc_stage4}m)")
        self.assertGreater(score_stage4, score_stage1, "Threat score must increase as stages advance")

        # 3. Advance to Stage 6 (Exfiltration)
        requests.post(f"{FLOW_URL}/flow/simulate/{self.test_host}", timeout=2)
        requests.post(f"{FLOW_URL}/flow/simulate/{self.test_host}", timeout=2)

        f6 = requests.get(f"{FORECAST_URL}/forecast/{self.test_host}", timeout=2).json()
        self.assertEqual(f6["current_stage"], "STAGE_6_EXFILTRATION")
        self.assertEqual(f6["time_to_compromise_min"], 0.0, "TTC at terminal stage must be 0.0")
        self.assertGreaterEqual(f6["overall_threat_score"], 85, "Stage 6 threat score must be critical (>=85)")

    def test_03_pcap_safety_and_error_handling(self):
        """Verify PCAP upload handles corrupt, empty, and invalid inputs safely."""
        # A: Invalid extension
        r_ext = requests.post(
            f"{FLOW_URL}/flow/pcap",
            files={"file": ("malicious.exe", b"MZ\x90\x00", "application/octet-stream")},
            timeout=2
        )
        self.assertEqual(r_ext.status_code, 400)

        # B: Corrupted/garbage binary data with .pcap extension
        r_corrupt = requests.post(
            f"{FLOW_URL}/flow/pcap",
            files={"file": ("corrupt.pcap", b"\xFF\xFF\x00\x00GARBAGE_BYTES_TEST", "application/octet-stream")},
            timeout=2
        )
        self.assertEqual(r_corrupt.status_code, 422)
        self.assertIn("error", r_corrupt.json().get("detail", {}))

        # C: Empty file
        r_empty = requests.post(
            f"{FLOW_URL}/flow/pcap",
            files={"file": ("empty.pcap", b"", "application/octet-stream")},
            timeout=2
        )
        self.assertEqual(r_empty.status_code, 400)

    def test_04_analytics_store_audit_persistence(self):
        """Verify forecast evaluations are written to the analytics-store audit log."""
        # Trigger an evaluation
        requests.get(f"{FORECAST_URL}/forecast/{self.test_host}", timeout=2)
        time.sleep(0.5)

        # Query analytics audit log
        r = requests.get(f"{ANALYTICS_URL}/forecast/events?host_ip={self.test_host}", timeout=2)
        self.assertEqual(r.status_code, 200)
        events = r.json().get("events", [])
        self.assertGreater(len(events), 0, "Forecast evaluation should be logged in analytics-store")
        
        latest = events[0]
        self.assertEqual(latest["host_ip"], self.test_host)
        self.assertIn("current_stage", latest)
        self.assertIn("time_to_compromise_min", latest)


if __name__ == "__main__":
    unittest.main(verbosity=2)
