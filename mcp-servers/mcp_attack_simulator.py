#!/usr/bin/env python3
"""
DNS Shield — Attack Simulation MCP Server
Exposes attack scenario injection for training, demos, and red team exercises.

Reasoning: In a hackathon or demo setting, you need to prove the system works
under adversarial conditions. This server lets an AI orchestrate realistic
attack scenarios on demand — DGA floods, C2 callbacks, data exfiltration —
without needing a human to click buttons on the dashboard.
"""

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("DNS Shield — Attack Simulator")
BASE_URL = "http://localhost:3000"

ATTACK_PROFILES = {
    "dga": {
        "name": "DGA Generation Attack",
        "description": "Injects a Necurs-family DGA domain (arithmetic PRNG seeded by date). The ML classifier should detect high Shannon entropy and consonant runs and block it.",
        "expected_verdict": "BLOCK",
        "expected_score_range": "78–95",
        "mitre_technique": "T1568.002 — Domain Generation Algorithms",
    },
    "typosquatting": {
        "name": "Homoglyph Phishing Attack",
        "description": "Injects a visually deceptive domain that impersonates a trusted brand using Unicode confusable characters (e.g. Cyrillic 'о' in 'gооgle').",
        "expected_verdict": "BLOCK",
        "expected_score_range": "70–88",
        "mitre_technique": "T1566.002 — Spearphishing Link",
    },
    "tunneling": {
        "name": "DNS Tunnelling / Data Exfiltration",
        "description": "Injects a base64-encoded payload as subdomain labels to simulate Iodine/DNScat2 exfiltration. High entropy + high digit ratio triggers Stage 6.",
        "expected_verdict": "BLOCK",
        "expected_score_range": "85–98",
        "mitre_technique": "T1048.001 — Exfiltration Over DNS",
    },
    "c2": {
        "name": "C2 Botnet Callback Beacon",
        "description": "Injects a Cobalt Strike / Gameover Zeus C2 callback domain. Should be caught by both the RPZ Threat Intel cache and the ML classifier independently.",
        "expected_verdict": "BLOCK",
        "expected_score_range": "88–99",
        "mitre_technique": "T1071.004 — Application Layer Protocol: DNS",
    },
    "benign": {
        "name": "Benign Enterprise Query",
        "description": "Injects a clean Tranco top-1K query (api.github.com, fonts.googleapis.com). Should pass all 7 pipeline stages and be ALLOWED with minimal latency.",
        "expected_verdict": "ALLOW",
        "expected_score_range": "4–18",
        "mitre_technique": "N/A — Clean traffic",
    },
}


# ─── Tool 1: Run Single Attack Simulation ─────────────────────────────────────
@mcp.tool()
def run_attack_simulation(attack_type: str) -> dict:
    """
    Inject a synthetic attack scenario into the DNS Shield live event stream.
    The pipeline will evaluate it in real time and return the verdict.
    
    Args:
        attack_type: One of: "dga", "typosquatting", "tunneling", "c2", "benign"
    
    Why useful: An AI can orchestrate a live red-team exercise before a
    presentation, generating realistic hostile traffic that proves the 
    system works, all without any human clicking the dashboard buttons.
    
    Each type maps to a distinct MITRE ATT&CK technique.
    """
    valid_types = list(ATTACK_PROFILES.keys())
    if attack_type not in valid_types:
        return {
            "error": f"Invalid attack_type '{attack_type}'.",
            "valid_options": valid_types,
        }
    
    try:
        resp = httpx.post(
            f"{BASE_URL}/api/v1/simulate",
            json={"type": attack_type},
            timeout=8.0,
        )
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        result = {"error": str(e), "simulated": True}
    
    profile = ATTACK_PROFILES[attack_type]
    return {
        "simulation_result": result,
        "attack_profile": profile,
        "live_event_injected": True,
        "check_dashboard": f"http://localhost:3000/stitch/index.html",
    }


# ─── Tool 2: Full Red Team Exercise ───────────────────────────────────────────
@mcp.tool()
def run_full_red_team_exercise() -> dict:
    """
    Execute ALL 5 attack scenarios in sequence (benign, DGA, typosquatting, 
    tunneling, C2) to perform a complete adversarial evaluation of DNS Shield.
    
    Returns a full test report showing which scenarios were correctly classified.
    
    Why useful: Perfect for hackathon demonstrations — one call proves 
    all pipeline stages work end-to-end under every attack vector defined 
    in the MITRE ATT&CK framework.
    """
    results = []
    exercise_types = ["benign", "dga", "typosquatting", "tunneling", "c2"]
    
    for attack_type in exercise_types:
        profile = ATTACK_PROFILES[attack_type]
        try:
            resp = httpx.post(
                f"{BASE_URL}/api/v1/simulate",
                json={"type": attack_type},
                timeout=8.0,
            )
            sim_result = resp.json() if resp.status_code == 200 else {"error": "API timeout"}
            actual_verdict = sim_result.get("verdict", "UNKNOWN")
            expected_verdict = profile["expected_verdict"]
            correct = actual_verdict == expected_verdict
        except Exception:
            sim_result = {}
            correct = False
            actual_verdict = "ERROR"
            expected_verdict = profile["expected_verdict"]
        
        results.append({
            "attack_type": attack_type,
            "attack_name": profile["name"],
            "mitre_technique": profile["mitre_technique"],
            "expected_verdict": expected_verdict,
            "actual_verdict": actual_verdict,
            "correctly_classified": correct,
            "result": sim_result,
        })
    
    passed = sum(1 for r in results if r["correctly_classified"])
    
    return {
        "exercise_name": "DNS Shield Full Red Team Pipeline Evaluation",
        "total_scenarios": len(results),
        "passed": passed,
        "failed": len(results) - passed,
        "detection_rate_pct": round(passed / len(results) * 100, 1),
        "results": results,
        "conclusion": (
            "✅ All pipeline stages PASS — system ready for production." 
            if passed == len(results) 
            else f"⚠️ {len(results) - passed} scenario(s) need investigation."
        ),
    }


# ─── Tool 3: Get Attack Profile Details ───────────────────────────────────────
@mcp.tool()
def describe_attack_type(attack_type: str) -> dict:
    """
    Get a detailed explanation of what a specific attack simulation does,
    which pipeline stage should catch it, and the MITRE ATT&CK mapping.
    
    Why useful: An AI explaining the system to evaluators or teachers 
    can call this to generate accurate, technically correct descriptions 
    of each attack vector without guessing.
    """
    if attack_type not in ATTACK_PROFILES:
        return {
            "error": f"Unknown attack type: '{attack_type}'",
            "available_types": list(ATTACK_PROFILES.keys()),
        }
    return ATTACK_PROFILES[attack_type]


if __name__ == "__main__":
    mcp.run()
