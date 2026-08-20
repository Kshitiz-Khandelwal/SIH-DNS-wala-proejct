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
from collections import Counter

import numpy as np

VOWELS = set("aeiou")

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
    "nrd_age_simulated"
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
        
        rows.append([
            length,
            entropy(domain),
            digits / length if length else 0.0,
            vowels / length if length else 0.0,
            consonants / length if length else 0.0,
            unique_chars / length if length else 0.0,
            hyphens / length if length else 0.0,
            _longest_run(domain, lambda c: c.isalpha() and c not in VOWELS),
            _longest_run(domain, str.isdigit),
            domain.count(".") + 1 if domain else 0,
            1.0 if digits else 0.0,
            punycode,
            risky_tld,
            alexa_rank,
            nrd_age
        ])
    return np.asarray(rows, dtype=float)
