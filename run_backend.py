"""DNS Shield — Unified Local Backend Orchestrator.

Starts Redis (if needed) and all 7 microservices concurrently with proper PYTHONPATH
and environment variables configured for seamless local execution.
"""

import os
import sys
import time
import subprocess
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))
SERVICES = [
    ("threat-intel",        8003, "services/threat-intel"),
    ("ml-inference",        8000, "services/ml-inference"),
    ("behavioral-engine",   8001, "services/behavioral-engine"),
    ("geo-intel",           8002, "services/geo-intel"),
    ("active-response",     8004, "services/active-response"),
    ("analytics-store",     8005, "services/analytics-store"),
    ("flow-ingest",         8006, "services/flow_ingest"),    # PS2: NetFlow/PCAP ingestion
    ("forecasting-engine",  8007, "services/forecasting_engine"),  # PS2: Kill-chain forecaster
    ("api-gateway",         8081, "services/api-gateway"),
]

def check_redis():
    try:
        res = subprocess.run(["redis-cli", "ping"], capture_output=True, text=True, timeout=2)
        if "PONG" in res.stdout:
            print("[+] Redis is running.")
            return True
    except Exception:
        pass
    
    print("[*] Starting local Redis server...")
    try:
        subprocess.Popen(["redis-server", "--port", "6379"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.5)
        res = subprocess.run(["redis-cli", "ping"], capture_output=True, text=True, timeout=2)
        if "PONG" in res.stdout:
            print("[+] Redis started successfully.")
            return True
    except Exception as e:
        print(f"[!] Warning: Could not auto-start Redis ({e}). Continuing with graceful fallback.")
    return False

def main():
    print("=" * 60)
    print("  DNS SHIELD — LOCAL BACKEND SERVICES LAUNCHER")
    print("=" * 60)
    
    check_redis()
    
    env = os.environ.copy()
    env["PYTHONPATH"] = ROOT + os.pathsep + env.get("PYTHONPATH", "")
    env["MODEL_ARTIFACT_DIR"] = os.path.join(ROOT, "services", "ml-inference", "artifacts")
    env["REDIS_URL"] = "redis://localhost:6379/0"
    env["CORS_ORIGINS"] = "http://localhost:3000,http://127.0.0.1:3000"
    
    processes = []
    
    for name, port, rel_path in SERVICES:
        cwd = os.path.join(ROOT, rel_path)
        cmd = [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", str(port)]
        print(f"[*] Starting {name:<20} on port {port}...")
        p = subprocess.Popen(cmd, cwd=cwd, env=env)
        processes.append((name, port, p))
    
    print("\n[+] All 9 microservices launched. Waiting for startup & warming up services...\n")

    # Retry-with-backoff health check loop to prevent race conditions during service boot
    import urllib.request
    import urllib.error

    health_endpoints = {
        "threat-intel": "http://localhost:8003/health",
        "ml-inference": "http://localhost:8000/health",
        "behavioral-engine": "http://localhost:8001/health",
        "geo-intel": "http://localhost:8002/health",
        "active-response": "http://localhost:8004/health",
        "analytics-store": "http://localhost:8005/health",
        "flow-ingest": "http://localhost:8006/health",
        "forecasting-engine": "http://localhost:8007/health",
        "api-gateway": "http://localhost:8081/health",
    }

    print("-" * 65)
    print("  STARTUP HEALTH VERIFICATION (Polling up to 15s per service):")
    
    all_passed = True
    for name, port, p in processes:
        url = health_endpoints.get(name, f"http://localhost:{port}/health")
        docs_url = f"http://localhost:{port}/docs"
        
        passed = False
        last_error = ""
        start_t = time.time()
        
        while time.time() - start_t < 15.0:
            if p.poll() is not None:
                last_error = f"Process terminated unexpectedly with code {p.returncode}"
                break
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "DNS-Shield-HealthCheck"})
                with urllib.request.urlopen(req, timeout=1.0) as resp:
                    if resp.status in (200, 204):
                        elapsed = round(time.time() - start_t, 1)
                        print(f"  [PASS] {name:<20} (port {port}) -> HTTP {resp.status} OK ({elapsed}s)")
                        passed = True
                        break
            except Exception as err:
                last_error = type(err).__name__
                # Try /docs as alternative endpoint
                try:
                    req_docs = urllib.request.Request(docs_url, headers={"User-Agent": "DNS-Shield-HealthCheck"})
                    with urllib.request.urlopen(req_docs, timeout=1.0) as resp_docs:
                        if resp_docs.status in (200, 204):
                            elapsed = round(time.time() - start_t, 1)
                            print(f"  [PASS] {name:<20} (port {port}) -> HTTP {resp_docs.status} OK (docs, {elapsed}s)")
                            passed = True
                            break
                except Exception:
                    pass
            time.sleep(0.5)

        if not passed:
            print(f"  [FAIL] {name:<20} (port {port}) -> OFFLINE after 15s ({last_error})")
            all_passed = False

    print("-" * 65)

    if all_passed:
        print("[+] All 9 microservices are healthy, fully warmed up, and responding.\n")
    else:
        print("[!] Warning: Some services did not pass health check within 15s. Review output above.\n")


    print("=" * 60)
    print("  SERVICES RUNNING & READY:")
    print("  - ML Inference:       http://localhost:8000/docs")
    print("  - Behavioral Engine:  http://localhost:8001/docs")
    print("  - Geo-Intel:          http://localhost:8002/docs")
    print("  - Threat Intel:       http://localhost:8003/docs")
    print("  - Active Response:    http://localhost:8004/docs")
    print("  - Analytics Store:    http://localhost:8005/docs")
    print("  - Flow Ingest [PS2]:  http://localhost:8006/docs")
    print("  - Forecasting [PS2]:  http://localhost:8007/docs")
    print("  - API Gateway:        http://localhost:8081/docs")
    print("=" * 60)
    print("Press Ctrl+C to terminate all services.\n")
    
    try:
        while True:
            for name, port, p in processes:
                if p.poll() is not None:
                    print(f"[!] Warning: Service {name} (port {port}) stopped with code {p.returncode}")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\n[*] Stopping all services...")
        for name, port, p in processes:
            p.terminate()
        for name, port, p in processes:
            p.wait()
        print("[+] All services stopped.")


if __name__ == "__main__":
    main()
