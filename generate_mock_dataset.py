import csv
import random
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

def generate_dga():
    length = random.randint(8, 20)
    chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    name = "".join(random.choice(chars) for _ in range(length))
    return name + random.choice(TLDS)

def generate():
    data = []
    base_time = datetime(2025, 1, 1)
    
    # Generate Benign
    for i in range(5000):
        domain = random.choice(BENIGN) if random.random() < 0.2 else f"host{i}.{"".join(random.choices('abcdefghijklmnopqrstuvwxyz', k=5))}.com"
        observed_at = (base_time + timedelta(minutes=i)).isoformat()
        data.append({"domain": domain, "label": 0, "observed_at": observed_at})
        
    # Generate Malicious
    for i in range(5000):
        if random.random() < 0.1:
            domain = random.choice(MALICIOUS_PATTERNS) + random.choice(TLDS)
        else:
            domain = generate_dga()
        observed_at = (base_time + timedelta(minutes=i)).isoformat()
        data.append({"domain": domain, "label": 1, "observed_at": observed_at})
        
    random.shuffle(data)
    
    with open("data/dga_dataset.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["domain", "label", "observed_at"])
        writer.writeheader()
        writer.writerows(data)
        
if __name__ == "__main__":
    generate()
