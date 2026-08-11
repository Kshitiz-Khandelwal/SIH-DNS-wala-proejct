# 🚀 Project Ideation & Strategic Blueprint

**Project Name:** AI-Powered Secure DNS Filtering Service  
**Problem Statement:** SIH260003 (ISRO)

This document outlines the strategic approach, architectural blueprint, and unique selling propositions (USPs) that will elevate this project from a standard hackathon submission to an enterprise-grade, winning solution.

---

## 🏆 1. The Winning Strategy (How we beat the competition)

Most teams will focus purely on writing a basic Python script that blocks URLs. To win, our approach must mimic a high-end cybersecurity startup. Judges evaluate based on three pillars:

1. **Visual Proof (The SOC Dashboard):** A DNS filter is invisible backend infrastructure. To impress the judges, we must build a stunning, real-time Security Operations Center (SOC) dashboard. Judges evaluate what they can *see*.
2. **Extreme Performance Awareness:** The problem mandates a **<100ms** lookup time. Building the core resolver in a slow language will lead to failure. We must architect for extreme concurrency and low latency.
3. **Industry Standards over Reinventing the Wheel:** We will not build a Threat Intel database from scratch. We will integrate with industry standards like **MISP (Malware Information Sharing Platform)** and use standard protocols (STIX/TAXII), proving we understand enterprise security ecosystems.

---

## 🏗️ 2. Architectural Blueprint (Microservices Stack)

To achieve high performance and scalability, the system will be divided into modular microservices.

### A. The Core DNS Resolver (The Engine)
- **Tech Stack:** Go (Golang) / Rust, or a custom plugin for **CoreDNS**.
- **Role:** This is the frontline interceptor. It receives the DNS requests (over UDP, DoH, or DoT). It must be lightning-fast. It prioritizes checking the Cache first, then the Threat Intel list, and only asks the ML Engine if the domain is entirely unknown.

### B. The Speed Layer (The Cache)
- **Tech Stack:** Redis (In-Memory Datastore).
- **Role:** Stores previously resolved safe domains and known blacklisted domains. Redis ensures that 95% of queries are answered in < 5 milliseconds, guaranteeing we stay well under the 100ms limit.

### C. Threat Intelligence Service (The Librarian)
- **Tech Stack:** Python + MISP Integration.
- **Role:** A background cron-job service that continuously ingests STIX/TAXII feeds from global threat databases (e.g., IBM X-Force, AlienVault OTX). It parses these feeds and updates the Redis blacklist automatically.

### D. The AI/ML Engine (The Brain)
- **Tech Stack:** Python (FastAPI), Scikit-Learn / XGBoost.
- **Role:** When the Core Resolver encounters a zero-day (never before seen) domain, it queries this API. The model performs Lexical Analysis (checking entropy, n-grams, Levenshtein distance) to detect DGAs (Domain Generation Algorithms) and Typosquatting in real-time. We use lightweight models (XGBoost/Random Forest) to ensure inference takes < 20ms.

### E. Analytics & Passive Analysis (The Historian)
- **Tech Stack:** ELK Stack (Elasticsearch, Logstash, Kibana) or ClickHouse.
- **Role:** Stores all DNS logs. Capable of ingesting offline PCAP/Zeek TSV files to run historical analyses, identifying if a network was breached in the past.

---

## ⭐ 3. The "X-Factors" (Our Unique Innovations)

These are the features that will make the judges say "Wow" and separate us from the pack.

### I. Explainable AI (XAI)
- **The Concept:** Instead of a black-box ML model that simply outputs "Blocked," our dashboard will explain *why*. 
- **Example:** `"Blocked xkqz.com. Reason: ML Confidence 94%. High Entropy (too random) and abnormal Vowel-to-Consonant ratio."` This proves deep understanding of the ML models to the judges.

### II. "Honeypot" Sinkholing (Active Deception)
- **The Concept:** When malware requests the IP for its Command-and-Control (C2) server, most DNS filters return `0.0.0.0` to drop the connection. 
- **Our Innovation:** We resolve the malicious request to a safe, isolated "Honeypot" server on our network. The malware connects, thinking it reached the hacker, allowing us to actively monitor and log what data the malware is trying to steal.

### III. Live 3D Threat Map (Eye-Candy)
- **The Concept:** The frontend will feature a dark-themed, interactive 3D globe (using Three.js or Mapbox).
- **Our Innovation:** Every time a malicious DNS request is blocked, the dashboard visualizes a laser shooting from the local network to the geographic location of the malicious IP. This creates a highly engaging, professional SOC experience.

---

## 📅 4. Suggested Implementation Phases

1. **Phase 1: The Foundation**
   - Set up the basic CoreDNS server.
   - Implement basic Redis caching and a simple static blacklist.
2. **Phase 2: Intelligence & AI**
   - Build the STIX/TAXII ingestion script.
   - Train the ML model on known DGA datasets and deploy as a FastAPI microservice.
3. **Phase 3: The SOC Dashboard**
   - Build the web interface.
   - Implement the 3D Threat Map and Explainable AI metrics.
4. **Phase 4: Advanced Protocols & Polish**
   - Enable DNS over HTTPS (DoH) and DNS over DTLS.
   - Finalize the PCAP parsing feature for passive analysis.
