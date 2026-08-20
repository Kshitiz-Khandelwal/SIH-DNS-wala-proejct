"""Shared lexical feature extraction for DNS Shield models.

This module must be importable both by ml-training/train.py (which builds
FunctionTransformer(domain_features) into the sklearn pipeline) and by
services/ml-inference at load time (because joblib pickles a *reference* to
this function's module path, not its source code -- unpickling a model whose
FunctionTransformer points at a function defined in some script's __main__
will fail in any other process, since that process has a different __main__).

Keeping this in its own top-level module means the pickled reference is
`dns_shield_features.domain_features`, which resolves the same way in
training and in the inference service, as long as this file ships alongside
the artifact / is on both services' PYTHONPATH.
"""
from __future__ import annotations

import math
import os
from collections import Counter

import numpy as np

VOWELS = set("aeiou")

# Typosquatting Feature Setup
BRAND_DICT_PATH = os.path.join(os.path.dirname(__file__), "data", "brand_dictionary.txt")
BRANDS = []
if os.path.exists(BRAND_DICT_PATH):
    with open(BRAND_DICT_PATH, "r", encoding="utf-8") as f:
        BRANDS = [line.strip().lower() for line in f if line.strip()]

def levenshtein(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def damerau_levenshtein(s1: str, s2: str) -> int:
    d = {}
    lenstr1 = len(s1)
    lenstr2 = len(s2)
    for i in range(-1, lenstr1 + 1):
        d[(i, -1)] = i + 1
    for j in range(-1, lenstr2 + 1):
        d[(-1, j)] = j + 1
    for i in range(lenstr1):
        for j in range(lenstr2):
            if s1[i] == s2[j]:
                cost = 0
            else:
                cost = 1
            d[(i, j)] = min(
                d[(i - 1, j)] + 1, # deletion
                d[(i, j - 1)] + 1, # insertion
                d[(i - 1, j - 1)] + cost, # substitution
            )
            if i > 0 and j > 0 and s1[i] == s2[j - 1] and s1[i - 1] == s2[j]:
                d[(i, j)] = min(d[(i, j)], d[i - 2, j - 2] + cost) # transposition
    return d[lenstr1 - 1, lenstr2 - 1]

ENGINEERED_FEATURE_NAMES = [
    "length",
    "entropy",
    "digit_ratio",
    "vowel_ratio",
    "consonant_ratio",
    "unique_char_ratio",
    "hyphen_ratio",
    "longest_consonant_run",
    "longest_digit_run",
    "label_count",
    "has_digit",
    "punycode",
    "risky_tld",
    "alexa_rank_simulated",
    "nrd_age_simulated",
    "min_levenshtein_to_brand",
    "min_dameraulevenshtein_to_brand",
    "has_homoglyph",
    "tld_risk_score"
]


def entropy(value: str) -> float:
    counts = Counter(value)
    return -sum((count / len(value)) * math.log2(count / len(value)) for count in counts.values()) if value else 0.0


def _longest_run(value: str, predicate) -> int:
    best = current = 0
    for ch in value:
        if predicate(ch):
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best

def has_homoglyph(domain: str) -> float:
    # Check for Cyrillic or Greek blocks which are commonly used for homoglyphs
    for char in domain:
        if '\u0400' <= char <= '\u04FF' or '\u0370' <= char <= '\u03FF':
            return 1.0
    return 0.0

def domain_features(domains) -> np.ndarray:
    """Compute engineered lexical features for a batch of raw domain strings.

    Accepts any flat iterable of strings (list, ndarray, pandas Series) so it
    plugs into FeatureUnion the same way TfidfVectorizer does, and works
    unmodified at inference time when the service calls predict_proba([domain]).
    """
    rows = []
    for raw in domains:
        domain = (raw or "").lower()
        length = len(domain)
        digits = sum(ch.isdigit() for ch in domain)
        vowels = sum(ch in VOWELS for ch in domain)
        letters = sum(ch.isalpha() for ch in domain)
        consonants = letters - vowels
        unique_chars = len(set(domain))
        hyphens = domain.count("-")
        punycode = 1.0 if "xn--" in raw else 0.0
        risky_tld = 1.0 if any(raw.endswith(t) for t in [".tk", ".cn", ".ru", ".biz", ".info"]) else 0.0
        # Simulated features for offline training
        alexa_rank = 0.0
        nrd_age = 0.0
        
        # Typosquatting features
        sld = domain.split(".")[0]
        min_lev = 100
        min_dam = 100
        if BRANDS and sld:
            # Optimize: only compute expensive edit distances if length is similar
            close_brands = [b for b in BRANDS if abs(len(b) - len(sld)) <= 2]
            if close_brands:
                min_lev = min(levenshtein(sld, b) for b in close_brands)
                min_dam = min(damerau_levenshtein(sld, b) for b in close_brands)
        
        homoglyph = has_homoglyph(domain)
        tld_risk = 2.0 if any(raw.endswith(t) for t in [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".pw"]) else (1.0 if risky_tld else 0.0)

        rows.append([
            length,
            entropy(domain),
            digits / length if length else 0.0,
            vowels / length if length else 0.0,
            consonant_ratio := consonants / length if length else 0.0,
            unique_chars / length if length else 0.0,
            hyphens / length if length else 0.0,
            _longest_run(domain, lambda c: c.isalpha() and c not in VOWELS),
            _longest_run(domain, str.isdigit),
            domain.count(".") + 1 if domain else 0,
            1.0 if digits else 0.0,
            punycode,
            risky_tld,
            alexa_rank,
            nrd_age,
            min_lev,
            min_dam,
            homoglyph,
            tld_risk
        ])
    return np.asarray(rows, dtype=float)
