import sys
import os
import numpy as np

# ensure we import from repo root
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from dns_shield_features import domain_features, ENGINEERED_FEATURE_NAMES

def test_typosquat():
    domains = [
        "google.com",
        "goolge.com", # damerau 1, levenshtein 2
        "microsoft.tk", # tld risk 2
        "аpple.com", # cyrillic 'a' (U+0430)
    ]

    features = domain_features(domains)
    
    # Indices
    min_lev_idx = ENGINEERED_FEATURE_NAMES.index("min_levenshtein_to_brand")
    min_dam_idx = ENGINEERED_FEATURE_NAMES.index("min_dameraulevenshtein_to_brand")
    homo_idx = ENGINEERED_FEATURE_NAMES.index("has_homoglyph")
    tld_idx = ENGINEERED_FEATURE_NAMES.index("tld_risk_score")

    for i, d in enumerate(domains):
        print(f"Domain: {d}")
        print(f"  Min Levenshtein: {features[i][min_lev_idx]}")
        print(f"  Min Damerau: {features[i][min_dam_idx]}")
        print(f"  Homoglyph: {features[i][homo_idx]}")
        print(f"  TLD Risk: {features[i][tld_idx]}\n")

if __name__ == "__main__":
    test_typosquat()
