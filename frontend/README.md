# DNS Shield Frontend

Next.js frontend for DNS Shield — explainable DNS threat detection with a public landing page and authenticated SOC console.

## Stack

- Next.js 16 (App Router)
- Tailwind CSS v4
- TypeScript

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the landing page.

**SOC Console:** Click "Go to Dashboard" → sign in with any credentials → `/app/queue`.

## Routes

| Route | Description |
|---|---|
| `/` | Landing page with live pipeline demo |
| `/login` | Analyst authentication |
| `/app/queue` | Live query stream (default console view) |
| `/app/domain/:id` | Threat investigation deep-dive |
| `/app/models` | Model provenance & feed health |
| `/app/settings` | Thresholds, simulators, passive analysis |

## API

Mock API routes live under `/api/v1/*` for local development. Point `NEXT_PUBLIC_API_URL` at your backend when ready.

| Endpoint | Method |
|---|---|
| `/api/v1/query` | POST |
| `/api/v1/stats` | GET |
| `/api/v1/events` | GET |
| `/api/v1/events/:id` | GET |
| `/api/v1/events/:id/feedback` | POST |
| `/api/v1/feed-health` | GET |
| `/api/v1/models/metadata` | GET |
| `/api/v1/settings/thresholds` | GET/PUT |
| `/api/v1/simulate` | POST |

## Design system

Colors, typography, and signature components (`PipelineCascade`, `LexicalScan`, `VerdictBadge`) follow the DNS Shield v2 spec.
