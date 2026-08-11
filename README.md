# SIH 2024: DNS Filtering Service using Threat Intelligence & AI/ML

**Problem Statement ID:** SIH260003  
**Organization:** Indian Space Research Organisation (ISRO)  
**Category:** Software, Space Technology  

This repository contains the ideation, architectural plans, and core concepts for building a secure, AI-powered DNS Filtering Service.

## 🎯 Core Objectives
- Build a secure DNS resolver (supporting DoH, DoT, UDP).
- Filter malicious domains using Threat Intelligence (STIX/TAXII) and Blacklists.
- Leverage AI/ML to detect zero-day threats like DGAs.
- Detect and block DNS Tunnelling.
- Maintain ultra-low latency (<100ms) with DNS caching.
- Provide Live (Active) and Log-based (Passive) analysis via a Web Dashboard.

---

## 🛡️ Detailed Attack Vectors & How They Work

To build an effective DNS filter, we must deeply understand the attacks we are defending against. Below is a detailed breakdown of the primary threats our system will neutralize.

### 1. Command-and-Control (C2) Callbacks
**What it is:** When a device is infected with malware (like ransomware or a botnet), the malware needs to communicate with the hacker's server (the C2 server) to receive instructions, encryption keys, or to send stolen data.
**How they do it:** The malware is programmed to reach out to a specific domain (e.g., `update-server-malicious.com`). It sends a DNS request to find the IP address of this server.
**How we block it:** Our Threat Intelligence feeds (STIX/TAXII) and static blacklists will have records of known C2 domains. When the DNS query comes in, our system matches it against the list and blocks the resolution, neutralizing the malware's ability to communicate.

### 2. Domain Generation Algorithms (DGA)
**What it is:** Hackers know that static C2 domains get blacklisted quickly. To evade this, malware uses an algorithm to generate thousands of random-looking domains daily (e.g., `xkqjz1298dh.com`). The hacker only registers one of them.
**How they do it:** The infected machine attempts to resolve hundreds of these domains until it finds the one that is active. Because the domains change constantly, static human-made blacklists are useless.
**How we block it:** We deploy **Machine Learning (ML)** models trained on lexical analysis. The ML model calculates the entropy, vowel-to-consonant ratios, and n-gram distribution of the domain name. If it looks machine-generated rather than human-readable, the system assigns a high risk score and blocks it.

### 3. Phishing and Typosquatting (Homograph Attacks)
**What it is:** Deceiving users into entering credentials on a fake website that looks identical to a legitimate one.
**How they do it:** Attackers register domains that look visually similar to trusted brands. 
- *Typosquatting:* `goooooogle.com`, `faceb00k.com`
- *Homograph Attacks:* Using Cyrillic or similar Unicode characters that look exactly like standard Latin letters (e.g., `apple.com` where the 'a' is a Cyrillic 'а').
**How we block it:** 
- **Threat Feeds:** Newly registered phishing domains are rapidly added to intelligence feeds.
- **AI/ML Lexical Analysis:** Our models will calculate the Levenshtein distance (string similarity) against top 1000 Alexa domains. If a domain is unusually close to a major brand but isn't the brand itself, it is flagged as suspicious.

### 4. DNS Tunnelling
**What it is:** Sneaking data past firewalls by hiding it inside the DNS protocol itself.
**How they do it:** Firewalls usually let DNS traffic (port 53) pass freely. An attacker wants to steal a password ("P@ssword123"). They encode it (e.g., base64: `UEBzc3dvcmQxMjM=`) and make a DNS query for `UEBzc3dvcmQxMjM=.hacker-server.com`. The hacker's DNS server receives the query, logs the encoded password, and the data is stolen without ever establishing a standard web connection.
**How we block it:** **Behavioral Analysis.** Our system will analyze the payload and traffic patterns. We look for:
- Unusually long subdomains (which are carrying the encoded data).
- High volume of DNS requests to the same root domain from a single IP.
- Unusual character distributions in the query payload.

### 5. Fast Flux DNS
**What it is:** A technique used by botnets to hide their phishing and malware delivery sites behind an ever-changing network of compromised hosts acting as proxies.
**How they do it:** The attacker constantly changes the IP addresses associated with a single malicious domain name (sometimes every few minutes) by rapidly updating DNS A-records with very low Time-To-Live (TTL) values.
**How we block it:** While Fast Flux evades IP blocking, it still relies on a single or a few Domain Names. Our DNS filter blocks the domain resolution itself, rendering the changing IP addresses completely irrelevant.

### 6. Eavesdropping and DNS Spoofing (Man-in-the-Middle)
**What it is:** Attackers intercepting plain-text DNS requests to spy on user activity or redirect them to fake IP addresses.
**How they do it:** Because traditional DNS over UDP is unencrypted, anyone on the local network (like a public Wi-Fi) can read the queries or alter the responses before they reach the user.
**How we block it:** Our resolver implements **DNS over HTTPS (DoH)** and **DNS over DTLS**. This encrypts the DNS query between the client and our resolver, ensuring privacy and preventing tampering in transit.
