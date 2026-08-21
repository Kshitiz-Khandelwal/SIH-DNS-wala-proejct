# DNS Shield Live Attack Demonstration

This directory contains a 6-phase, offline, zero-dependency demonstration suite designed to prove the effectiveness of the DNS Shield system. 

Judges and evaluators can run these scripts locally to verify that the ML models, behavioral engines, and active response systems work as claimed without requiring internet connectivity or live malware.

## Prerequisites
- Python 3.8+ (Standard library only; no external packages required)
- The DNS Shield backend services must be running (`api-gateway` on port `8080` and `active-response` on port `8081`).

## Running the Demo

Run the scripts in sequence from the root of the repository or from within this `demo/` directory.

### Phase 1: Benign Traffic Baseline
```bash
python demo/01_benign_traffic.py
```
**Goal:** Prove the system has near-zero false positives by processing a list of top corporate domains. You should see 100% `ALLOW` verdicts.

### Phase 2: DGA Burst (Zero-Day Malware)
```bash
python demo/02_dga_burst.py
```
**Goal:** Prove the Random Forest lexical engine can catch algorithmically generated domains it has never seen before. You should see a >90% `BLOCK` rate based entirely on entropy and linguistic features.

### Phase 3: DNS Tunnelling (Behavioral Analytics)
```bash
python demo/03_dns_tunnel.py
```
**Goal:** Prove the sliding-window behavioral engine works. The script sends repetitive base64-encoded subdomains from a single IP. You will see the verdict shift from `ALLOW` to `FLAG`/`BLOCK` as the threshold is exceeded.

### Phase 4: Typosquatting
```bash
python demo/04_typosquat.py
```
**Goal:** Prove the local deterministic rules can catch homoglyphs and Levenshtein distance impersonations of major brands.

### Phase 5: XAI Inspection
```bash
python demo/05_xai_inspect.py
```
**Goal:** Prove that blocks are explainable. This script outputs the live TreeSHAP values calculated by the ML model, showing exactly *why* a domain was blocked.

### Phase 6: Quarantine & Rollback
```bash
python demo/06_quarantine_demo.py
```
**Goal:** Prove the system is safe for production. Simulates a severe breach, triggers a quarantine request, lists it in the pending queue, approves it, and details the tamper-evident audit log.
