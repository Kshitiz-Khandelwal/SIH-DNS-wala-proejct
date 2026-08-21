def format_reason(feature: str, value: float) -> str:
    """Map a raw feature name and its value to a human-readable analyst explanation."""
    
    reasons = {
        "entropy": f"High Shannon entropy ({value:.2f}) — indicates algorithmically random character distribution",
        "length": f"Unusual domain length ({value:.0f} characters)",
        "digit_ratio": f"Elevated digit ratio ({value:.0%}) — unusually high number content",
        "vowel_ratio": f"Anomalous vowel ratio ({value:.0%})",
        "consonant_ratio": f"Anomalous consonant ratio ({value:.0%})",
        "unique_char_ratio": f"High proportion of unique characters ({value:.0%})",
        "hyphen_ratio": f"High hyphenation density ({value:.0%})",
        "longest_consonant_run": f"Long continuous consonant run ({value:.0f} chars) — unpronounceable sequence",
        "longest_digit_run": f"Long continuous digit sequence ({value:.0f} chars)",
        "label_count": f"High number of subdomain labels ({value:.0f})",
        "has_digit": "Contains numeric characters",
        "punycode": "Uses Punycode (xn--) encoding — potential IDN homograph",
        "risky_tld": "High-risk top-level domain extension",
        "min_levenshtein_to_brand": f"Low edit distance to known brand ({value:.0f}) — strong typosquatting indicator",
        "min_dameraulevenshtein_to_brand": f"Low transposition edit distance to known brand ({value:.0f}) — strong typosquatting indicator",
        "has_homoglyph": "Contains Cyrillic/Greek unicode confusable characters (IDN homograph attack)",
        "tld_risk_score": f"Suspicious TLD penalty applied ({value:.0f}) — heavily abused registry",
        "ngram_rarity": f"Low character n-gram score ({value:.2f}) — unusual character sequence transitions",
    }
    
    return reasons.get(feature, f"Suspicious anomaly in feature: {feature} (val: {value:.2f})")
