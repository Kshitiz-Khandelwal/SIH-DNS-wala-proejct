"""Offline GeoLite2 enrichment service.

Geo is a supporting signal only. It returns a neutral score for missing databases,
private addresses and lookup failures, so it can never make DNS availability depend
on an external API or country-only blocking policy.
"""
from __future__ import annotations

import ipaddress
import json
import os
from pathlib import Path

import redis
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="DNS Shield Geo Intelligence", version="1.1.0")
cache = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379/0"), decode_responses=True)
CITY_DB = Path(os.getenv("MAXMIND_MMDB_PATH", "/data/GeoLite2-City.mmdb"))
ASN_DB = Path(os.getenv("MAXMIND_ASN_MMDB_PATH", "/data/GeoLite2-ASN.mmdb"))
CACHE_SECONDS = int(os.getenv("GEO_CACHE_TTL_SECONDS", str(24 * 3600)))
HIGH_RISK_COUNTRIES = {item.strip().upper() for item in os.getenv("HIGH_RISK_COUNTRIES", "").split(",") if item.strip()}
HIGH_RISK_ASNS = {item.strip().upper().removeprefix("AS") for item in os.getenv("HIGH_RISK_ASNS", "").split(",") if item.strip()}


class Lookup(BaseModel):
    ip: str = Field(description="Target IP from a resolved A/AAAA record")


def neutral(ip: str, reason: str) -> dict:
    return {"ip": ip, "available": False, "risk_contribution": 0, "risk_factors": [], "reason": reason, "decision_rule": "geo intelligence never blocks alone"}


def lookup_uncached(ip_text: str) -> dict:
    try:
        ip = ipaddress.ip_address(ip_text)
    except ValueError:
        raise HTTPException(status_code=422, detail="invalid IPv4 or IPv6 address")
    if not ip.is_global:
        return neutral(ip_text, "private, loopback, link-local, documentation, or reserved address; GeoIP is intentionally skipped")
    if not CITY_DB.exists():
        return neutral(ip_text, "offline GeoLite2 City database is not mounted")

    import geoip2.database
    try:
        with geoip2.database.Reader(str(CITY_DB)) as city_reader:
            city = city_reader.city(ip_text)
        country = city.country.iso_code or "ZZ"
        result = {"ip": ip_text, "available": True, "country": country, "country_name": city.country.name, "city": city.city.name, "latitude": city.location.latitude, "longitude": city.location.longitude, "asn": None, "asn_organization": None, "risk_contribution": 0, "risk_factors": [], "reason": "offline GeoLite2 lookup completed", "decision_rule": "geo intelligence never blocks alone"}
        if ASN_DB.exists():
            with geoip2.database.Reader(str(ASN_DB)) as asn_reader:
                asn = asn_reader.asn(ip_text)
            result["asn"] = asn.autonomous_system_number
            result["asn_organization"] = asn.autonomous_system_organization
        if country in HIGH_RISK_COUNTRIES:
            result["risk_contribution"] += 10; result["risk_factors"].append(f"country {country} is in locally configured review list")
        if result["asn"] and str(result["asn"]) in HIGH_RISK_ASNS:
            result["risk_contribution"] += 15; result["risk_factors"].append(f"ASN{result['asn']} is in locally configured review list")
        if result["risk_factors"]:
            result["reason"] = "; ".join(result["risk_factors"])
        return result
    except Exception as exc:
        # MaxMind can raise AddressNotFoundError or database errors; both degrade neutrally.
        return neutral(ip_text, f"offline GeoIP lookup unavailable: {type(exc).__name__}")


@app.post("/lookup", tags=["enrichment"])
def lookup(request: Lookup):
    key = f"geo:lookup:{request.ip}"
    cached = cache.get(key)
    if cached:
        response = json.loads(cached); response["cache"] = "hit"; return response
    response = lookup_uncached(request.ip)
    cache.setex(key, CACHE_SECONDS, json.dumps(response)); response["cache"] = "miss"
    return response


@app.get("/health", tags=["operations"])
def health():
    return {"status": "ok" if CITY_DB.exists() else "degraded", "city_database": str(CITY_DB), "city_database_present": CITY_DB.exists(), "asn_database": str(ASN_DB), "asn_database_present": ASN_DB.exists(), "high_risk_country_entries": len(HIGH_RISK_COUNTRIES), "high_risk_asn_entries": len(HIGH_RISK_ASNS), "fallback": "neutral score when offline data is absent"}
