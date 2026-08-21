import os
import time
from demo_utils import read_lines, query_domain, format_result, print_header, Colors

def main():
    print_header("Phase 1: Benign Traffic Simulator")
    print("Simulating normal corporate browsing behavior...")
    
    domain_list_path = os.path.join(os.path.dirname(__file__), "domain_lists", "benign.txt")
    domains = read_lines(domain_list_path)
    
    total = len(domains)
    allowed = 0
    
    for i, domain in enumerate(domains, 1):
        result, latency = query_domain(domain, client_ip="172.28.0.100")
        format_result(domain, result, latency)
        
        if result.get('verdict') == 'ALLOW':
            allowed += 1
            
        # Slight delay to simulate natural browsing
        time.sleep(0.1)

    print(f"\n{Colors.BOLD}Summary:{Colors.RESET}")
    print(f"Total Queries: {total}")
    print(f"Allowed: {Colors.GREEN}{allowed}{Colors.RESET}")
    print(f"Blocked: {total - allowed}")
    
    if allowed == total:
        print(f"\n{Colors.GREEN}Success: Zero false positives on benign traffic baseline.{Colors.RESET}")
    else:
        print(f"\n{Colors.YELLOW}Note: Some benign domains were flagged. Check manual rules or cache state.{Colors.RESET}")

if __name__ == "__main__":
    main()
