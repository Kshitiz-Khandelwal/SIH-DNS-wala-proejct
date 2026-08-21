"""
DNS Shield — Allowlist & Audit Tests (Phase 11)
Tests for the Phase 9 safety controls: allowlists, audit log format.
"""
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest


class TestAllowlists:
    """Verify emergency bypass files exist and are well-formed."""

    def test_domain_allowlist_exists(self):
        path = os.path.join(os.path.dirname(__file__), "..", "data", "dns_shield_allowlist.txt")
        assert os.path.exists(path), "data/dns_shield_allowlist.txt is missing"

    def test_device_allowlist_exists(self):
        path = os.path.join(os.path.dirname(__file__), "..", "data", "device_allowlist.txt")
        assert os.path.exists(path), "data/device_allowlist.txt is missing"

    def test_domain_allowlist_no_blanks(self):
        path = os.path.join(os.path.dirname(__file__), "..", "data", "dns_shield_allowlist.txt")
        with open(path) as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]
        for line in lines:
            assert " " not in line, f"Allowlist entry has spaces: '{line}'"

    def test_device_allowlist_no_blanks(self):
        path = os.path.join(os.path.dirname(__file__), "..", "data", "device_allowlist.txt")
        with open(path) as f:
            lines = [l.strip() for l in f if l.strip() and not l.startswith("#")]
        for line in lines:
            assert " " not in line, f"Device allowlist entry has spaces: '{line}'"


class TestAuditLogFormat:
    """
    Verify that the audit log, if it exists, contains valid JSON-lines entries.
    This test gracefully skips if no audit.log has been written yet.
    """

    def test_audit_log_is_valid_jsonl(self):
        path = os.path.join(os.path.dirname(__file__), "..", "data", "audit.log")
        if not os.path.exists(path):
            pytest.skip("audit.log does not exist yet — skipping (will pass after first quarantine event)")

        with open(path) as f:
            for i, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as e:
                    pytest.fail(f"audit.log line {i} is not valid JSON: {e}\nLine: {line}")

                # Every audit record must have these keys
                for key in ("timestamp", "action", "ip"):
                    assert key in record, f"audit.log line {i} missing '{key}' field"
