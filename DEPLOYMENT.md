# DNS Shield — Production & Cloud Deployment Guide 🚀

This document details how to deploy DNS Shield to the cloud for live demonstrations, hackathon presentations, and production workloads.

---

## 🌟 Option 1: 1-Click Free Cloud Deployment via Vercel (Recommended)

The frontend and Serverless `/api/v1/*` inference endpoints can be deployed to Vercel in under 60 seconds with zero server management:

### Steps:
1. Go to **[vercel.com/new](https://vercel.com/new)** and sign in with your GitHub account.
2. Under **"Import Git Repository"**, select:
   - **`Kshitiz-Khandelwal/SIH-DNS-wala-proejct`**
3. Configure project settings:
   - **Framework Preset**: *Next.js* (Auto-detected)
   - **Root Directory**: Click **Edit** and set to **`frontend`** *(or leave default, pre-configured in `vercel.json`)*
   - **Build Command**: `next build` (Auto-detected)
   - **Output Directory**: `.next` (Auto-detected)
4. Click **Deploy**.

> **Result**: You will get a live HTTPS URL (e.g. `https://sih-dns-shield.vercel.app`) with automatic CI/CD on every git commit.

---

## 🐳 Option 2: Full-Stack Docker Compose (Microservices + Redis + Gateway)

To run the entire distributed 7-stage microservice architecture (FastAPI engines, Redis cache, and Next.js UI) on any VPS (AWS EC2, DigitalOcean, Azure, or Local Server):

### Prerequisites:
- Docker & Docker Compose installed.

### Commands:
```bash
# Clone repository
git clone https://github.com/Kshitiz-Khandelwal/SIH-DNS-wala-proejct.git
cd SIH-DNS-wala-proejct

# Start all microservices in detached mode
docker-compose -f infra/docker-compose.yml up -d --build
```

### Deployed Service Map:
| Service | Port | Description |
|---|---|---|
| **SOC Dashboard & Stitch UI** | `:3000` | Next.js 16 Web Application |
| **API Gateway Orchestrator** | `:8080` | Synchronous 7-stage Pipeline Gateway |
| **Redis Murmur3 Bloom Cache** | `:6379` | In-memory Cache & Bloom Filter |
| **ML Lexical Classifier** | `:8000` | Random Forest Feature Extractor |
| **Behavioral Sliding Window** | `:8001` | Device Tunnelling & Beacon Detector |
| **Geo & ASN Intelligence** | `:8002` | IP Autonomous System Classifier |
| **Threat Intelligence Feeds** | `:8003` | STIX 2.1 / RPZ Feed Syncer |
| **Active Response Engine** | `:8004` | Sinkholing & Endpoint Quarantine |
| **Analytics & Telemetry** | `:8005` | Real-time Metric Storage |

---

## ☁️ Option 3: Deploying on Render / Railway

### Render:
1. Create a **New Web Service** connected to your GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Set **Build Command** to `npm install && npm run build`.
4. Set **Start Command** to `npm run start`.
5. For Redis: Add a free **Render Redis** instance and set `REDIS_URL` in environment variables.

### Railway:
1. Create a **New Project** $\rightarrow$ **Deploy from GitHub repo**.
2. Select `SIH-DNS-wala-proejct`.
3. Add a **Redis** plugin from the Railway dashboard.
4. Deploy!

---

## 🔍 Verification & Health Checks

Once deployed, verify that the health and live telemetry endpoints return `200 OK`:
- **Dashboard**: `https://<your-domain>/stitch/index.html`
- **Stats API**: `https://<your-domain>/api/v1/stats`
- **Query Evaluation API**: `https://<your-domain>/api/v1/query?domain=api.github.com`
- **Feed Health API**: `https://<your-domain>/api/v1/feed-health`
