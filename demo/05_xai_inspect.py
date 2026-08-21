import sys
from demo_utils import query_domain, format_result, print_xai_details, print_header, Colors

def main():
    print_header("Phase 5: XAI Inspection")
    print("Executing a single query against a DGA domain and parsing the live TreeSHAP explanation...")
    
    # We will pick a hardcoded DGA domain to inspect
    target_domain = "1234567890abcdef.tk"
    
    # Optional: pass an argument if the user wants to test a specific domain
    if len(sys.argv) > 1:
        target_domain = sys.argv[1]
        
    print(f"\nTarget Domain: {Colors.CYAN}{target_domain}{Colors.RESET}")
    print("Waiting for API Gateway response...\n")
    
    result, latency = query_domain(target_domain, client_ip="172.28.0.104")
    
    # Print standard output
    format_result(target_domain, result, latency)
    
    # Print the specific XAI breakdown
    print_xai_details(result)

if __name__ == "__main__":
    main()
