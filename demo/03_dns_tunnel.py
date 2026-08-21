import os
import time
from demo_utils import read_lines, query_domain, format_result, print_header, Colors

def main():
    print_header("Phase 3: DNS Tunnelling Simulator")
    print("Simulating data exfiltration using base64-encoded subdomains (T1071.004)...")
    
    domain_list_path = os.path.join(os.path.dirname(__file__), "domain_lists", "tunnelling.txt")
    domains = read_lines(domain_list_path)
    
    tunnel_ip = "172.28.0.102"
    
    for i, domain in enumerate(domains, 1):
        # We query the same device IP rapidly. 
        # The behavioral engine tracks the sliding window of subdomain length/entropy for this IP.
        result, latency = query_domain(domain, client_ip=tunnel_ip)
        format_result(domain, result, latency)
        
        # Tunnels send a lot of queries back to back
        time.sleep(0.1)

    print(f"\n{Colors.BOLD}Observation:{Colors.RESET}")
    print("Notice how the verdict shifts from ALLOW to FLAG or BLOCK as the behavioral engine's sliding window threshold for subdomain entropy/volume is exceeded for this IP.")

if __name__ == "__main__":
    main()
