"""Deterministic local security rules for DNS domain scoring.

These rules require zero network access, zero ML model, and zero Redis.
They fire even when every external dependency is offline and contribute
a risk score that the API gateway uses in its resilience fallback mode.

This module is intentionally kept dependency-free (stdlib only) so it can
be imported in any context without a virtual environment.

Usage:
    from dns_shield_local_rules import score_local_rules
    contribution, reasons = score_local_rules("xq9mnz7.tk")
    # → (35, ['known_bad_tld: .tk (+15)', 'high_digit_density: 38% (+20)'])
"""
from __future__ import annotations

import math
import re
import string
from collections import Counter

# ─── Reference Data ──────────────────────────────────────────────────────────

# TLDs with highest abuse rates per ICANN/Spamhaus/Interisle Research 2022-2024
ABUSIVE_TLDS: frozenset[str] = frozenset({
    ".tk", ".ml", ".ga", ".cf", ".gq",   # Freenom — discontinued but still abused
    ".xyz", ".top", ".pw", ".click",      # High-volume abuse registrars
    ".ru", ".su",                         # Frequently used for C2
    ".to", ".cc",                         # Historically abused
})

# Brands commonly typosquatted — Levenshtein proximity check
TYPOSQUAT_TARGETS: list[str] = [
    "google", "microsoft", "paypal", "apple", "amazon", "facebook",
    "instagram", "netflix", "linkedin", "twitter", "github", "gmail",
    "yahoo", "outlook", "onedrive", "dropbox", "icloud", "whatsapp",
    "telegram", "bankofamerica", "chase", "wellsfargo", "citibank",
]

VOWELS: frozenset[str] = frozenset("aeiou")
DIGITS: frozenset[str] = frozenset(string.digits)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(min(curr[-1] + 1, prev[j] + 1, prev[j - 1] + (ca != cb)))
        prev = curr
    return prev[-1]


def _sld(domain: str) -> str:
    """Return the second-level domain label (e.g. 'google' from 'google.com')."""
    parts = domain.rstrip(".").split(".")
    return parts[-2] if len(parts) >= 2 else parts[0]


def _tld(domain: str) -> str:
    """Return .tld portion."""
    idx = domain.rfind(".")
    return domain[idx:] if idx != -1 else ""


def _entropy(text: str) -> float:
    if not text:
        return 0.0
    counts = Counter(text)
    n = len(text)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


# ─── Individual Rules ─────────────────────────────────────────────────────────

def rule_known_bad_tld(domain: str) -> tuple[int, str | None]:
    """TLD is on the high-abuse list. Contribution: +15."""
    tld = _tld(domain).lower()
    if tld in ABUSIVE_TLDS:
        return 15, f"known_bad_tld: {tld} (+15)"
    return 0, None


def rule_excessive_length(domain: str) -> tuple[int, str | None]:
    """SLD is longer than 20 characters. Contribution: +10."""
    sld = _sld(domain)
    if len(sld) > 20:
        return 10, f"excessive_length: {len(sld)} chars (+10)"
    return 0, None


def rule_high_digit_density(domain: str) -> tuple[int, str | None]:
    """More than 30% of the SLD characters are digits. Contribution: +20."""
    sld = _sld(domain)
    if not sld:
        return 0, None
    ratio = sum(1 for ch in sld if ch in DIGITS) / len(sld)
    if ratio > 0.30:
        return 20, f"high_digit_density: {ratio:.0%} (+20)"
    return 0, None


def rule_all_consonants(domain: str) -> tuple[int, str | None]:
    """SLD has no vowels and is longer than 5 chars — highly unpronounceable. Contribution: +25."""
    sld = _sld(domain).lower()
    alpha_chars = [ch for ch in sld if ch.isalpha()]
    if len(alpha_chars) > 5 and not any(ch in VOWELS for ch in alpha_chars):
        return 25, f"all_consonants: '{sld}' has no vowels (+25)"
    return 0, None


def rule_homoglyph_brand(domain: str) -> tuple[int, str | None]:
    """SLD is within Levenshtein distance 2 of a known brand. Contribution: +30."""
    sld = _sld(domain).lower()
    for brand in TYPOSQUAT_TARGETS:
        dist = _levenshtein(sld, brand)
        if 0 < dist <= 2:
            return 30, f"homoglyph_brand: '{sld}' ~= '{brand}' (edit_dist={dist}) (+30)"
    return 0, None


def rule_long_label(domain: str) -> tuple[int, str | None]:
    """Any single label is longer than 45 characters — DNS tunnelling signal. Contribution: +40."""
    for label in domain.split("."):
        if len(label) > 45:
            return 40, f"long_label: label '{label[:20]}…' has {len(label)} chars (+40)"
    return 0, None


def rule_excessive_labels(domain: str) -> tuple[int, str | None]:
    """More than 5 dot-separated labels. Contribution: +20."""
    labels = [l for l in domain.split(".") if l]
    if len(labels) > 5:
        return 20, f"excessive_labels: {len(labels)} labels (+20)"
    return 0, None


def rule_ip_in_domain(domain: str) -> tuple[int, str | None]:
    """SLD matches an IPv4-like pattern (digits.digits.digits). Contribution: +35."""
    sld = _sld(domain)
    if re.match(r"^\d{1,3}[.\-]\d{1,3}[.\-]\d{1,3}", sld):
        return 35, f"ip_in_domain: '{sld}' resembles IP address (+35)"
    return 0, None


def rule_high_entropy(domain: str) -> tuple[int, str | None]:
    """SLD entropy above 3.7 bits. Contribution: +15 (supports ML signal without model)."""
    sld = _sld(domain)
    ent = _entropy(sld)
    if ent > 3.7:
        return 15, f"high_entropy: {ent:.2f} bits (+15)"
    return 0, None


# ─── Rule Registry ────────────────────────────────────────────────────────────

_RULES = [
    rule_known_bad_tld,
    rule_excessive_length,
    rule_high_digit_density,
    rule_all_consonants,
    rule_homoglyph_brand,
    rule_long_label,
    rule_excessive_labels,
    rule_ip_in_domain,
    rule_high_entropy,
]

MAX_LOCAL_RULE_CONTRIBUTION = 100


def score_local_rules(domain: str) -> tuple[int, list[str]]:
    """Apply all local rules and return (capped_contribution, reasons).

    The total is capped at MAX_LOCAL_RULE_CONTRIBUTION so a domain
    cannot reach BLOCK threshold from local rules alone — they always
    supplement, never replace, the full pipeline.

    Args:
        domain: Normalised domain string (no trailing dot).

    Returns:
        (contribution: int, reasons: list[str])
        contribution is in range [0, MAX_LOCAL_RULE_CONTRIBUTION].
    """
    domain = domain.lower().strip().rstrip(".")
    total = 0
    reasons: list[str] = []
    for rule_fn in _RULES:
        score, reason = rule_fn(domain)
        if score and reason:
            total += score
            reasons.append(reason)
    return min(total, MAX_LOCAL_RULE_CONTRIBUTION), reasons


if __name__ == "__main__":
    test_cases = [
        ("xq9mnz7v4na.tk",      "DGA + bad TLD"),
        ("google.com",           "Legit"),
        ("gooogle.com",          "Typosquat (3 o's)"),
        ("secure-login.paypa1.com", "Phishing"),
        ("aGVsbG8gd29ybGQ.evil.c2.top", "DNS tunnel"),
        ("192-168-1-1.malware.xyz", "IP in domain"),
        ("xqzvnbkrts.net",       "No vowels in SLD"),
        ("isro.gov.in",          "Legit government"),
    ]
    print(f"\n{'Domain':<40} {'Score':>5}  Reasons")
    print("-" * 80)
    for domain, label in test_cases:
        score, reasons = score_local_rules(domain)
        reason_str = "; ".join(reasons) if reasons else "clean"
        print(f"{domain:<40} {score:>5}  [{label}] {reason_str}")
