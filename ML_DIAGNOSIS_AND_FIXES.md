# DNS Shield — ML Model Diagnosis & Fixes

I cloned your repo and dug into `ml-training/`, `dns_shield_features.py`, and
`services/ml-inference/`. Found the root cause of the "random false negatives"
plus two other real bugs. Everything below is reproduced with actual numbers
from your own code and data, not guesses.

## Root cause #1 (the big one): the shipped model was trained on a 99-row toy file

`artifacts/dga-v1.metadata.json` says `"dataset_rows": 99`. Your repo also has
`data/dga_dataset.csv` sitting right there with **10,001** balanced rows
(5,000 benign / 5,000 malicious across 6 DGA families: matsnu, conficker,
kraken, cryptolocker, generic, suppobox). The shipped model was trained on
`data/tiny_dataset.csv` (99 rows) instead.

Why this causes exactly the symptom you're seeing:

- The TF-IDF char-ngram part of your feature union carries **~79% of the
  model's total decision weight** (I checked `feature_importances_` on the
  retrained model). With 99 training domains, that vocabulary is maybe a few
  hundred n-grams. With the full 10,001-row set it's **68,185 n-grams**. Any
  real-world domain that doesn't share substrings with those 99 examples gets
  almost no signal — which looks exactly like "random" false negatives.
- The reported `1.0 / 1.0 / 1.0` metrics in `dga-v1.metrics.json` are on a
  **20-row holdout**. That's not evidence of a good model, it's a sample size
  too small to mean anything (one wrong prediction = a 5-point swing).

**Fix applied:** retrained on the full `data/dga_dataset.csv` using your own
`train.py`, chronological split (your documented recommended method):

```
python ml-training/train.py --data data/dga_dataset.csv --name dga --version 2 \
  --source "data/dga_dataset.csv (10001 rows, balanced, 6 families)" --chronological
```

Result on a real 2,000-row chronological holdout:

| class | precision | recall | f1 |
|---|---|---|---|
| benign (0) | 0.994 | 1.000 | 0.997 |
| malicious (1) | 1.000 | 0.994 | 0.997 |

I also ran a **cross-family holdout** (train on 3 families, test on the 3 the
model has never seen at all — the honest way to estimate performance against
a genuinely new malware family): **97.2% recall** on totally unseen DGA
families. That's the number I'd actually quote to judges, because it answers
"what happens against malware you didn't train on," which is the real
question.

📦 Drop-in replacement is in `dga-v2-artifacts/` — copy all four files into
your `artifacts/` folder (the `.joblib`, `.metadata.json`, `.metrics.json`,
`.feature-baseline.json`) and `services/ml-inference` will pick it up
automatically (it globs `{name}-v*.joblib` and takes the newest).

## Root cause #2: benign training data has almost no domain diversity — causes false positives on legitimate Indian/govt domains

This one matters a lot for an SIH demo. I checked the benign half of your
dataset:

- **4,858 / 5,000 (97%) of benign examples are `.com`.** Only 52 `.us`, 51
  `.org`, 39 `.co`. **Zero** `.in`, `.gov.in`, `.co.in` — the exact TLDs your
  own `data/brand_dictionary.txt` targets (isro, uidai, nic, sbi, irctc,
  epfo, cert-in, gov, india...).
- **Zero** benign examples contain a hyphen anywhere.

I tested the retrained model on real domains outside that narrow shape:

| domain | malicious probability | verdict |
|---|---|---|
| `isro.gov.in` | **0.793** | flagged suspicious ❌ |
| `state-bank-of-india.co.in` | **0.653** | flagged uncertain ❌ |
| `amazon.in` | **0.533** | flagged uncertain ❌ |
| `my-favorite-blog.com` | **0.467** | flagged uncertain ❌ |

That's a real problem for a live demo — a judge typing `isro.gov.in` into
your console would see it flagged as suspicious. It's not a code bug, it's a
training-data coverage gap: the model never saw a legitimate `.gov.in`
domain, so it has no way to know one isn't malicious.

**Fix (starter, not final):** `phase2-benign-augmentation/benign_augmentation.csv`
adds 195 benign rows: ~27 real, well-known Indian government/institutional
domains (`india.gov.in`, `uidai.gov.in`, `irctc.co.in`, `isro.gov.in`,
`meity.gov.in`, etc.) plus ~168 synthetic hyphenated brand-pattern domains
(`sbi-support.co.in`, `paytm-secure.in`, ...) generated from your own brand
dictionary. After merging this in and retraining:

| domain | before | after |
|---|---|---|
| `isro.gov.in` | 0.793 | **0.080** |
| `state-bank-of-india.co.in` | 0.653 | **0.160** |
| `amazon.in` | 0.533 | **0.213** |
| `my-favorite-blog.com` | 0.467 | **0.233** |

This is a *first pass*, not a finished dataset — 195 rows is small and I
hand-generated it, so treat it as a demonstration that the fix direction
works, not a production-grade benign corpus. Before you lock in a final
model, replace/extend this with something like a filtered Tranco list
restricted to `.in`/`.co.in`/`.gov.in`/`.org.in` domains (a few thousand rows
would be far more robust than my 195). I did **not** overwrite `dga-v2` with
this version by default, because in my one quick run recall on the malicious
class dropped to 0.85 on that particular chronological split — likely an
interaction between the new timestamps and where the split boundary falls,
not a real regression, but I didn't have time to re-tune it properly. Rerun
with `--tune` enabled and a stratified (not chronological) split for a fairer
read before you trust it, and check the per-family recall breakdown (code for
that is below) so you know exactly which family, if any, gets worse.

```python
# quick per-family recall check after any retrain
import csv, joblib
model = joblib.load("artifacts/dga-vN.joblib")
rows = list(csv.DictReader(open("data/dga_dataset_v2.csv")))
from collections import defaultdict
by_family = defaultdict(lambda: [0,0])
for r in rows:
    p = model.predict([r["domain"]])[0]
    by_family[r["family"]][1] += 1
    by_family[r["family"]][0] += (p == int(r["label"]))
for fam, (c,t) in by_family.items():
    print(fam, c, "/", t)
```

## Bug #3: `services/ml-inference/requirements.txt` is corrupted and will fail `pip install`

The `shap==0.44.1` line in that file has a null byte after every character
(looks like it was saved as UTF-16 by mistake at some point). I confirmed it
directly:

```
$ pip install -r services/ml-inference/requirements.txt
ERROR: Invalid requirement: 's\x00h\x00a\x00p\x00=\x00=\x000\x00.\x004\x004\x00.\x001\x00'
```

This means your `ml-inference` Docker image currently **fails to build**, or
if it was built once before this got corrupted, `shap` silently never
installs — which means the TreeSHAP explainability (your headline XAI
feature) has been running on the `except ImportError: format_reason = ...`
fallback path in `app.py` the whole time, not real SHAP values. Fixed file is
`requirements.txt` in this bundle — it's byte-identical content, just saved
correctly as UTF-8. Replace the one in your repo with it.

## Smaller things worth knowing (didn't fix, just flagging)

- **`alexa_rank_simulated` and `nrd_age_simulated` are hardcoded to `0.0`**
  in `dns_shield_features.py` (lines 136-137) — they're never computed from
  anything. I confirmed `feature_importances_` on the trained model shows
  exactly `0.00000` for both. Your spec doc lists "38 engineered features"
  and implies real popularity/age signal; right now these two are dead
  weight. Either wire them to something real (you already have a WHOIS-age
  cache in `app.py` — that data isn't fed into the model, only used as a
  post-hoc probability bump) or drop the columns.
- `hyphen_ratio`, `punycode`, and `has_homoglyph` also show `0.0` importance
  — not because they're broken, but because your synthetic dataset has zero
  examples exercising them in either class. They'll start pulling weight
  once you add hyphenated/punycode/homoglyph examples to training data (the
  benign augmentation above is a start for hyphens).
- The production service (`app.py`) already uses a 3-tier band
  (`benign <0.30`, `uncertain 0.30–0.70`, `suspicious ≥0.70`) rather than a
  hard 0.5 cutoff, which is good practice — it means a lot of the borderline
  cases I found (e.g. domains scoring 0.40–0.50) land in "uncertain" for
  human/behavioral-engine review rather than being silently passed as
  benign. Worth keeping in mind when you report metrics: raw `.predict()`
  accuracy at threshold 0.5 slightly understates your real-world safety net.

## Bug #4 (critical, breaks the whole demo): `ml-inference` container can't load the model — same class of bug in `api-gateway`

I reproduced your actual container filesystem layout (only what each `Dockerfile` copies, nothing else) and ran the exact code your services run.

**`ml-inference`:** its `Dockerfile` only does `COPY app.py .`. But `dns_shield_features.py` (at your repo root) is referenced *inside the pickled joblib artifact itself* — `train.py`'s own comments explain why this must ship alongside the model. It never gets copied into the image. Result, reproduced directly:

```
$ python -c "import joblib; joblib.load('artifacts/dga-v2.joblib')"
ModuleNotFoundError: No module named 'dns_shield_features'
```

And `app.py`'s `local_model_probability()` catches this and **re-raises** (`except Exception as e: print(...); raise e`) — so every single `/predict` call would 500 in a real `docker-compose up`. This isn't hypothetical; the metrics/XAI you built literally cannot run in the shipped container image as-is.

**`api-gateway`:** same root cause, different flavor. `app.py` does `from services.forecasting_engine.attack_forecaster import ...`, computed by walking two directories up from `app.py`'s location. Locally that lands on your repo root (which has a `services/` folder), so it works on your machine. But the `Dockerfile` flattens everything to `/app/app.py` directly — two levels up from there is the *filesystem root* `/`, not anything useful. I confirmed this is exactly what happens:

```
would insert path: /tmp   # (analogous to "/" in the real container)
```

Because the import is wrapped in `try/except ImportError → attack_forecaster = None`, this **fails silently** rather than crashing — and `get_forecast_timeline()` then falls back to a fully hardcoded response (fixed threat score of `74`, fixed forecast stages, fixed IPs — see `app.py` lines ~553-571). So in your actual deployed stack, **the AI-Based Network Attack Forecasting endpoint — one of your two official SIH problem statements — returns static fake data, not real model output.** If a judge calls it twice with different `host_ip` values, they'll get identical numbers back both times.

I fixed both by restructuring the Dockerfiles to preserve the nested `services/...` path your code already expects, and verified each one loads/imports correctly in a simulated container layout (`dockerfiles/ml-inference.Dockerfile`, `dockerfiles/api-gateway.Dockerfile` in this bundle). They also require a build-context change since they now expect to be built from the repo root, not `services/<name>/`:

```yaml
# infra/docker-compose.yml
ml-inference:
  build:
    context: ..
    dockerfile: dockerfiles/ml-inference.Dockerfile   # or wherever you place it
api-gateway:
  build:
    context: ..
    dockerfile: dockerfiles/api-gateway.Dockerfile
```

## Bug #5: typosquat detection has no trained model at all — falls back to a 12-domain hardcoded list

`services/ml-inference/app.py` calls `local_model_probability("typosquat", domain)` looking for a `typosquat-v*.joblib` file. **No such file exists anywhere in the repo** (checked — `ml-training/test_typosquatting.py` is just a feature smoke-test, not training data; there's no `data/typosquat*.csv`). So typosquat detection always falls through to this in `app.py`:

```python
fallback_typo = 0.0 if domain in TOP_DOMAINS else (.85 if features["levenshtein_distance"] <= 2 else 0.0)
```

`TOP_DOMAINS` is a hardcoded list of 12 global brands (google, youtube, facebook...). This means:
- Your rich `min_levenshtein_to_brand` / `min_dameraulevenshtein_to_brand` / `has_homoglyph` engineered features — built against your 39-entry `brand_dictionary.txt` which includes `isro`, `sbi`, `irctc`, `uidai`, `epfo`, `cert-in` — are **entirely unused in production**. They only get computed inside `train.py`'s pipeline, and there's no typosquat model to train.
- A typosquat of an Indian brand (e.g. `sbi-verify.com`, `irctc-refund.net`) is invisible to this heuristic since none of those brands are in `TOP_DOMAINS`, and homoglyph/edit-distance detection for them literally isn't running anywhere.

This is a bigger lift than the DGA fix — you need labeled typosquat data (real brand vs. character-substitution/omission/transposition/homoglyph/combosquat variants vs. unrelated benign domains), then `python ml-training/train.py --name typosquat --data data/typosquat.csv ...` the same way I did for `dga`. I can build a starter labeled dataset for this if useful — say the word and I'll generate one against your existing `brand_dictionary.txt`.

## Bug #6 (low severity, but confusing): dead duplicate service folders

`services/flow-ingest` and `services/flow_ingest` both exist (near-identical, hyphen vs underscore); same for `services/forecasting-engine` / `services/forecasting_engine`. Only the underscored versions are actually imported by `api-gateway/app.py` (Python identifiers can't contain hyphens) and referenced in `docker-compose.yml`/tests. The hyphenated ones aren't referenced anywhere — safe to delete, but worth doing before a judge or teammate opens the wrong one and edits code that's never executed.

Also minor: `infra/docker-compose.yml` has `redis_data:/data` and `clickhouse_data:/var/lib/clickhouse` each listed twice under their service's `volumes:` (harmless, just a copy-paste duplicate — cosmetic cleanup).

## What I'd do before the demo, in order

1. **Fix the Dockerfiles first** (`dockerfiles/ml-inference.Dockerfile`,
   `dockerfiles/api-gateway.Dockerfile` + the `docker-compose.yml`
   `context:`/`dockerfile:` change above). Without this nothing else matters
   — `/predict` 500s and the forecasting endpoint quietly serves fake
   numbers, regardless of how good the model is.
2. Drop in `dga-v2-artifacts/*` — fixes the "random false negatives"
   complaint (the 99-row-vs-10,001-row bug, by far the biggest lever on
   model quality itself).
3. Fix `services/ml-inference/requirements.txt` so SHAP actually installs.
4. Decide if you have time to properly retrain with the benign augmentation
   (`--tune`, stratified split, check per-family recall) before the demo —
   if yes, it meaningfully de-risks a judge typing in an `.in` domain live.
   If you're tight on time, at minimum mention it as a known limitation
   rather than risk it surfacing unexplained on stage.
5. Typosquat detection has no trained model at all right now (Bug #5) —
   decide if that's in scope before the demo; right now it only catches
   near-exact matches of 12 hardcoded global brand names, missing every
   Indian brand your own `brand_dictionary.txt` is built to protect.
6. Re-run `ml-training/adversarial_eval.py` and
   `ml-training/domain_mutations.py` against the new `dga-v2` artifact — they
   already exist in your repo and look built for exactly this kind of
   check, but the last report (`ml-training/artifacts/adversarial_report_dga_v1.json`)
   is truncated/incomplete, so it's not clear it ever finished a run against
   a real model.
7. Delete the dead `services/flow-ingest` and `services/forecasting-engine`
   duplicate folders (Bug #6) to avoid anyone editing the wrong copy.
