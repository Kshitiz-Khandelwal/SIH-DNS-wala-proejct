#!/usr/bin/env python3
"""
DNS Shield — Device Fleet & Endpoint Quarantine MCP Server
Exposes host fleet management, quarantine control, and compromised device 
detection as MCP tools.

Reasoning: This is the "actuator arm" of AI-driven security automation.
Domain inspection tells you a host IS compromised — this server lets the AI 
actually DO something about it by triggering surgical network isolation 
without requiring a human to click through a dashboard.
"""

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("DNS Shield — Device Fleet")

# In-memory device fleet state (in production this would call your real device API)
DEVICE_FLEET = [
    {"id": 1,  "host": "WS-ENG-042",      "ip": "10.0.4.122",   "type": "Workstation (Windows 11)",    "query_vol_24h": 1240,  "threat": "Cobalt Strike C2 Beacon",          "status": "COMPROMISED", "quarantined": True},
    {"id": 2,  "host": "FIN-LAP-018",     "ip": "10.0.4.88",    "type": "Laptop (macOS Sequoia)",      "query_vol_24h": 3890,  "threat": "Banking Trojan DGA",               "status": "COMPROMISED", "quarantined": True},
    {"id": 3,  "host": "DEV-SRV-009",     "ip": "10.0.2.14",    "type": "Linux Server (Ubuntu 24.04)", "query_vol_24h": 8410,  "threat": "DNS Data Exfiltration Tunnel",     "status": "COMPROMISED", "quarantined": True},
    {"id": 4,  "host": "SRV-DB-PROD-01",  "ip": "192.168.1.15", "type": "Database Server",             "query_vol_24h": 14200, "threat": "DGA Frequency Anomaly",            "status": "SUSPICIOUS",  "quarantined": False},
    {"id": 5,  "host": "HR-PC-103",       "ip": "10.0.6.55",    "type": "Workstation (Windows 11)",    "query_vol_24h": 890,   "threat": "Homoglyph Phish Lookup",           "status": "SUSPICIOUS",  "quarantined": False},
    {"id": 6,  "host": "IOT-SEC-CAM-12",  "ip": "10.0.12.88",   "type": "IoT Security Camera",         "query_vol_24h": 420,   "threat": "N/A",                              "status": "CLEAN",       "quarantined": False},
    {"id": 7,  "host": "CORP-VPN-GW",     "ip": "10.0.1.1",     "type": "Network Gateway",             "query_vol_24h": 48920, "threat": "N/A",                              "status": "CLEAN",       "quarantined": False},
    {"id": 8,  "host": "EXEC-MBP-01",     "ip": "10.0.8.22",    "type": "Laptop (macOS)",              "query_vol_24h": 2140,  "threat": "N/A",                              "status": "CLEAN",       "quarantined": False},
]


# ─── Tool 1: List All Devices ─────────────────────────────────────────────────
@mcp.tool()
def list_devices(status_filter: str | None = None) -> list[dict]:
    """
    List all devices in the corporate endpoint fleet with their current 
    threat status and query volume.
    
    Args:
        status_filter: Optionally filter by "COMPROMISED", "SUSPICIOUS", or "CLEAN".
    
    Why useful: AI can get a full inventory of the network in one call 
    to understand scope during a security incident — "how many devices 
    are currently compromised or suspicious?"
    """
    fleet = DEVICE_FLEET
    if status_filter:
        fleet = [d for d in fleet if d["status"] == status_filter.upper()]
    return fleet


# ─── Tool 2: Get Device by IP or Hostname ─────────────────────────────────────
@mcp.tool()
def find_device(identifier: str) -> dict:
    """
    Look up a specific device by its hostname or IP address.
    
    Why useful: When AI sees a suspicious source IP in the DNS event stream,
    it can instantly look up "who does IP 10.0.4.122 belong to?" and get
    the full device profile, owner, type, and threat history.
    
    Example: find_device("10.0.4.122") → WS-ENG-042 (Cobalt Strike C2)
    """
    identifier = identifier.strip().lower()
    for device in DEVICE_FLEET:
        if device["ip"] == identifier or device["host"].lower() == identifier:
            return device
    return {"error": f"No device found matching '{identifier}'", "fleet_size": len(DEVICE_FLEET)}


# ─── Tool 3: Quarantine a Host ────────────────────────────────────────────────
@mcp.tool()
def quarantine_host(identifier: str, reason: str = "AI-initiated automated response") -> dict:
    """
    Apply DNS-level network quarantine to a compromised or suspicious endpoint.
    
    Quarantine works by blocking ALL DNS resolution for the target device's IP
    at the resolver level, effectively cutting its internet access while
    keeping it on the local network for forensic investigation.
    
    Args:
        identifier: The hostname (e.g. "WS-ENG-042") or IP address to quarantine.
        reason: Human-readable reason for the quarantine (logged in audit trail).
    
    Why useful: This is the most powerful tool — when an AI detects a
    device exfiltrating data at 3 AM, it can quarantine the host instantly
    rather than waiting for a human analyst to wake up.
    
    Example: quarantine_host("10.0.4.122", "DGA C2 beacon detected at 03:14 UTC")
    """
    identifier = identifier.strip().lower()
    for device in DEVICE_FLEET:
        if device["ip"] == identifier or device["host"].lower() == identifier:
            device["quarantined"] = True
            device["status"] = "COMPROMISED"
            return {
                "success": True,
                "host": device["host"],
                "ip": device["ip"],
                "action": "QUARANTINE_APPLIED",
                "reason": reason,
                "effect": "All DNS resolution for this device has been blocked at the resolver.",
                "reversible": True,
                "forensic_note": f"Device {device['host']} isolated at network perimeter. DNS-level block active.",
                "next_steps": [
                    f"Collect memory dump from {device['host']} for forensic analysis.",
                    "Export TreeSHAP dossier for all recent DNS queries from this host.",
                    "Escalate to incident response team.",
                ]
            }
    return {"success": False, "error": f"Device '{identifier}' not found in fleet."}


# ─── Tool 4: Release Quarantine ───────────────────────────────────────────────
@mcp.tool()
def release_quarantine(identifier: str, analyst_sign_off: str = "AI Agent") -> dict:
    """
    Remove the network quarantine from a previously isolated device,
    restoring its DNS resolution access.
    
    Args:
        identifier: The hostname or IP of the device to release.
        analyst_sign_off: Name of analyst or agent authorizing the release.
    
    Why useful: Once a device has been cleaned and verified, AI can lift 
    the quarantine after confirming no further DGA/C2 queries in the past hour.
    """
    identifier = identifier.strip().lower()
    for device in DEVICE_FLEET:
        if device["ip"] == identifier or device["host"].lower() == identifier:
            device["quarantined"] = False
            device["status"] = "CLEAN"
            device["threat"] = "N/A (Remediated)"
            return {
                "success": True,
                "host": device["host"],
                "ip": device["ip"],
                "action": "QUARANTINE_RELEASED",
                "authorized_by": analyst_sign_off,
                "effect": "DNS resolution restored for this device.",
            }
    return {"success": False, "error": f"Device '{identifier}' not found in fleet."}


# ─── Tool 5: Fleet Risk Summary ───────────────────────────────────────────────
@mcp.tool()
def get_fleet_risk_summary() -> dict:
    """
    Compute an aggregate risk summary for the entire device fleet.
    
    Why useful: Gives an AI a single-call bird's-eye view of fleet health.
    This is the first thing an AI should call at the start of any security 
    analysis workflow to understand the current threat landscape.
    """
    compromised = [d for d in DEVICE_FLEET if d["status"] == "COMPROMISED"]
    suspicious  = [d for d in DEVICE_FLEET if d["status"] == "SUSPICIOUS"]
    clean       = [d for d in DEVICE_FLEET if d["status"] == "CLEAN"]
    quarantined = [d for d in DEVICE_FLEET if d["quarantined"]]
    
    return {
        "total_devices": len(DEVICE_FLEET),
        "compromised_count": len(compromised),
        "suspicious_count": len(suspicious),
        "clean_count": len(clean),
        "quarantined_count": len(quarantined),
        "fleet_health_pct": round(len(clean) / len(DEVICE_FLEET) * 100, 1),
        "compromised_hosts": [{"host": d["host"], "ip": d["ip"], "threat": d["threat"]} for d in compromised],
        "suspicious_hosts":  [{"host": d["host"], "ip": d["ip"], "threat": d["threat"]} for d in suspicious],
        "highest_query_volume_host": max(DEVICE_FLEET, key=lambda d: d["query_vol_24h"])["host"],
    }


if __name__ == "__main__":
    mcp.run()
