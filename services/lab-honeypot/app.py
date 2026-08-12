"""Controlled HTTP decoy for the DNS Shield Docker laboratory.

It records metadata only, returns harmless responses, and never proxies requests,
executes payloads, or makes outbound connections on behalf of a client.
"""
from __future__ import annotations

import os
import time

import requests
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, PlainTextResponse

app = FastAPI(title="DNS Shield Lab Honeypot", version="1.0.0")
ACTIVE_RESPONSE_URL = os.getenv("ACTIVE_RESPONSE_URL", "http://active-response:8004")
MAX_CAPTURED_BODY_BYTES = int(os.getenv("HONEYPOT_MAX_CAPTURED_BODY_BYTES", "1024"))


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def report(observation: dict) -> str | None:
    try:
        response = requests.post(ACTIVE_RESPONSE_URL + "/sinkhole/observe", json=observation, timeout=0.5)
        response.raise_for_status()
        return None
    except requests.RequestException as exc:
        return type(exc).__name__


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"], tags=["decoy"])
async def decoy(path: str, request: Request):
    raw = await request.body()
    observation = {"domain": request.headers.get("host", "sinkhole.lab").split(":")[0], "device_ip": client_ip(request), "protocol": "http", "path": "/" + path, "user_agent": request.headers.get("user-agent", "")[:1024], "method": request.method, "content_length": len(raw), "captured_body_preview": raw[:MAX_CAPTURED_BODY_BYTES].decode("utf-8", errors="replace"), "observed_at": time.time()}
    telemetry_error = report(observation)
    if path == "healthz":
        return JSONResponse({"status": "ok", "scope": "dns-shield-lab-only", "telemetry_error": telemetry_error})
    return PlainTextResponse("ok\n", status_code=200, headers={"Server": "nginx"})
