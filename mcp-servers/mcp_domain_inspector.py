#!/usr/bin/env python3
"""
DNS Shield — Domain Inspection MCP Server
Exposes the real-time 7-stage ML pipeline evaluation as MCP tools.
AI agents can call this to inspect any FQDN and get full SHAP decomposition.

Reasoning: This is the CORE tool. Every security workflow starts with
"is this domain malicious?". By exposing it as an MCP tool, any AI assistant
can now proactively check domains it encounters in emails, logs, or code.
"""

import httpx
import json
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("DNS Shield — Domain Inspector")
BASE_URL = "http://localhost:3000"


# ─── Tool 1: Domain Evaluation ────────────────────────────────────────────────
@mcp.tool()
def inspect_domain(domain: str, client_ip: str | None = None) -> dict:
    """
    Evaluate any FQDN through DNS Shield's full 7-stage ML pipeline.

    Returns:
    - verdict: ALLOW / FLAG / BLOCK
    - risk_score: 0–100 composite threat score
    - shannon_entropy: H(X) = -sum(P(x) * log2(P(x)))
    - pipeline_path: Which of the 7 stages triggered the verdict
    - shap_features: TreeSHAP attribution values for each lexical feature
    - malware_profile: Detected DGA family or attack pattern
    
    Why useful: AI can spot malicious domains in emails, chat messages, or 
    code without needing to manually check threat intel feeds.
    
    Examples:
        inspect_domain("google.com")          → ALLOW, score 8
        inspect_domain("malw-c2-01.ru")       → BLOCK, score 92
        inspect_domain("xk9mqz7p2n.top")      → BLOCK, score 87 (DGA)
    """
    params = {"domain": domain}
    if client_ip:
        params["client_ip"] = client_ip
    resp = httpx.get(f"{BASE_URL}/api/v1/query", params=params, timeout=10.0)
    resp.raise_for_status()
    return resp.json()


# ─── Tool 2: Batch Domain Sweep ───────────────────────────────────────────────
@mcp.tool()
def batch_inspect_domains(domains: list[str]) -> list[dict]:
    """
    Bulk evaluate multiple domains in sequence.
    
    Returns a list of evaluation results sorted by risk_score (highest first).
    
    Why useful: AI can sweep a list of URLs extracted from a suspicious email
    or a server's access log in one call, triage instantly.
    
    Example:
        batch_inspect_domains(["google.com", "malw-c2-01.ru", "pay-pal-login.top"])
    """
    results = []
    for domain in domains[:50]:  # Cap at 50 to avoid rate-limiting
        try:
            resp = httpx.get(
                f"{BASE_URL}/api/v1/query", 
                params={"domain": domain}, 
                timeout=8.0
            )
            if resp.status_code == 200:
                data = resp.json()
                data["input_domain"] = domain
                results.append(data)
        except Exception as e:
            results.append({"input_domain": domain, "error": str(e)})
    
    return sorted(results, key=lambda r: r.get("risk_score", 0), reverse=True)


# ─── Tool 3: Shannon Entropy Calculator ───────────────────────────────────────
@mcp.tool()
def calculate_domain_entropy(domain: str) -> dict:
    """
    Calculate Shannon Entropy H(X) for any string directly.
    
    H(X) = -sum(P(x_i) * log2(P(x_i)))
    
    Threshold interpretation:
    - H < 2.5  → Very likely human-readable, low suspicion
    - H 2.5–3.5 → Moderate — may be obfuscated or randomly generated
    - H > 3.5  → High — strong indicator of DGA or base64 tunnelling payload
    
    Why useful: AI can validate raw log lines or suspicious subdomains 
    without needing to call the full ML pipeline.
    """
    base = domain.split(".")[0]
    freq: dict[str, int] = {}
    for c in base:
        freq[c] = freq.get(c, 0) + 1
    
    entropy = 0.0
    for count in freq.values():
        p = count / max(len(base), 1)
        if p > 0:
            import math
            entropy -= p * math.log2(p)
    
    entropy = round(entropy, 4)
    
    if entropy < 2.5:
        classification = "LOW — Human-readable label, benign profile"
        risk_level = "CLEAN"
    elif entropy < 3.5:
        classification = "MODERATE — Possible obfuscation or short hash"
        risk_level = "SUSPECT"
    else:
        classification = "HIGH — Likely DGA-generated or payload-encoded"
        risk_level = "MALICIOUS"
    
    return {
        "domain": domain,
        "base_label": base,
        "shannon_entropy": entropy,
        "risk_level": risk_level,
        "classification": classification,
        "character_count": len(base),
        "unique_chars": len(freq),
    }


if __name__ == "__main__":
    mcp.run()
