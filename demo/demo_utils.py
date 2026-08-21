import urllib.request
import urllib.error
import json
import time
import sys

# ANSI color codes
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(title):
    print(f"\n{Colors.BOLD}{Colors.CYAN}=== {title} ==={Colors.RESET}\n")

def read_lines(filepath):
    try:
        with open(filepath, 'r') as f:
            return [line.strip() for line in f if line.strip() and not line.startswith('#')]
    except FileNotFoundError:
        print(f"{Colors.RED}Error: Could not find {filepath}{Colors.RESET}")
        sys.exit(1)

def query_domain(domain, client_ip="172.28.0.100"):
    url = "http://localhost:8080/v1/query"
    payload = json.dumps({
        "domain": domain,
        "client_ip": client_ip,
        "source": "demo-script"
    }).encode('utf-8')

    req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
    
    try:
        start_time = time.time()
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            latency = (time.time() - start_time) * 1000
            return result, latency
    except urllib.error.URLError as e:
        print(f"{Colors.RED}Error connecting to API Gateway: {e}{Colors.RESET}")
        print("Please ensure the backend services are running on localhost:8080.")
        sys.exit(1)

def format_result(domain, result, latency):
    verdict = result.get('verdict', 'UNKNOWN')
    color = Colors.GREEN if verdict == 'ALLOW' else (Colors.RED if verdict == 'BLOCK' else Colors.YELLOW)
    
    risk = result.get('domain_risk', 0)
    reasons = result.get('reasons', [])
    reason_str = reasons[0] if reasons else "No reason provided"
    if len(reason_str) > 60:
        reason_str = reason_str[:57] + "..."
        
    print(f"[{latency:4.0f}ms] {domain:<30} {color}{verdict:<8}{Colors.RESET} Risk: {risk:<3} | {reason_str}")
    
def print_xai_details(result):
    xai = result.get('ml', {}).get('xai')
    if not xai:
        print(f"  {Colors.YELLOW}No XAI explanation available.{Colors.RESET}")
        return
        
    print(f"\n  {Colors.BOLD}XAI Explanation (SHAP top contributors):{Colors.RESET}")
    print(f"  Model Version: {xai.get('model_version', 'unknown')}")
    
    for contributor in xai.get('top_contributors', []):
        feat = contributor.get('feature', 'unknown')
        val = contributor.get('value', 0)
        desc = contributor.get('description', '')
        print(f"  - {Colors.CYAN}{feat}{Colors.RESET} (SHAP: {val:+.3f}): {desc}")
    print()
