# Docs & Presentation — What I'd Fix Before Judges See This

Read through `README.md` and cross-checked its claims against the actual
repo contents (same method as the ML audit: verify, don't assume). Found one
issue that's genuinely risky for a hackathon presentation, plus a few smaller
ones. Fixing docs to *sound* better isn't useful if the numbers don't survive
a judge opening `data/` or running `docker-compose up` — so I prioritized
accuracy over polish, then polished on top of that.

## The big one: six docs repeat a dataset/model claim that doesn't exist in the repo

`README.md`, `DATASET_CARD.md`, `DATASET_AND_MODEL_SPECS.md`,
`SYSTEM_ARCHITECTURE_GUIDE.md`, `MODEL_CARD.md`, and `AGENT_HANDOFF.md` all
state:

> Total Corpus Size: **1,350,000 domains** (750,000 Benign / 600,000
> Malicious DGA) · 142.8 MB Parquet / 485.4 MB raw · Model Artifact:
> `dga_rf_150.joblib` (ONNX, 28.4 MB) · Accuracy 99.42%, Precision 0.9931,
> Recall 0.9905, F1 0.9918

None of this exists in the repo:

```
$ du -sh data/*.csv
452K   data/dga_dataset.csv        # 10,001 rows, not 1.35M
8.0K   data/tiny_dataset.csv       # 99 rows — this is what was actually trained
$ find . -iname "*dga_rf_150*" -o -iname "*.onnx"
(nothing found — no ONNX file anywhere in the repo)
```

This looks like planning-doc language (maybe from an early spec or an
AI-assisted scaffolding pass) that never got reconciled with what was
actually built, and then got copy-pasted across six files. **This is the
single highest-risk item in your whole submission.** A technical judge who
clones the repo and runs `du -sh data/` or greps for `.onnx` will find the
opposite of what's claimed in six separate documents — that reads as
fabrication, not as an unfinished feature, and it's the kind of thing that
can sink an otherwise strong project's credibility on the spot. Vague or
modest numbers are fine; numbers that contradict the actual files in the
repo are not.

**What I did:** rewrote `README.md` with the real, verifiable numbers (see
`README.md` in this bundle) — 10,001-row `dga_dataset.csv`, real retrained
`dga-v2` metrics, and the honest cross-family generalization number
(97.2% recall on entirely unseen DGA families), which is a genuinely strong,
defensible thing to say to judges specifically *because* it's real. I did
**not** rewrite the other five docs (`MODEL_CARD.md`, `DATASET_CARD.md`,
`DATASET_AND_MODEL_SPECS.md`, `SYSTEM_ARCHITECTURE_GUIDE.md`,
`AGENT_HANDOFF.md`) — that's a bigger pass and I didn't want to guess at
content you might still want to write. But **please find/replace the
1,350,000 / 750,000 / 600,000 / dga_rf_150 / 99.42% figures in those five
files before presenting**, or pull them from the demo path entirely (e.g.
mark `AGENT_HANDOFF.md` as an internal planning doc, not a judge-facing one).

## Second issue: three separate UI codebases, and the ones wired together don't match

I found three different frontend implementations covering the same feature
set (dashboard, XAI panel, threats, devices, quarantine, forecast, reports):

| Folder | Files | Last touched | What actually uses it |
|---|---|---|---|
| `dashboard/` | 4 files (stub: `page.js`, `layout.js`, `style.css`, `ThreatGlobe.jsx`) | Aug 12 | **`infra/docker-compose.yml` builds this one**, serves it on port 3000 |
| `frontend/` | 31 files, full route tree (dashboard/xai/pipeline/queue/quarantine/forecast/reports/analytics/devices/threats/models/login) | Aug 27 (most recent) | `vercel.json` builds this one for the live Vercel deployment |
| `public/*.html` + `public/console/` | static HTML mirror of the same page set | Aug 24 | **Nothing in the repo builds or deploys this** — but `README.md`'s "Live Demo" link points at `.../console/index.html` |

Practical implications:
- Anyone running your full local stack via `docker-compose up` (the setup
  path your own README recommends) sees the 4-file stub dashboard, **not**
  the fully-featured one with XAI/forecast/quarantine pages. If you demo
  locally, you're demoing the wrong UI.
- `frontend/public/` (the folder Vercel actually serves as static assets)
  has no `console/` subfolder at all — so the "Live Demo" link in your
  README's first section very likely points at a path that doesn't exist in
  your current Vercel deployment. I couldn't fetch the live URL directly to
  confirm the exact failure mode, but the build config makes it structurally
  very unlikely to resolve — **please click it yourself before presenting**.

**Recommendation:** pick one UI as canonical (given `frontend/` is the most
complete and most recently touched, and it's what Vercel already deploys,
it's the obvious choice) and either delete `dashboard/` and `public/*.html`
or clearly label them "legacy/archived" in the repo structure section so
nobody — including a teammate — builds on the wrong one. Then point
`docker-compose.yml`'s `dashboard:` service at `../frontend` instead of
`../dashboard`, and fix the README's Live Demo link to point at wherever
`frontend/` actually serves its root page.

## Smaller issues, all fixed in the new README

- **`README.md` told people to run `pip install -r requirements.txt`** at
  the repo root in step 1 of Getting Started — no such file exists (each
  microservice has its own `requirements.txt`; there's no root one). This is
  the very first command anyone follows, so it fails immediately. New README
  installs each service's own requirements, or points at
  `docker-compose up` as the single-command path instead.
- **README says "See `LICENSE`"** — no `LICENSE` file exists in the repo. I
  added a standard MIT `LICENSE` file to this bundle since that's what's
  claimed; swap it for something else if MIT isn't actually what you want.
- Capability table said `Adversarial Hardening (7 mutation strategies)` is
  `[IMPLEMENTED ✅]`, but `ml-training/artifacts/adversarial_report_dga_v1.json`
  (the only evidence of a run) is truncated mid-file and was generated
  against the old 99-row model. New README marks this `[PARTIAL 🔶]` with a
  note to re-run it against `dga-v2` before claiming it's done — this is an
  easy one to actually finish for real before the demo, not just relabel.
- Updated the capability table to reflect the two infra bugs from the
  Dockerfile audit (ml-inference model load / forecasting silent fallback)
  and the missing typosquat model, so the doc matches what's actually true
  right now rather than what was true before those fixes — and so it's
  honest again once you apply the fixes.

## What's in this bundle

- `README.md` — full rewrite, numbers verified against the actual repo,
  fixed setup steps, honest capability table.
- `LICENSE` — MIT, since the old README referenced one that didn't exist.

## Still worth doing, didn't do for you

- Sweep `MODEL_CARD.md`, `DATASET_CARD.md`, `DATASET_AND_MODEL_SPECS.md`,
  `SYSTEM_ARCHITECTURE_GUIDE.md`, `AGENT_HANDOFF.md` for the same fabricated
  numbers — say the word and I'll do a pass on all five with the same
  verify-then-fix approach.
- Decide on and consolidate to one UI folder.
- A one-page `PITCH.md` or slide outline that leads with the *real* strong
  result (97.2% recall on unseen DGA families, working XAI, working
  hardware kill-switch concept) instead of the inflated one — happy to draft
  this if useful for the actual pitch deck.
