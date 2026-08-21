"""
DNS Shield — Demo Script Unit Tests (Phase 11)
Tests for the 6-phase attack demonstration module utilities.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest


class TestDemoUtils:
    """Verify that demo utility helpers work without a live API."""

    def test_read_lines_benign(self):
        """benign.txt must exist and contain at least 5 domains."""
        from demo.demo_utils import read_lines
        path = os.path.join(os.path.dirname(__file__), "..", "demo", "domain_lists", "benign.txt")
        lines = read_lines(path)
        assert len(lines) >= 5, f"Expected >=5 benign domains, got {len(lines)}"

    def test_read_lines_dga(self):
        from demo.demo_utils import read_lines
        path = os.path.join(os.path.dirname(__file__), "..", "demo", "domain_lists", "dga_burst.txt")
        lines = read_lines(path)
        assert len(lines) >= 5

    def test_read_lines_typosquats(self):
        from demo.demo_utils import read_lines
        path = os.path.join(os.path.dirname(__file__), "..", "demo", "domain_lists", "typosquats.txt")
        lines = read_lines(path)
        assert len(lines) >= 5

    def test_domain_lists_no_empty_lines(self):
        """All domain list files must not contain blank entries."""
        from demo.demo_utils import read_lines
        base = os.path.join(os.path.dirname(__file__), "..", "demo", "domain_lists")
        for filename in ["benign.txt", "dga_burst.txt", "typosquats.txt", "tunnelling.txt"]:
            path = os.path.join(base, filename)
            lines = read_lines(path)
            for line in lines:
                assert line.strip(), f"Empty line in {filename}: '{line}'"

    def test_expected_outputs_exist(self):
        """alert_sample.json and xai_sample.json must be valid JSON."""
        import json
        base = os.path.join(os.path.dirname(__file__), "..", "demo", "expected_outputs")
        for filename in ["alert_sample.json", "xai_sample.json"]:
            path = os.path.join(base, filename)
            assert os.path.exists(path), f"Missing: {filename}"
            with open(path) as f:
                data = json.load(f)
            assert isinstance(data, dict), f"{filename} must be a JSON object"

    def test_alert_sample_has_required_keys(self):
        """The alert sample must have verdict, domain, and pipeline fields."""
        import json
        path = os.path.join(os.path.dirname(__file__), "..", "demo", "expected_outputs", "alert_sample.json")
        with open(path) as f:
            data = json.load(f)
        for key in ("verdict", "domain", "pipeline"):
            assert key in data, f"alert_sample.json missing required key: {key}"

    def test_xai_sample_has_contributors(self):
        """The XAI sample must contain top_contributors."""
        import json
        path = os.path.join(os.path.dirname(__file__), "..", "demo", "expected_outputs", "xai_sample.json")
        with open(path) as f:
            data = json.load(f)
        assert "top_contributors" in data
        assert len(data["top_contributors"]) >= 1
