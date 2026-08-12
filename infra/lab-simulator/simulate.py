"""One-shot Docker-lab scenario generator; no external network traffic."""
import argparse
import os

import requests

BASE = os.getenv("GATEWAY_URL", "http://api-gateway:8080") + "/v1/query"
SCENARIOS = {
    "benign": ["isro.gov.in", "google.com", "github.com"],
    "dga": ["xq9m2kz7v4na.com", "lq3zp89vbcx.net", "ad7qxm91bz.io"],
    "tunnelling": ["".join("abcdef0123456789"[index % 16] for index in range(60)) + ".exfil-demo.example"],
    "c2": ["c2.bad-demo.example"],
    "typosquat": ["gooogle.com", "isro-gov.in"],
}

parser = argparse.ArgumentParser()
parser.add_argument("scenario", choices=SCENARIOS)
parser.add_argument("--device", required=True)
parser.add_argument("--repeat", type=int, default=1)
args = parser.parse_args()

for _ in range(args.repeat):
    for domain in SCENARIOS[args.scenario]:
        response = requests.post(BASE, json={"domain": domain, "client_ip": args.device, "source": f"lab-simulation:{args.scenario}"}, timeout=2)
        print(response.text)
