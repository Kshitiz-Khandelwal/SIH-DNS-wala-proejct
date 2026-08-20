import time

# To simulate the fastapi app logic, we'll instantiate it
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services', 'behavioral-engine'))
from app import observe, Observation

def evaluate_behavioral_engine():
    # 1. Simulate Normal Traffic
    print("Sending normal traffic (benign browsing)...")
    normal_domains = ["google.com", "api.github.com", "fonts.gstatic.com", "apple.com"]
    ip = "192.168.1.100"
    for _ in range(3):
        for d in normal_domains:
            res = observe(Observation(domain=d, client_ip=ip, ml_probability=0.01, threat_hit=False, nxdomain=False))
            time.sleep(0.01) # fast simulation
    
    print(f"Normal traffic risk score: {res['device_risk']} (Expected: < 50)")

    # 2. Simulate DNS Tunnelling (dnscat2 style)
    # Long hex-encoded labels, high NXDOMAIN ratio
    print("\nSending Tunnelling traffic (dnscat2 hex + NXDOMAINs)...")
    tunnel_ip = "10.0.0.45"
    tunnel_domains = [
        f"0123456789abcdef0123456789abcdef0123456789abcdef.{i}.c2.example.com"
        for i in range(20)
    ]
    for d in tunnel_domains:
        res = observe(Observation(domain=d, client_ip=tunnel_ip, ml_probability=0.8, threat_hit=False, nxdomain=True))
        time.sleep(0.01)
    
    print(f"Tunnelling traffic risk score: {res['device_risk']} (Expected: >= 80)")
    print(f"Signals triggered: {res['signals']}")

    # 3. Simulate Base64 Exfiltration
    print("\nSending Exfiltration traffic (Base64)...")
    exfil_ip = "172.16.0.5"
    exfil_domains = [
        f"SGVsG8gV29ybGQgVGhpcwIgaXMgYX4HZXN0.{i}.data.malicious.net"
        for i in range(5)
    ]
    for d in exfil_domains:
        res = observe(Observation(domain=d, client_ip=exfil_ip, ml_probability=0.9, threat_hit=False, nxdomain=False))
    
    print(f"Exfiltration risk score: {res['device_risk']} (Expected: >= 70)")
    print(f"Signals triggered: {res['signals']}")


if __name__ == "__main__":
    evaluate_behavioral_engine()
