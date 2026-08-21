import os
import time
from demo_utils import read_lines, query_domain, format_result, print_header, Colors

def main():
    print_header("Phase 2: DGA Burst Simulator")
    print("Simulating a malware infection generating random domains to find a C2 server...")
    
    domain_list_path = os.path.join(os.path.dirname(__file__), "domain_lists", "dga_burst.txt")
    domains = read_lines(domain_list_path)
    
    total = len(domains)
    blocked = 0
    
    for i, domain in enumerate(domains, 1):
        result, latency = query_domain(domain, client_ip="172.28.0.101")
        format_result(domain, result, latency)
        
        if result.get('verdict') in ['BLOCK', 'FLAG']:
            blocked += 1
            
        # DGA bursts often happen rapidly
        time.sleep(0.05)

    print(f"\n{Colors.BOLD}Summary:{Colors.RESET}")
    print(f"Total Queries: {total}")
    print(f"Blocked/Flagged: {Colors.RED}{blocked}{Colors.RESET}")
    print(f"Allowed: {total - blocked}")
    
    rate = (blocked / total) * 100
    if rate > 90:
        print(f"\n{Colors.GREEN}Success: Excellent ML zero-day DGA block rate ({rate:.1f}%).{Colors.RESET}")
    else:
        print(f"\n{Colors.YELLOW}Note: DGA block rate is {rate:.1f}%. ML model may need retuning if below 90%.{Colors.RESET}")

if __name__ == "__main__":
    main()
