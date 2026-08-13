"""Domain mutation strategies for adversarial evaluation of the DNS lexical classifier.

Each mutator takes a raw malicious domain string and returns a list of variants
that attempt to evade detection by reducing the features the model relies on most
(entropy, digit_ratio, consonant_ratio, n-gram rarity, length).

These are purely offline/synthetic — no live DNS resolution is performed.
"""
from __future__ import annotations

import random
import re
import string
from typing import Callable

VOWELS = set("aeiou")
CONSONANTS = set(string.ascii_lowercase) - VOWELS

# Highest-abuse free TLDs per ICANN/Spamhaus reports — swapped AWAY from these
# to make malicious domains look more legitimate.
ABUSIVE_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".pw", ".click"}
LEGIT_TLDS = [".com", ".net", ".org"]

# Common legitimate-looking prefixes attackers would prepend
LEGIT_PREFIXES = ["mail", "login", "update", "secure", "account", "portal", "cdn", "api", "app"]

# Homoglyph mappings (letter → digit lookalike and vice versa)
HOMOGLYPHS: dict[str, str] = {
    "o": "0", "O": "0", "l": "1", "I": "1", "i": "1",
    "e": "3", "a": "4", "s": "5", "t": "7", "b": "6",
}
REVERSE_HOMOGLYPHS: dict[str, str] = {v: k for k, v in HOMOGLYPHS.items()}


def _sld_and_tld(domain: str) -> tuple[str, str]:
    """Split domain into (everything-before-last-dot, .tld)."""
    parts = domain.rsplit(".", 1)
    if len(parts) == 2:
        return parts[0], "." + parts[1]
    return domain, ""


# ─── Individual Mutators ─────────────────────────────────────────────────────

def mutate_vowel_inject(domain: str) -> list[str]:
    """Insert vowels between consecutive consonants to make SLD more pronounceable.

    Reduces consonant_ratio and lowers entropy slightly.
    xq9mnz7v4na → xaqemnzv4na (approx)
    """
    sld, tld = _sld_and_tld(domain)
    result = []
    for vowel in ("a", "e", "i", "o"):
        new_sld = []
        prev_consonant = False
        for ch in sld:
            if ch.lower() in CONSONANTS:
                if prev_consonant:
                    new_sld.append(vowel)
                new_sld.append(ch)
                prev_consonant = True
            else:
                new_sld.append(ch)
                prev_consonant = False
        mutated = "".join(new_sld) + tld
        if mutated != domain and len(mutated) <= 63:
            result.append(mutated)
    return result[:2]  # cap to avoid explosion


def mutate_digit_remove(domain: str) -> list[str]:
    """Replace digits with phonetically plausible consonants.

    Reduces digit_ratio and longest_digit_run.
    xq9m2kz7v4na → xqnmzkzvna
    """
    digit_to_letter = {"0": "o", "1": "l", "2": "n", "3": "m", "4": "r",
                        "5": "s", "6": "b", "7": "t", "8": "g", "9": "q"}
    sld, tld = _sld_and_tld(domain)
    mutated_sld = "".join(digit_to_letter.get(ch, ch) for ch in sld)
    result = mutated_sld + tld
    return [result] if result != domain else []


def mutate_prefix_legit(domain: str) -> list[str]:
    """Prepend a common English service prefix.

    Injects common n-grams that lower n-gram rarity score.
    xq9mnz7.top → mail-xq9mnz7.top
    """
    sld, tld = _sld_and_tld(domain)
    results = []
    for prefix in LEGIT_PREFIXES[:4]:
        candidate = f"{prefix}-{sld}{tld}"
        if len(candidate) <= 63:
            results.append(candidate)
    return results[:2]


def mutate_tld_swap(domain: str) -> list[str]:
    """Replace abusive TLD with a legitimate-looking one.

    xq9mnz7.tk → xq9mnz7.com
    """
    sld, tld = _sld_and_tld(domain)
    if tld.lower() in ABUSIVE_TLDS:
        return [sld + new_tld for new_tld in LEGIT_TLDS[:2]]
    # Even if already .com, try .net for coverage
    return [sld + ".net"] if tld != ".net" else []


def mutate_length_trim(domain: str) -> list[str]:
    """Trim the SLD to ≤12 characters.

    Reduces length feature and slightly reduces entropy.
    xq9mnz7v4nabcd → xq9mnz7v4na (truncated)
    """
    sld, tld = _sld_and_tld(domain)
    if len(sld) <= 12:
        return []
    trimmed = sld[:12] + tld
    return [trimmed] if trimmed != domain else []


def mutate_hyphen_split(domain: str) -> list[str]:
    """Insert hyphens at midpoint and at consonant clusters to resemble compound words.

    Increases hyphen_ratio which slightly shifts the feature distribution.
    xq9mnz7v4na → xq9m-nz7v4na
    """
    sld, tld = _sld_and_tld(domain)
    if "-" in sld or len(sld) < 6:
        return []
    mid = len(sld) // 2
    results = [sld[:mid] + "-" + sld[mid:] + tld]
    # Also try splitting at first digit run
    match = re.search(r"\d+", sld)
    if match and match.start() > 0:
        pos = match.start()
        results.append(sld[:pos] + "-" + sld[pos:] + tld)
    return [r for r in results if len(r) <= 63 and r != domain][:2]


def mutate_homoglyph_reverse(domain: str) -> list[str]:
    """Reverse homoglyphs: swap digits for look-alike letters in the SLD.

    Reduces digit_ratio while maintaining visual confusion.
    paypa1.com → paypai.com (1→i)
    """
    sld, tld = _sld_and_tld(domain)
    new_sld = "".join(REVERSE_HOMOGLYPHS.get(ch, ch) for ch in sld)
    result = new_sld + tld
    return [result] if result != domain else []


# ─── Registry ────────────────────────────────────────────────────────────────

MUTATORS: dict[str, Callable[[str], list[str]]] = {
    "vowel_inject":       mutate_vowel_inject,
    "digit_remove":       mutate_digit_remove,
    "prefix_legit":       mutate_prefix_legit,
    "tld_swap":           mutate_tld_swap,
    "length_trim":        mutate_length_trim,
    "hyphen_split":       mutate_hyphen_split,
    "homoglyph_reverse":  mutate_homoglyph_reverse,
}


def generate_evasive_candidates(domain: str) -> list[tuple[str, str]]:
    """Apply all mutators and return (mutated_domain, mutation_id) pairs."""
    results: list[tuple[str, str]] = []
    for mutation_id, mutator in MUTATORS.items():
        for variant in mutator(domain):
            results.append((variant, mutation_id))
    return results


if __name__ == "__main__":
    # Quick sanity check
    test_domains = ["xq9mnz7v4na.top", "c2kzx9qbm.tk", "lq3zp89vbcx.net"]
    for d in test_domains:
        print(f"\n{d}:")
        for variant, mutation in generate_evasive_candidates(d):
            print(f"  [{mutation:20s}] -> {variant}")
