import urllib.request
import urllib.error
import json
import sys
import time
from demo_utils import print_header, Colors

def query_active_response(endpoint, method="GET", payload=None):
    url = f"http://localhost:8081{endpoint}"
    data = None
    if payload:
        data = json.dumps(payload).encode('utf-8')
        
    req = urllib.request.Request(url, data=data, method=method)
    if data:
        req.add_header('Content-Type', 'application/json')
        
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.URLError as e:
        print(f"{Colors.RED}Error connecting to Active-Response service: {e}{Colors.RESET}")
        sys.exit(1)

def main():
    print_header("Phase 6: Quarantine & Rollback Demo")
    
    target_ip = "172.28.0.250"
    
    # 1. Trigger Quarantine Request
    print(f"{Colors.CYAN}Step 1: Simulating high device risk score triggering a quarantine request...{Colors.RESET}")
    result = query_active_response("/quarantine/request", method="POST", payload={
        "device_ip": target_ip,
        "reason": "simulated multi-stage behavioral breach",
        "domain": "bad-c2.com",
        "risk_score": 95
    })
    print(f"Response: {result}\n")
    time.sleep(1)
    
    # 2. List Pending
    print(f"{Colors.CYAN}Step 2: Analyst checks pending quarantine requests...{Colors.RESET}")
    pending = query_active_response("/quarantine/requests")
    print(f"Pending queue size: {len(pending)}")
    for ip, data in pending.items():
        print(f"  - IP: {ip}, Reason: {data.get('reason')}")
    print()
    time.sleep(1)
    
    # 3. Approve
    print(f"{Colors.CYAN}Step 3: Analyst approves the quarantine for {target_ip}...{Colors.RESET}")
    approval = query_active_response(f"/quarantine/{target_ip}/approve", method="POST", payload={
        "analyst": "demo_user"
    })
    print(f"Response: {approval}\n")
    time.sleep(1)
    
    # 4. Check Audit Log (simulated by explaining where to find it)
    print(f"{Colors.CYAN}Step 4: Tamper-Evident Audit Logging{Colors.RESET}")
    print("The action has been permanently logged. Analysts can view `data/audit.log`.")
    print("Expected log entry: {\"action\": \"approved\", \"ip\": \"172.28.0.250\", \"analyst\": \"demo_user\", ...}\n")
    
if __name__ == "__main__":
    main()
