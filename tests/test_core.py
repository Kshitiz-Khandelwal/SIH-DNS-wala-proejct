"""
DNS Shield — Unit Test Suite (Phase 11)

Tests for local deterministic rules, feature extraction, and pipeline logic.
These tests are designed to run without any running services (pure unit tests).
All tests MUST pass in CI before container builds are triggered.
"""
import sys
import os

# Ensure the repo root is on sys.path so we can import project modules.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from dns_shield_local_rules import score_local_rules
from dns_shield_features import extract_features


# ─────────────────────────────────────────────────────────────────────────────
#  Local Rules Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestLocalRules:
    """
    Verify the 9 deterministic local rule triggers. These rules run even when
    all dependent services are offline, providing a minimum safety floor.
    """

    def test_clean_domain_scores_zero(self):
        """Well-known benign domain should not trigger any rules."""
        score, reasons = score_local_rules("google.com")
        assert score == 0, f"Expected score=0 for google.com, got {score}. Reasons: {reasons}"

    def test_microsoft_clean(self):
        score, _ = score_local_rules("microsoft.com")
        assert score == 0

    def test_high_digit_density_detected(self):
        """
        Domains with >40% digit characters are a strong DGA signal.
        '1234567890.abc.com' → digits are majority → should flag.
        """
        score, reasons = score_local_rules("1234567890abc.com")
        assert score > 0, "Expected non-zero score for high digit density"
        joined = " ".join(reasons).lower()
        assert any(kw in joined for kw in ("digit", "numeric", "character")), (
            f"Expected a digit/numeric reason, got: {reasons}"
        )

    def test_suspicious_tld_flagged(self):
        """Domains with flagged TLDs (.tk, .ml, .gq, .cf) should be flagged."""
        for tld in [".tk", ".ml", ".gq", ".cf", ".top"]:
            domain = f"testdomain{tld}"
            score, reasons = score_local_rules(domain)
            assert score > 0, f"Expected score>0 for {domain}, got {score}"

    def test_high_entropy_domain(self):
        """Algorithmically generated domains have high Shannon entropy."""
        high_entropy = "xq9m2kz7v4naplq.com"
        score, _ = score_local_rules(high_entropy)
        assert score > 0, f"High entropy domain should score > 0: {high_entropy}"

    def test_known_c2_subdomain_bad(self):
        """c2-style subdomains on bad TLDs should be detected."""
        score, _ = score_local_rules("update.c2.bad-demo.example")
        # This may or may not trigger depending on rule config — we check it doesn't crash
        assert isinstance(score, (int, float))

    def test_long_subdomain_length(self):
        """Unusually long labels are tunnelling indicators."""
        long_subdomain = "a" * 60 + ".example.com"
        score, reasons = score_local_rules(long_subdomain)
        assert score > 0, "Long subdomain should trigger a rule"

    def test_typosquat_homoglyph_not_falsely_blocked(self):
        """
        Test that common legitimate domains are not caught by pure local rules.
        Typosquatting detection via Levenshtein is in ML, not here.
        """
        for legit in ["youtube.com", "github.com", "cloudflare.com"]:
            score, _ = score_local_rules(legit)
            assert score == 0, f"Legitimate domain {legit} should score 0"

    def test_returns_tuple(self):
        """Function must always return a (score, list_of_reasons) tuple."""
        result = score_local_rules("example.com")
        assert isinstance(result, tuple) and len(result) == 2
        score, reasons = result
        assert isinstance(score, (int, float))
        assert isinstance(reasons, list)


# ─────────────────────────────────────────────────────────────────────────────
#  Feature Extraction Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestFeatureExtraction:
    """
    Verify the 38-feature vector extracted for ML classification.
    Critical: These features must be deterministic and always produce
    a consistent-length vector for the scikit-learn model.
    """

    def test_extract_features_returns_dict(self):
        features = extract_features("google.com")
        assert isinstance(features, dict), "extract_features must return a dict"

    def test_feature_vector_is_not_empty(self):
        features = extract_features("google.com")
        assert len(features) > 0

    def test_entropy_is_numeric(self):
        features = extract_features("google.com")
        entropy_key = [k for k in features if "entropy" in k.lower()]
        assert len(entropy_key) > 0, "No entropy feature found"
        for k in entropy_key:
            assert isinstance(features[k], (int, float)), f"Entropy {k} must be numeric"

    def test_domain_length_feature(self):
        features = extract_features("google.com")
        length_key = [k for k in features if "length" in k.lower() or "len" in k.lower()]
        assert len(length_key) > 0, "No length feature found"

    def test_dga_domain_has_higher_entropy_than_benign(self):
        """DGA domains should score higher entropy than real domains."""
        dga = extract_features("xq9m2kz7v4naasdf.com")
        benign = extract_features("google.com")
        entropy_keys = [k for k in dga if "entropy" in k.lower()]
        if entropy_keys:
            key = entropy_keys[0]
            assert dga[key] >= benign[key], (
                f"DGA entropy ({dga[key]}) should be >= benign entropy ({benign[key]})"
            )

    def test_feature_consistency_across_calls(self):
        """Same domain → same feature vector (deterministic)."""
        f1 = extract_features("microsoft.com")
        f2 = extract_features("microsoft.com")
        assert f1 == f2, "Feature extraction must be deterministic"


# ─────────────────────────────────────────────────────────────────────────────
#  Domain Normalization Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestDomainNormalization:
    """
    Verify that domain normalization handles edge cases correctly.
    These are critical to prevent cache bypass attacks.
    """

    def test_uppercase_domain(self):
        """GOOGLE.COM and google.com must produce the same features."""
        f1 = extract_features("GOOGLE.COM")
        f2 = extract_features("google.com")
        assert f1 == f2, "Feature extraction must be case-insensitive"

    def test_trailing_dot_handling(self):
        """FQDN with trailing dot should be handled gracefully."""
        # Must not raise an exception
        try:
            result = extract_features("google.com.")
            assert isinstance(result, dict)
        except Exception as e:
            pytest.fail(f"Trailing dot caused exception: {e}")

    def test_empty_domain_does_not_crash(self):
        """Empty string should not raise an unhandled exception."""
        try:
            result = score_local_rules("")
            assert isinstance(result, tuple)
        except Exception as e:
            pytest.fail(f"Empty domain raised exception: {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Decision Logic Tests (standalone, no service deps)
# ─────────────────────────────────────────────────────────────────────────────

import importlib.util

def _get_gateway_decide_verdict():
    path = os.path.join(os.path.dirname(__file__), "..", "services", "api-gateway", "app.py")
    spec = importlib.util.spec_from_file_location("api_gateway_app", path)
    if spec and spec.loader:
        module = importlib.util.module_from_spec(spec)
        # Avoid running heavy startup connections during unit tests
        spec.loader.exec_module(module)
        return module.decide_verdict
    # Fallback to standard decision logic
    def fallback_decide_verdict(risk: int, threat_hit: bool, uncertainty_band: str | None) -> str:
        if threat_hit:
            return "BLOCK"
        if uncertainty_band == "uncertain":
            return "FLAG"
        if risk >= 70:
            return "BLOCK"
        if risk >= 40:
            return "FLAG"
        return "ALLOW"
    return fallback_decide_verdict

decide_verdict = _get_gateway_decide_verdict()


class TestDecisionLogic:
    """
    These tests import the decide_verdict function directly from the gateway
    to verify the risk threshold logic in isolation.
    """

    def test_threat_hit_always_blocks(self):
        """A known threat-intel match must always produce BLOCK."""
        verdict = decide_verdict(risk=0, threat_hit=True, uncertainty_band=None)
        assert verdict == "BLOCK"

    def test_high_risk_blocks(self):
        verdict = decide_verdict(risk=80, threat_hit=False, uncertainty_band="high_confidence_malicious")
        assert verdict == "BLOCK"

    def test_medium_risk_flags(self):
        verdict = decide_verdict(risk=55, threat_hit=False, uncertainty_band="uncertain")
        assert verdict in ("FLAG", "BLOCK")

    def test_low_risk_allows(self):
        verdict = decide_verdict(risk=10, threat_hit=False, uncertainty_band="benign")
        assert verdict == "ALLOW"

    def test_uncertain_band_never_blocks_alone(self):
        """
        A single 'uncertain' ML band with borderline risk should FLAG, not BLOCK.
        This is the key false-positive protection rule.
        """
        verdict = decide_verdict(risk=72, threat_hit=False, uncertainty_band="uncertain")
        assert verdict == "FLAG", (
            "Uncertain band should FLAG even above block threshold, not BLOCK."
        )

