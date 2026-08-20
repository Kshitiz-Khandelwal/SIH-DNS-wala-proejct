import csv
import random
import string
from datetime import datetime, timedelta

BENIGN = [
    "google.com", "apple.com", "microsoft.com", "amazon.com", "facebook.com",
    "cloudflare.com", "github.com", "azure.com", "aws.amazon.com", "netflix.com",
    "wikipedia.org", "linkedin.com", "yahoo.com", "bing.com", "office.com",
    "live.com", "apple.co", "zoom.us", "salesforce.com", "slack.com"
]

MALICIOUS_PATTERNS = [
    "xjkzq", "asdf123", "qweqweqwe", "zxcvbnm", "1q2w3e4r",
    "vnmxzc", "lkjhgfdsa", "poiyui", "mnbvcxza", "plmokn"
]
TLDS = [".com", ".net", ".org", ".info", ".biz", ".tk", ".ru", ".cn"]

def generate_family_domain(family):
    chars = "abcdefghijklmnopqrstuvwxyz"
    digits = "0123456789"
    if family == "kraken":
        name = "".join(random.choice(chars) for _ in range(12))
        return name + ".com"
    elif family == "conficker":
        name = "".join(random.choice(chars) for _ in range(random.randint(5, 8)))
        return name + ".net"
    elif family == "matsnu":
        words = ["apple", "banana", "cherry", "date", "elder", "fig", "grape", "tree", "rock", "stone", "water", "fire"]
        name = random.choice(words) + random.choice(words)
        return name + ".org"
    elif family == "cryptolocker":
        name = "".join(random.choice(chars + digits) for _ in range(7))
        return name + random.choice([".ru", ".info", ".biz"])
    elif family == "suppobox":
        words = ["the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "his", "from", "they"]
        name = random.choice(words) + random.choice(words) + random.choice(words)
        return name + ".net"
    else: # generic fallback
        name = "".join(random.choice(chars + digits) for _ in range(random.randint(8, 20)))
        return name + random.choice(TLDS)

def generate():
    data = []
    base_time = datetime(2025, 1, 1)
    
    # Generate Benign
    for i in range(5000):
        domain = random.choice(BENIGN) if random.random() < 0.2 else f"host{i}.{''.join(random.choices('abcdefghijklmnopqrstuvwxyz', k=5))}.com"
        observed_at = (base_time + timedelta(minutes=i)).isoformat()
        data.append({"domain": domain, "label": 0, "family": "benign", "observed_at": observed_at})
        
    # Generate Malicious by family
    families = ["kraken", "conficker", "matsnu", "cryptolocker", "suppobox", "generic"]
    for i in range(5000):
        family = random.choice(families)
        domain = generate_family_domain(family)
        observed_at = (base_time + timedelta(minutes=i)).isoformat()
        data.append({"domain": domain, "label": 1, "family": family, "observed_at": observed_at})
        
    random.shuffle(data)
    
    with open("data/dga_dataset.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["domain", "label", "family", "observed_at"])
        writer.writeheader()
        writer.writerows(data)
        
if __name__ == "__main__":
    generate()
