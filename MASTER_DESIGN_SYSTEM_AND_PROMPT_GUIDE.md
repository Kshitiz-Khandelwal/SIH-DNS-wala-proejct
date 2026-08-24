# 🛡️ DNS Shield X-Forecast — Master Design System & AI Generation Prompt Guide

> **Purpose of this Document:** This single comprehensive markdown file contains the complete product vision, architectural specifications, technical work completed, design system tokens, and detailed reference websites. Pass this document to any AI model or designer to generate or recreate the entire **DNS Shield X-Forecast** sovereign SOC cyber-command platform.

---

## 📌 1. Product Vision & Problem Statement

### **Product Name:** DNS Shield X-Forecast
### **Target Domain:** Sovereign Cyber-Command & Predictive Network Attack Forecasting (Smart India Hackathon SIH 2026)
### **Core Objective:**
DNS Shield X-Forecast is an enterprise, military-grade Sovereign Cyber-Command Center and Predictive Anomaly Detection platform. It provides real-time protection for sovereign Indian network infrastructure (NIC, ISRO, Defense, CERT-In, and ISP DNS resolvers) by combining:
1. **Sub-Millisecond 7-Stage Cascade Detection Pipeline** ($<1.42\text{ms}$ average latency).
2. **AI Attack Forecasting Engine**: Predictive MITRE ATT&CK 6-Stage sequence modeling ($t=0\text{m}, +15\text{m}, +30\text{m}, +60\text{m}$).
3. **Hardware Sentinel Integration**: Zephyr RTOS edge probe simulator with OLED display, WS2812B NeoPixel RGB threat beacon, and physical 5V electromechanical air-gap isolation relay.
4. **Explainable AI (XAI)**: Mathematical TreeSHAP feature attributions and Shannon entropy ($H(X)$) calculations.
5. **CERT-In Compliance Engine**: Automated cyber incident reporting template adhering to Section 70B of the IT Act, 2000 (Rule 2022).

---

## 🛠️ 2. Summary of Work Done

### **Architecture & Tech Stack**
- **Frontend Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling & Motion:** Tailwind CSS v4, Framer Motion (`framer-motion`), Lucide Icons (`lucide-react`), Google Fonts (`Geist`, `Inter`, `JetBrains Mono`)
- **Backend Service:** FastAPI / Python (Uvicorn daemon running at `http://127.0.0.1:8000`)
- **Repository:** [`https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct.git`](https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct.git) (`main` branch)

### **Key Platform Views Implemented**
1. **`Overview` (`/app/dashboard` or `index.html`)**: Real-time QPS particle waveform canvas, 4 kinetic KPI cards, live query stream matrix with filter pills, and red-team attack payload injector.
2. **`Attack Forecasting` (`/app/forecast` or `forecast.html`)**: MITRE ATT&CK 6-stage kill-chain timeline rail, Additive TreeSHAP table, canvas blast-radius graph, and Zephyr RTOS OLED / NeoPixel / 5V Air-Gap Relay simulator.
3. **`7-Stage Cascade Pipeline` (`/app/pipeline` or `pipeline.html`)**: Sub-millisecond latency waterfall gauges ($\mu s$) and interactive step-through query debugger sandbox.
4. **`Threat Intelligence` (`/app/threats` or `threats.html`)**: 5 Sovereign feed health cards (CERT-In, NCIIPC, AlienVault OTX, URLhaus, AbuseIPDB), live IOC explorer, and Shannon Entropy calculator.
5. **`Explainable AI (XAI)` (`/app/xai` or `xai.html`)**: Global feature importance radar, TreeSHAP feature weights, decision threshold sensitivity slider ($0.0 \to 1.0$).
6. **`Model Rationale` (`/app/models` or `models.html`)**: Bi-LSTM + Random Forest + Markov Chain architecture cards, LaTeX mathematical equations, and academic benchmark comparison table.
7. **`Quarantine Queue` (`/app/quarantine` or `quarantine.html`)**: Isolated host cards with ticking **15-minute countdown auto-rollback lease timers** and one-click approve/release actions.
8. **`Device Fleet & IPAM` (`/app/devices` or `devices.html`)**: Subnet CIDR visual matrix (`192.168.1.0/24`, `10.0.0.0/16`, `172.28.0.0/16`) and searchable device inventory with flow tracing.
9. **`Query Analytics` (`/app/analytics` or `analytics.html`)**: 24-Hour stacked query volume time-series area chart, DNS record type distribution donut, and top talkers.
10. **`Shift Reports & CERT-In` (`/app/reports` or `reports.html`)**: Official Indian CERT-In Cyber Incident Reporting compliance document builder with Print/PDF export.

---

## 🎨 3. The 4 Reference Systems & Reference Websites

The visual design system is a high-taste fusion of **4 master design reference systems**:

### **Reference 1: Emil Kowalski Motion & Interaction Suite**
- **Website / Source:** [`https://animations.dev/`](https://animations.dev/)
- **Local Path:** `.reference/emilkowalski-skills/`
- **Key Principles Applied:**
  - **Tactile Button Compression:** Every interactive button features `:active { transform: scale(0.96); }` or `whileTap={{ scale: 0.96 }}` using snappy spring curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - **Particle Flow Waveforms:** Real-time animated canvas elements for traffic waveforms and projected attack blast radius.
  - **Pulsating Radar Beacons:** Glowing status indicators with infinite CSS radar pulses (`radar-beacon`).

### **Reference 2: Impeccable Frontend Engineering by Paul Bakaus**
- **Website / Source:** [`https://impeccable.dev/`](https://impeccable.dev/)
- **Local Path:** `.reference/impeccable/`
- **Key Principles Applied:**
  - **Strict 4px Spacing Scale:** Layout spacing strictly follows 4, 8, 12, 16, 20, 24, 32, 48px increments.
  - **Zero CLS & Layout Stability:** Container heights and skeleton states prevent layout shift during live data polling.
  - **Data Telemetry Grid:** 11px vertical table padding, mono uppercase headers, mono font for numbers/IPs/timestamps, and pill status badges.

### **Reference 3: Taste Skill Aesthetic Mastery by Leonxlnx**
- **Local Path:** `.reference/taste-skill/`
- **Key Principles Applied:**
  - **Deep Obsidian Palette:** Background `#070a12`, Sidebar `#0b0f19`, Cards `#0e1424`, Hairline Borders `rgba(255,255,255,0.08)`.
  - **Glassmorphism & Depth:** Cards use `backdrop-blur-xl` with hairline white inset borders (`inset 0 1px 0 0 rgba(255,255,255,0.05)`).
  - **Curated Typography:** Headings in `Geist` / `Inter`, Telemetry in `JetBrains Mono`.

### **Reference 4: VoltAgent Awesome DESIGN.md Collection** *(NEW)*
- **Website / Source:** [`https://github.com/voltagent/awesome-design-md`](https://github.com/voltagent/awesome-design-md)
- **Local Path:** `.reference/awesome-design-md/`
- **Key Products Referenced:**
  - **Linear.app:** Sleek dark precision cards, high-contrast typography hierarchy, card hover lifts (`translateY(-2px)`), pill filter tabs (`ALL`, `ALLOW`, `FLAG`, `BLOCK`).
  - **Warp Terminal:** Monospace cyber telemetry matrix with glowing numerical text (`text-shadow: 0 0 16px rgba(96,165,250,0.4)`).
  - **Raycast:** Quick command search bar (`⌘K`) in the top navigation header.
  - **Supabase:** Neon status badges with outer glow (`badge-clean`, `badge-flag`, `badge-block`, `badge-forecast`).

---

## 🎨 4. Master Design Tokens & CSS Code

Pass this exact CSS system to any AI generator or drop it into `globals.css`:

```css
/* ==========================================================================
   DNS SHIELD X-FORECAST — MASTER 4-REFERENCE DESIGN SYSTEM
   Fuses: Linear.app + Warp + Supabase + Raycast + Emil Kowalski Physics
   ========================================================================== */

@import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');

:root {
  --bg-main:         #070a12;  /* Deep Obsidian */
  --bg-sidebar:      #0b0f19;  /* Command Rail */
  --bg-card:         #0e1424;  /* Frosted Surface */
  --bg-card-hover:   #141c33;  /* Hover Slate */
  --bg-card-subtle:   #111827;  /* Inner Container */
  --border-subtle:   rgba(255, 255, 255, 0.08);
  --border-accent:   rgba(59, 130, 246, 0.35);
  
  --text-primary:     #f8fafc;
  --text-body:        #cbd5e1;
  --text-muted:       #94a3b8;
}

/* Master Dot Grid Background with Radial Mesh Glow */
.dot-grid {
  background-color: #070a12;
  background-image: 
    radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 60%),
    radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.08) 1px, transparent 0);
  background-size: 100% 100%, 24px 24px;
}

/* Linear.app Glass Cards */
.glass-card {
  background-color: #0e1424;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.glass-card:hover {
  border-color: rgba(59, 130, 246, 0.35);
  transform: translateY(-2px);
}

/* Warp Terminal Glowing Metrics */
.metric-glow-blue    { color: #60a5fa; text-shadow: 0 0 16px rgba(96, 165, 250, 0.4); }
.metric-glow-emerald { color: #34d399; text-shadow: 0 0 16px rgba(52, 211, 153, 0.4); }
.metric-glow-purple  { color: #c084fc; text-shadow: 0 0 16px rgba(192, 132, 252, 0.4); }
.metric-glow-amber   { color: #fbbf24; text-shadow: 0 0 16px rgba(251, 191, 36, 0.4); }
.metric-glow-rose    { color: #fb7185; text-shadow: 0 0 16px rgba(251, 113, 133, 0.4); }

/* Supabase Accent Badges */
.badge-clean    { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }
.badge-flag     { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); box-shadow: 0 0 10px rgba(245, 158, 11, 0.2); }
.badge-block    { background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); box-shadow: 0 0 10px rgba(244, 63, 94, 0.2); }
.badge-forecast { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); box-shadow: 0 0 10px rgba(168, 85, 247, 0.2); }

/* Emil Kowalski Tactile Button Physics */
button, a.btn-interactive {
  transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease !important;
}
button:active, a.btn-interactive:active {
  transform: scale(0.96) !important;
}

/* Pulsating Radar Beacon */
.radar-beacon {
  animation: radar-pulse 2s infinite;
}
@keyframes radar-pulse {
  0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70%  { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
```

---

## 🤖 5. Turnkey AI Generation Prompt

Copy and paste the prompt below into any AI model to generate/recreate the website:

```markdown
Role: Elite Cyber-Command Frontend Architect & Motion Engineer.

Task: Build a Next.js (App Router, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui, Lucide Icons) Dashboard for "DNS Shield X-Forecast" — a Sovereign Cyber-Command and Predictive Attack Forecasting platform for India's SIH 2026 problem statement.

Design References & System Specifications:
1. Linear.app Aesthetics: Deep obsidian dark background (#070a12), glass cards (#0e1424 with hairline white inset border), subtle hover lifts (translateY(-2px)), and Linear filter pills (ALL, ALLOW, FLAG, BLOCK, FORECAST).
2. Warp Terminal Telemetry: High-contrast monospace numerical metrics (JetBrains Mono) with glowing text shadows (metric-glow-blue, metric-glow-emerald, metric-glow-purple, metric-glow-rose).
3. Raycast Command Palette: Header with quick search input (⌘K to search telemetry...).
4. Supabase Glow Badges: Status pills with ambient outer glow (badge-clean, badge-flag, badge-block, badge-forecast).
5. Emil Kowalski Motion Physics: Framer Motion staggered entrance animations (initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}), tactile button press compression (whileTap={{ scale: 0.96 }}), and animated radar beacons.
6. Impeccable Craft: Strict 4px spacing scale, 11px vertical table padding, mono typography for metrics/IPs/timestamps, zero CLS, and complete component state completeness.

Dashboard Layout Structure:
- Top Header: Node status pill, Live QPS counter (24,100 Q/s), 1.42ms SLA metric, Raycast ⌘K search bar.
- KPI Grid (4 Cards):
  1. Clean Queries: 1,284,910 (99.2% benign, +4.2%)
  2. Heuristic Flagged: 10,807 (SOC review, +3.7%)
  3. Blocked Zero-Day: 8,007 (DGA & Tunneling, -0.2%)
  4. Pipeline Latency SLA: 1.42ms (Sub-ms SLA Met)
- Synthetic Red-Team Injector: 5 interactive simulation buttons (Sovereign Whitelist, DGA Generation, Typosquat Phish, Base64 Tunneling, C2 Beaconing) with visual execution results.
- Live Query Stream Table: Monospace timestamps, queried FQDN, client IP, risk score (/100), verdict badges, and domain inspection link.
- Right Bento Panel:
  1. Threat Category Proportions (DGA 42%, Tunneling 31%, C2 18%, Phishing 9%) with glowing neon progress bars.
  2. Critical Threat Alert List.
  3. 7-Stage Cascade Pipeline Latencies (<0.1ms down to 1.42ms).

Output complete, unabridged, production-grade TypeScript React code with zero placeholders.
```
