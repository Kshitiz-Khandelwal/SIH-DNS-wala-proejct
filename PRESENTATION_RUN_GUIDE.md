# 🎤 DNS Shield — New Laptop & Hackathon Presentation Setup Guide

---

## ⚡ Option A: ZERO-SETUP Cloud Presentation (Recommended for Live Demos)
If the presentation laptop does not have Node.js or Python installed, simply open Google Chrome and navigate to the live Vercel deployment:

👉 **[https://sih-dns-wala-proejct-uhas.vercel.app/console/index.html](https://sih-dns-wala-proejct-uhas.vercel.app/console/index.html)**

### Key URLs to Bookmark for Presentation:
- **Overview & Attack Simulator**: `https://sih-dns-wala-proejct-uhas.vercel.app/console/index.html`
- **Explainable AI (TreeSHAP Telemetry)**: `https://sih-dns-wala-proejct-uhas.vercel.app/console/xai.html`
- **Quarantine Approval Queue**: `https://sih-dns-wala-proejct-uhas.vercel.app/console/quarantine.html`
- **7-Stage Pipeline Architecture**: `https://sih-dns-wala-proejct-uhas.vercel.app/console/pipeline.html`

---

## 💻 Option B: Complete Local Run on a Fresh Laptop (Step-by-Step)

Follow these exact steps when cloning the repository onto a new laptop.

### Step 1: Clone the Repository & Open Project Directory
Open your terminal / Command Prompt:
```bash
git clone https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct.git
cd SIH-DNS-wala-proejct
```

---

### Step 2: Start the Web Application (Terminal 1)

1. Open **Terminal 1**.
2. Navigate into the `frontend` folder:
   ```bash
   cd frontend
   ```
3. Install dependencies (first time only):
   ```bash
   npm install
   ```
4. Start the local server:
   ```bash
   npm run dev
   ```
5. Open your browser to:
   👉 **[http://localhost:3000/console/index.html](http://localhost:3000/console/index.html)**

---

### Step 3: Run the Red-Team Attack Simulator (Terminal 2)

1. Open **Terminal 2**.
2. Make sure you are in the root `SIH-DNS-wala-proejct` directory:
   ```bash
   cd SIH-DNS-wala-proejct
   ```
3. Setup Python environment (first time only):
   - **On Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     pip install -r requirements.txt
     ```
   - **On Mac / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     pip install -r requirements.txt
     ```

4. Launch the Attack Simulator:
   ```bash
   python run_attack_simulation.py
   ```

5. Select **Option 6 (Continuous Live Red-Team Stream)**:
   - Watch the terminal fire attack queries.
   - Look at your browser (`http://localhost:3000/console/index.html`): the Live Query Stream table will flash red/amber/green and update metrics in real time!

---

## 🏆 Summary of Hackathon Presentation Flow

1. **Show Overview & Attack Simulator** (`/console/index.html`):
   - Click **`Benign Lookup`**, **`DGA Generation`**, **`Typosquatting`**, **`DNS Tunnelling`**, **`C2 Beaconing`**.
   - Show the live telemetry result banner with Threat Actor, MITRE Technique, and ML Decision.

2. **Show TreeSHAP Explainability** (`/console/xai.html`):
   - Type any domain (or paste `https://sih-dns-wala-proejct-uhas.vercel.app/stitch/pipeline.html` or `evil-corp.xyz`).
   - Click **"Run Live Model Inference"**.
   - Explain the exact mathematical decomposition: $f(x) = \phi_0 + \sum \phi_i$.

3. **Show Safe Quarantine & Active Response** (`/console/quarantine.html`):
   - Demonstrate Human-in-the-Loop **"Approve Quarantine"** and **"Dismiss as FP"**.
   - Show the 15-minute auto-rollback countdown timer guaranteeing zero network outage.
