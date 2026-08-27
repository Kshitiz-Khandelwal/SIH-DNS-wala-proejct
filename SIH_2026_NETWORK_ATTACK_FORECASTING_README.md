# 🛡️ DNS Shield X-Forecast: AI-Powered Network Attack Forecasting & Sovereign Edge Hardware Sentinel

> **Official SIH 2026 Software Challenge Alignment:**  
> **Problem Statement:** *AI based Network Attack Forecasting from Network Traffic Data*  
> **Previous Baseline:** *Domain Name Server (DNS) Filtering Service using Threat Intel & AI/ML (SIH260003)*  
> **Core Innovation:** Expanding reactive DNS threat filtering into a **proactive, multi-step network attack forecasting engine** backed by a physical **Raspberry Pi + Zephyr RTOS Hardware Sentinel**.  
> **Live SOC Web Application:** [https://dnssecurityproject.vercel.app/app/dashboard](https://dnssecurityproject.vercel.app/app/dashboard) | [Forecast View](https://dnssecurityproject.vercel.app/app/forecast)

---

## 📌 1. Executive Summary & Value Proposition

Traditional Intrusion Detection Systems (IDS) and DNS filters operate **reactively**—they block a packet only after an attack payload or malicious domain has already made contact. 

**DNS Shield X-Forecast** shifts network defense from **reactive blocking** to **preemptive attack forecasting**:
1. **Network Flow & DNS Telemetry Ingestion**: Continuous active inspection of NetFlow/IPFIX, raw PCAP streams, and DNS queries (UDP, DTLS, DoH).
2. **Explainable Real-Time Triage (0–10 ms)**: 7-stage cascade filtering using Bloom caches, STIX/TAXII threat intel, and a 150-Tree Random Forest with exact Additive TreeSHAP explainability.
3. **Temporal Multi-Step Attack Forecasting**: Deep temporal sequence models (LSTM / Temporal Graph Neural Networks) that model the **MITRE ATT&CK Kill Chain** to predict the attacker's next move $5\text{ to }60\text{ minutes}$ before data exfiltration or system compromise occurs.
4. **Sovereign Embedded Hardware Sentinel**: A physical edge appliance combining a **Raspberry Pi 4/5** edge gateway with a **Zephyr RTOS microcontroller** featuring real-time OLED telemetry, multi-color alert indicators, and an **air-gap physical hardware killswitch**.

---

## 🏗️ 2. Current System Architecture (Existing DNS Shield Baseline)

```
                            [Inbound Network / DNS Traffic]
                                           │
                                           ▼
            ┌─────────────────────────────────────────────────────────────┐
            │                  7-STAGE CASCADE ENGINE                     │
            ├─────────────────────────────────────────────────────────────┤
            │ [Stage 1: Bloom Cache & Sovereign Whitelist] (< 0.5 ms)     │
            │   ↳ Instant bypass for isro.gov.in, nic.in, *.vercel.app     │
            │                                                             │
            │ [Stage 2: Threat Intel Correlator] (1–2 ms)                 │
            │   ↳ STIX 2.1 JSON, Abuse.ch URLhaus, CERT-In, RFC 8805 RPZ  │
            │                                                             │
            │ [Stage 3: ML Lexical & TreeSHAP Engine] (2–5 ms)            │
            │   ↳ 38 Features, Shannon Entropy, Levenshtein, TreeSHAP     │
            │                                                             │
            │ [Stage 4: Stateful Behavioral & Tunnelling Engine] (3–8 ms) │
            │   ↳ Sliding window, Base64/Hex markers, burst QPS detection │
            │                                                             │
            │ [Stage 5: Geo-Resolver & Fast-Flux Anomaly] (2–4 ms)        │
            │   ↳ TTL decay (<60s), ASN risk matrix, autonomous hops      │
            │                                                             │
            │ [Stage 6: Safe Active Response & Containment]               │
            │   ↳ Sinkhole 0.0.0.0, Human-in-the-loop quarantine queue    │
            │                                                             │
            │ [Stage 7: Real-Time SOC Telemetry & JSONL Audit Stream]     │
            │   ↳ WebSocket feed, append-only logs, threat ratios         │
            └─────────────────────────────────────────────────────────────┘
```

### Mathematical Formulations Present in Baseline:

#### 1. Shannon Entropy ($H$)
$$H(X) = -\sum_{i=1}^n p(x_i) \log_2 p(x_i)$$
- **Benign Baseline**: $2.5 \dots 3.2\text{ bits}$.
- **DGA / Tunneling Strings**: $> 3.8\text{ bits}$ (Triggers behavioral correlation).

#### 2. Exact TreeSHAP Explainability
$$f(x) = \phi_0 + \sum_{i=1}^{M} \phi_i(x)$$
- Provides mathematical proof of why a domain or packet flow was flagged by decomposing feature contributions into base value $\phi_0$ and per-feature impact $\phi_i$.

#### 3. Levenshtein Edit Distance for Brand Typosquatting
$$\text{lev}_{a,b}(i, j) = \begin{cases} \max(i, j) & \text{if } \min(i, j) = 0, \\ \min \begin{cases} \text{lev}_{a,b}(i-1, j) + 1 \\ \text{lev}_{a,b}(i, j-1) + 1 \\ \text{lev}_{a,b}(i-1, j-1) + 1_{(a_i \neq b_j)} \end{cases} & \text{otherwise.} \end{cases}$$
- Catches lookalike impersonation lures (`rnicrosoft.com`, `g00gle.com`, `paypa1-update.com`).

---

## 🎮 3. Interactive Attack Simulation Suite (Existing CLI)

The project includes an interactive red-team attack simulator (`run_attack_simulation.py`) with 6 built-in vectors:

1. **Benign Corporate / Sovereign Stream**: Verifies fast-path bypass for `isro.gov.in`, `nic.in`, `cert-in.org.in`, and major cloud CDNs.
2. **Cryptolocker / LockBit DGA Burst**: Generates high-entropy pseudo-random algorithmic domains (`xq9m2kz7v4naplq.top`) to test ML classification.
3. **Brand Typosquatting & Homoglyphs**: Generates targeted visual phishing lures (`rnicrosoft.com`, `paypa1-update.com`) to evaluate Levenshtein distance checks.
4. **DNS Tunnelling Data Exfiltration**: Simulates Iodine / dnscat2 Base64 and Hex byte chunks (`YWJjZDEyMzQ1Ng==.attacker-c2.net`).
5. **Cobalt Strike / Lazarus C2 Beaconing**: Tests persistent Command-and-Control heartbeat beacons (`c2-beacon.dark-infra.cc`).
6. **Continuous Red-Team Attack Stream**: Generates a high-concurrency blended attack stream to stress-test real-time SOC dashboard telemetry.

---

## 🔮 4. The Attack Forecasting Pivot (Aligning 100% with SIH 2026)

To fully fulfill the official SIH 2026 statement (**"AI based Network Attack Forecasting from Network Traffic Data"**), the following core modules bridge the gap from single-packet detection to temporal kill-chain forecasting:

```
                           TEMPORAL ATTACK FORECASTING PIPELINE
                           
[Network Packet Flows] ──► [Flow Feature Extractor] ──► [Temporal Session Buffer]
(5-tuple, SYN/ACK, DNS)    (Inter-arrival times, bytes)   (Sliding 15-min Window)
                                                                    │
                                                                    ▼
                                                    [Bi-LSTM / TGNN Forecasting AI]
                                                    (Trained on Multi-Stage Attacks)
                                                                    │
                                                                    ▼
                         ┌─────────────────────────────────────────────────────────────┐
                         │                  PREDICTIVE OUTPUT HORIZON                  │
                         ├─────────────────────────────────────────────────────────────┤
                         │ 1. Current State: Initial Access (Confidence: 94%)          │
                         │ 2. Next Forecasted Stage: C2 Beaconing in +8 mins (87%)     │
                         │ 3. Critical Risk: Lateral Exfiltration in +25 mins (76%)    │
                         │ 4. Anticipated Target: Database Server (192.168.1.50)       │
                         │ 5. Automated Preemptive Rule: Isolate VLAN 4 Egress         │
                         └─────────────────────────────────────────────────────────────┘
```

### 1. Ingestion Beyond DNS (Full Network Traffic Telemetry)
- **NetFlow / IPFIX & PCAP**: Ingestion of 5-tuple flows (`Src IP`, `Dst IP`, `Src Port`, `Dst Port`, `Protocol`).
- **Connection Dynamics**: Flow duration, TCP flag progression (SYN $\to$ SYN-ACK $\to$ ACK $\to$ FIN/RST), packet size skewness, inter-packet arrival time variance.

### 2. Multi-Stage MITRE ATT&CK Sequence Modeling
- **Attack Kill-Chain Stages**:
  $$\text{Reconnaissance} \longrightarrow \text{Initial Access} \longrightarrow \text{Discovery} \longrightarrow \text{C2 Beaconing} \longrightarrow \text{Lateral Movement} \longrightarrow \text{Exfiltration}$$
- **Forecasting Model**: Bidirectional LSTM / Temporal Graph Neural Network (TGNN) predicts:
  - **$P(\text{Stage}_{t+\Delta t} \mid \text{History}_t)$**: Probability distribution of the next attack phase at $t+5\text{m}, t+15\text{m}, t+60\text{m}$.
  - **Blast Radius & Likely Target**: Predicts which subnet or internal node will be targeted next.

### 3. Preemptive Defense Engine
- Rather than waiting for exfiltration to begin, the system executes **anticipatory isolation**:
  - Deploys **honeypot decoy routes** along the predicted lateral path.
  - Pre-stages firewall rules to restrict egress from flagged internal hosts.

---

## ⚡ 5. Hardware Integration: Raspberry Pi + Zephyr RTOS Sentinel

Deploying an **Embedded Physical Hardware Sentinel** elevates the solution into a sovereign, industrial-grade cyber-defense appliance.

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                           SOVEREIGN EDGE HARDWARE SENTINEL                                │
│                                                                                           │
│  ┌───────────────────────────────────────────────────┐                                    │
│  │   Raspberry Pi 4 / 5 (Linux Edge Gateway)         │                                    │
│  │   - eBPF / AF_PACKET real-time network sniffer    │                                    │
│  │   - Edge quantized ONNX / TFLite fast inference   │                                    │
│  │   - Local DNS Resolver & NetFlow Probe            │                                    │
│  └─────────────────────────┬─────────────────────────┘                                    │
│                            │ (UART / I2C / SPI Communication)                             │
│                            ▼                                                              │
│  ┌───────────────────────────────────────────────────┐                                    │
│  │   Zephyr RTOS Microcontroller (ESP32 / STM32 / RP2040)                                 │
│  │                                                   │                                    │
│  │   ├─► 0.96" I2C OLED Display                      │  [Real-Time Threat Level & QPS]    │
│  │   ├─► WS2812B NeoPixel RGB Ring                   │  [Visual Threat Status Spectrum]   │
│  │   ├─► 5V Electromagnetic Relay / Optocoupler      │  [PHYSICAL AIR-GAP KILLSWITCH]     │
│  │   └─► Buzzer / Physical Tamper Sensor             │  [Audible Warning & Physical Trip] │
│  └───────────────────────────────────────────────────┘                                    │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### Hardware Functional Breakdown:
1. **Zephyr RTOS Kernel Advantages**:
   - **Deterministic Real-Time Execution**: Zero-latency interrupt handling for physical alarms and fail-safe trip mechanisms.
   - **Ultra-Low Power & Memory Footprint**: Runs in $<64\text{ KB}$ RAM with hardware-enforced memory protection.
2. **Physical Hardware Air-Gap Killswitch**:
   - When the Central / Edge AI model forecasts an active exfiltration attack with $>95\%$ confidence, a signal is transmitted over the hardware bus to the Zephyr RTOS controller.
   - The Zephyr RTOS trips an electromagnetic relay to physically sever the network trunk, providing guaranteed air-gap protection immune to software tampering.
3. **Live Hardware Telemetry Demo for SIH Judges**:
   - **OLED Screen**: Shows live packet rate, top attack vector, and current forecasting horizon ($+15\text{m}$).
   - **RGB Ring**: Green (Normal) $\to$ Yellow (Anomaly / Recon) $\to$ Pulsing Amber (C2 Beacon) $\to$ Flashing Red (Attack Forecast High).
   - **Physical Killswitch**: Audible mechanical click during live attack demo.

---

## 🗺️ 6. Step-by-Step Implementation Roadmap (Overview)

```
Phase 1: Ingestion & Flow Expansion (NetFlow & Packet Engine)
   ├── Add 5-tuple flow aggregation module (IPFIX / NetFlow / PCAP parser).
   └── Extract temporal flow statistics (inter-arrival variance, byte ratios).

Phase 2: AI Attack Forecasting Engine
   ├── Formulate multi-stage dataset (CIC-IDS / UNSW-NB15 / DNS-Tunneling).
   ├── Train Bi-LSTM / Markov state transition model for Kill-Chain progression.
   └── Implement forecast confidence horizons (+5m, +15m, +60m) with TreeSHAP.

Phase 3: SOC Forecasting Dashboard (Next.js / Tailwind)
   ├── Add Attack Timeline Projection Graph (Confidence cones & predicted milestones).
   ├── Add Blast Radius Topology Map (Visualizing at-risk internal assets).
   └── Add Preemptive Policy Action Panel (One-click anticipatory containment).

Phase 4: Raspberry Pi & Zephyr RTOS Sentinel Firmware
   ├── Implement Zephyr RTOS C application (OLED driver, RGB LED state, Relay driver).
   ├── Implement UART/I2C bridge daemon between Raspberry Pi and Zephyr MCU.
   └── Deploy quantized edge inference (TFLite Micro / ONNX Runtime).

Phase 5: End-to-End Simulation & Evaluation Benchmarks
   ├── Integrate multi-stage attack scenarios into `run_attack_simulation.py`.
   ├── Validate $< 10\text{ ms}$ triage latency and $> 90\%$ forecasting accuracy.
   └── Prepare live demonstration deck and judge presentation flow.
```

---

## 🏆 7. Hackathon Competitive Advantages & Pitch Strategy

| Dimension | Typical Hackathon Project | DNS Shield X-Forecast |
| :--- | :--- | :--- |
| **Approach** | Simple reactive blacklist or basic classifier | **Predictive multi-step kill-chain forecasting ($t+5\text{m} \to t+60\text{m}$)** |
| **Explainability** | Black-box deep learning output | **Exact additive TreeSHAP mathematical feature decomposition** |
| **Sovereignty** | Relies on third-party cloud APIs | **100% self-hosted, on-premise, zero external cloud dependency** |
| **Hardware** | Pure web app / software mockup | **Live Raspberry Pi + Zephyr RTOS Sentinel with physical killswitch** |
| **Testing** | Static mock data | **Live interactive CLI attack simulator with 6+ red-team vectors** |

### Live Judge Demonstration Script:
1. **Normal State**: Show normal network traffic on the SOC Dashboard; Zephyr RTOS hardware glows **Solid Green** with OLED showing healthy QPS.
2. **Reconnaissance & DGA Inception**: Trigger `python run_attack_simulation.py --mode dga`. The 7-stage cascade detects algorithmic entropy; dashboard shows Stage 1 detection; Zephyr RTOS shifts to **Yellow**.
3. **Multi-Stage Attack Forecasting**: The AI forecasting module detects the sequence and issues an **Attack Warning (+15 min Exfiltration Projected)** with a 92% confidence cone; dashboard highlights the target server.
4. **Preemptive Isolation / Hardware Killswitch**: As the simulated attack progresses to C2 beaconing, the system triggers the **Zephyr RTOS Relay**—judges hear the physical click, the RGB ring flashes **Red**, and the infected host is isolated before any data escapes.
