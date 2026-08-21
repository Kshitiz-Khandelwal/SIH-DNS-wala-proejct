import os
import time
from demo_utils import read_lines, query_domain, format_result, print_header, Colors

def main():
    print_header("Phase 4: Typosquatting Simulator")
    print("Simulating phishing attempts using visually similar domains (homoglyphs, omitted characters)...")
    
    domain_list_path = os.path.join(os.path.dirname(__file__), "domain_lists", "typosquats.txt")
    domains = read_lines(domain_list_path)
    
    total = len(domains)
    blocked = 0
    
    for i, domain in enumerate(domains, 1):
        result, latency = query_domain(domain, client_ip="172.28.0.103")
        format_result(domain, result, latency)
        
        if result.get('verdict') in ['BLOCK', 'FLAG']:
            blocked += 1
            
        time.sleep(0.2)

    print(f"\n{Colors.BOLD}Summary:{Colors.RESET}")
    print(f"Total Queries: {total}")
    print(f"Blocked/Flagged: {Colors.RED}{blocked}{Colors.RESET}")
    
    if blocked == total:
        print(f"\n{Colors.GREEN}Success: All typosquatting attempts were intercepted.{Colors.RESET}")
    else:
        print(f"\n{Colors.YELLOW}Note: Some typosquats bypassed the local deterministic rules.{Colors.RESET}")

if __name__ == "__main__":
    main()
