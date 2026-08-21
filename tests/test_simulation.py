"""
DNS Shield — Simulation Corpus & Attack Pipeline Unit Tests
Tests that the curated attack simulation corpus is well-formed and has valid metadata.
"""
import sys
import os
import csv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest


class TestSimulationCorpus:
    """Verify that data/attack_simulation_corpus.csv is valid and covers all attack vectors."""

    @pytest.fixture
    def corpus_rows(self):
        path = os.path.join(os.path.dirname(__file__), "..", "data", "attack_simulation_corpus.csv")
        assert os.path.exists(path), "data/attack_simulation_corpus.csv must exist"
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        assert len(rows) >= 10, f"Expected at least 10 simulation domains, found {len(rows)}"
        return rows

    def test_required_headers(self, corpus_rows):
        """Corpus must have all metadata fields."""
        required = [
            "domain", "attack_vector", "expected_verdict", "risk_score",
            "entropy", "consonant_ratio", "digit_ratio", "subdomain_depth",
            "tld_reputation", "mitre_technique", "top_shap_1", "top_shap_2", "analyst_summary"
        ]
        first_row = corpus_rows[0]
        for h in required:
            assert h in first_row, f"Missing column '{h}' in attack_simulation_corpus.csv"

    def test_attack_vectors_represented(self, corpus_rows):
        """All 5 key vectors must be represented."""
        vectors = {row["attack_vector"].lower() for row in corpus_rows}
        assert "benign" in vectors
        assert "dga" in vectors
        assert "typosquatting" in vectors
        assert "tunneling" in vectors
        assert "c2" in vectors

    def test_verdicts_are_valid(self, corpus_rows):
        """Every row must have a valid verdict: ALLOW, FLAG, or BLOCK."""
        valid_verdicts = {"ALLOW", "FLAG", "BLOCK"}
        for row in corpus_rows:
            assert row["expected_verdict"].upper() in valid_verdicts, f"Invalid verdict {row['expected_verdict']} for {row['domain']}"

    def test_scores_in_valid_range(self, corpus_rows):
        """Risk scores must be between 0 and 100."""
        for row in corpus_rows:
            score = int(row["risk_score"])
            assert 0 <= score <= 100, f"Invalid risk score {score} for {row['domain']}"

    def test_benign_domains_score_low(self, corpus_rows):
        """Benign baseline domains must have expected_verdict ALLOW and score <= 40."""
        for row in corpus_rows:
            if row["attack_vector"] == "benign":
                assert row["expected_verdict"] == "ALLOW"
                assert int(row["risk_score"]) <= 40

    def test_malicious_domains_score_high(self, corpus_rows):
        """DGA, Tunneling, and C2 domains must have expected_verdict BLOCK or FLAG with score >= 70."""
        for row in corpus_rows:
            if row["attack_vector"] in {"dga", "tunneling", "c2"}:
                assert row["expected_verdict"] in {"BLOCK", "FLAG"}
                assert int(row["risk_score"]) >= 70
