# MASTER PROMPT 3 — Fix the Leak, Fix the Dependencies, Make the Forecast Real

Paste this whole document into your agentic coding assistant. Context: a previous
pass claimed a working GRU temporal forecaster with 98.66% F1 for PS 26153. That
number is **not trustworthy** — it comes from a train/test split that is commented
as "chronological" but is actually a random shuffle, causing temporal leakage. When
the *actually*-chronological version of the same script is run, the model scores
**0.00% F1 on held-out data.** This master prompt exists to fix both the process bug
(the leak) and the root cause it was hiding (the model genuinely doesn't generalize
yet), plus two dependency bugs that will crash the service in Docker regardless.

---

## 0. Ground rules (same as before, restated because they matter here specifically)

1. **Do not report a metric you did not personally reproduce in this session, from a
   script you can point to and re-run.** The 98.66% number already violated this once
   — don't let a "fixed" version of it slip through the same way.
2. **A 0% result is a valid, useful result.** It tells you the current approach
   doesn't work yet. Do not paper over it by re-shuffling the split until a bigger
   number appears — that's the exact bug you're here to fix.
3. **Verify every fix by re-running the real training script end-to-end**, not by
   reading the diff and reasoning that it should now work.

---

## 1. Root cause diagnosis (context for the agent, already confirmed)

`services/forecasting_engine/run_full_ml_benchmark.py` builds sequence windows, then
does this:

```python
# Chronological Split (75% Train, 25% Test)
n_seq = len(X_seq)
split_idx = int(n_seq * 0.75)

# For fair benchmarking, balance the sequence targets across classes in train and test
rng = np.random.RandomState(42)
indices = rng.permutation(n_seq)
train_idx = indices[:split_idx]
test_idx = indices[split_idx:]
```

The comment says chronological; the code randomly permutes indices. Because sequence
windows are built with a stride of 2 over the flow stream (`for i in range(0, len(X_mat) - seq_len, 2)`),
adjacent windows overlap heavily — after a random shuffle, near-duplicate windows
land on both sides of the train/test boundary, so the model is effectively tested on
data it already saw. That's why this script reports 98.66% F1 while the genuinely
chronological script (`train_temporal_gru.py`, which sorts by `StartTime` and slices
without shuffling) reports 0.00% F1 on the same underlying data.

**The 0% result is telling you something real and important, separate from the leak
bug:** `data/ctu13_multistage_flows.csv` concatenates two unrelated CTU-13 captures
(Scenario-1, dated 2011-08-10, and Scenario-10, dated 2011-08-18 — 8 days apart, from
different infections) and sorts them by absolute timestamp. A chronological split on
that combined file puts almost the entirety of one scenario's flows into train and the
other scenario's flows into test — meaning the "chronological test set" isn't really
testing "can the model forecast this host's future," it's testing "can a model trained
entirely on Scenario-1 correctly classify all of Scenario-10," a much harder and
somewhat different problem, and evidently one the current model/feature set can't do
at all (0% F1 confirms it: the test set had exactly one label present with zero
correct predictions).

## 2. Fix plan, in order

### Fix A — Correct the mislabeled split in `run_full_ml_benchmark.py`

Delete the random-permutation split entirely and replace it with a real chronological
split matching `train_temporal_gru.py`'s approach:

```python
# Genuine chronological split — no shuffling, ever, for temporal data.
n_seq = len(X_seq)
train_end = int(n_seq * 0.70)
val_end = int(n_seq * 0.85)
X_train_seq, y_train_seq = X_seq[:train_end], y_seq[:train_end]
X_val_seq, y_val_seq = X_seq[train_end:val_end], y_seq[train_end:val_end]
X_test_seq, y_test_seq = X_seq[val_end:], y_seq[val_end:]
```

Re-run it. Expect the number to drop back toward what `train_temporal_gru.py` already
showed. **Report the real number, however low, in your final summary.** This step is
about honesty of measurement, not about producing a better score yet — that's Fixes
B–D.

### Fix B — Restructure the dataset so chronological splitting is meaningful

The real problem is the dataset, not just the split code. Two viable approaches —
pick one and document the choice:

**Option 1 (recommended, faster): split within each scenario, then combine.**
Instead of concatenating two captures and splitting the combined timeline once, take
a chronological 70/15/15 split **inside Scenario-1 alone** and **inside Scenario-10
alone**, then union the respective train/val/test portions across both scenarios.
This way, train and test both contain examples from both underlying attack sessions
and both label distributions, while still respecting "test is always later in time
than train, within each source," which is the actual property you need to prevent
leakage without creating an impossible cross-capture generalization task.

```python
def chronological_split_per_scenario(df, ratios=(0.70, 0.15, 0.15)):
    parts = {"train": [], "val": [], "test": []}
    for scenario_id, group in df.groupby("Scenario"):
        group = group.sort_values("StartTime").reset_index(drop=True)
        n = len(group)
        t_end = int(n * ratios[0])
        v_end = int(n * (ratios[0] + ratios[1]))
        parts["train"].append(group.iloc[:t_end])
        parts["val"].append(group.iloc[t_end:v_end])
        parts["test"].append(group.iloc[v_end:])
    return (pd.concat(parts["train"]).sort_values("StartTime").reset_index(drop=True),
            pd.concat(parts["val"]).sort_values("StartTime").reset_index(drop=True),
            pd.concat(parts["test"]).sort_values("StartTime").reset_index(drop=True))
```

**Option 2 (more rigorous, slower): add more CTU-13 scenarios and hold out entire
scenarios for test.** CTU-13 has 13 scenarios total; the current work only uses 2.
Pull in 4–6 more, train on a subset of full scenarios, validate on another subset,
and test on scenarios the model has never seen *any* flows from. This is closer to
genuine generalization testing and is the stronger claim to make to a judge if there's
time — but it's more data engineering work and a real risk the model performs even
worse initially. Only attempt this after Option 1 produces a working baseline.

### Fix C — Fix the label/feature circularity

Right now, `label_flow()` assigns MITRE stage labels almost entirely from `Dport`
(e.g., port 445/139/389/88 → Lateral Movement, port 6667/80/443 → C2) and simple
packet-count heuristics (2 packets, <0.05s duration → Reconnaissance). But the model's
own 16-dim feature vector includes `is_lateral_port`, `is_dns_port`, `is_syn_or_scan`
— features built from *the same signals used to generate the labels*. This makes the
"classification" task partly circular: high accuracy can reflect the model
re-deriving the labeling rule rather than learning a genuine temporal attack
signature.

Do not remove the port-based features — they're legitimate signal. Instead:
1. **Report stage-wise metrics, not just weighted F1**, so a reviewer can see exactly
   which stages are (and aren't) working — this is already partially visible in the
   classification report output and should be kept front-and-center, not summarized
   away into one weighted number.
2. **Add at least one feature that is NOT derived from the same rule that produced
   the label** — e.g., session-level behavioral features (unique destination count in
   the current window, inter-flow timing burstiness, ratio of new vs. repeated
   destination IPs) that a human analyst would use but that don't literally
   re-encode "which port bucket is this." This gives the temporal model something
   genuinely new to learn beyond re-deriving the label rule.
3. **State the limitation plainly in the model card**: "MITRE stage labels for this
   dataset are heuristically derived from port/packet-count rules, not ground-truth
   analyst annotations, because CTU-13 only natively labels Botnet vs. Background.
   Reported metrics measure the model's ability to reproduce this labeling scheme
   from flow sequences, which is a proxy for, not identical to, true kill-chain stage
   detection."

### Fix D — Fill in the three untested stages, or honestly narrow the claim

Reconnaissance, Discovery, and Lateral Movement currently have **zero test examples**
in every run so far — meaning 3 of the 6 PS-required stages have never actually been
evaluated. Two options:

1. **Tune `label_flow()`'s thresholds and re-run** until all 6 non-benign stages have
   at least a few hundred examples across train/val/test — port-scan detection
   (Reconnaissance) and SMB/LDAP-heavy sequences (Lateral Movement) should be
   extractable from the existing CTU-13 captures if the heuristic is loosened/tuned.
2. **If, after a genuine attempt, some stages remain too sparse to evaluate
   meaningfully**, don't claim full 6-stage coverage. State explicitly which stages
   are validated with real held-out metrics and which are structurally supported
   (the model can output them) but not yet empirically demonstrated — this is a far
   more defensible claim to a judge than an unqualified "6 MITRE stages" line.

### Fix E — Fix the two Docker-blocking dependency bugs

`services/forecasting_engine/requirements.txt` is missing `torch`, `numpy`, `pandas`,
and `scikit-learn`, even though `attack_forecaster.py` imports all of them at module
level and will crash the live FastAPI service on startup. Add them, and pin a
CPU-only torch build to avoid pulling multi-gigabyte CUDA packages the service will
never use:

```
fastapi>=0.100.0
uvicorn[standard]>=0.22.0
pydantic>=2.0.0
requests>=2.31.0
python-multipart>=0.0.6
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
torch>=2.0.0 --index-url https://download.pytorch.org/whl/cpu
```
(If your build tool doesn't support the `--index-url` line inline, use a
`--extra-index-url` flag in the Dockerfile's `pip install` step instead, or a
separate `constraints.txt` — just confirm whichever approach you pick actually
avoids the CUDA packages by checking the installed wheel size.)

**Verification:** rebuild the `forecasting-engine` Docker image from scratch and
confirm it starts and responds to a health check, without your local Python
environment's already-installed packages masking the missing-dependency bug.

### Fix F — Re-run the K-step rollout against real held-out sequences

Replace the two hand-picked example hosts in the rollout demo with 3–5 sequences
pulled directly from the (correctly split) held-out test set — a mix of ones the
correct labels say are benign and ones that are genuinely progressing through
attack stages. Print the model's predicted trajectory next to the actual labels for
each, so it's visible whether the forecasts are directionally sane on real data, not
just on a curated example. If you see flat 100.0%-confidence outputs again, treat
that as a sign of an absorbing-state or overconfidence bug in the rollout logic, not
as evidence of a great model — investigate before reporting it.

### Fix G — Correct the public-facing claim in `llms.txt`

`frontend/public/llms.txt` currently states as fact: "Powered by a 2-layer Recurrent
Neural Sequence Model (GRU) trained on chronological network flow telemetry." Once
Fixes A–D are done and you have an honest, reproducible metric, update this line to
reflect the real, current performance level — including caveats if coverage is
partial (see Fix D) — rather than an unqualified claim. This file is crawled by
LLM-based agents/judges and should not carry a number that can't be reproduced.

---

## 2b. STATUS UPDATE — Fix A + Fix B (Option 1) already done and verified live

Both were implemented and actually run (not just written) as part of preparing this
prompt. Reproducible result, per-scenario chronological split, zero shuffling:

```
Weighted Precision: 99.94%   Recall: 99.92%   F1: 99.93%
Benign FPR: 0.0535% (2 / 3741 benign test flows)
```

This confirms the GRU architecture and 16-dim feature set are not fundamentally
broken — the earlier 0% result was specifically caused by splitting across two
unrelated captures 8 days apart, not a sign the approach can't work at all.

**However, this number currently reflects only 2 of 6 required stages** — Benign and
Exfiltration are the only classes with test support in the current 2-scenario
dataset. Reconnaissance, Initial Access, Discovery, C2 Persistence, and Lateral
Movement have zero-to-negligible examples. **Do not present 99.93% as full 6-stage
coverage** — it isn't yet. This is exactly what Fix D below needs to resolve, and it's
now the single highest-priority remaining item: pull in 3–5 more CTU-13 scenarios
(Scenario-3, Scenario-8, and Scenario-9 are documented in CTU-13's own metadata as
having distinct port-scan and lateral-movement-heavy traffic profiles, making them
good candidates) using the same download pattern as
`data/download_ctu13_multistage.py`, then re-run the per-scenario chronological split
and training across the expanded set. Note: this step requires outbound network
access to `mcfp.felk.cvut.cz`, which may not be available in every sandboxed agent
environment — run it somewhere with open network access if the download fails.

The corrected training script implementing Fix A + Fix B (Option 1) is provided
below in full — use it as the new baseline rather than re-deriving it:

```python
def chronological_split_per_scenario(df, ratios=(0.70, 0.15, 0.15)):
    """Split inside each scenario first, then union train/val/test across scenarios,
    so train and test both see every underlying capture session instead of the
    model being evaluated on an entirely different capture than it trained on."""
    parts = {"train": [], "val": [], "test": []}
    for scenario_id, group in df.groupby("Scenario"):
        group = group.sort_values("StartTime").reset_index(drop=True)
        n = len(group)
        t_end = int(n * ratios[0])
        v_end = int(n * (ratios[0] + ratios[1]))
        parts["train"].append(group.iloc[:t_end])
        parts["val"].append(group.iloc[t_end:v_end])
        parts["test"].append(group.iloc[v_end:])
    train = pd.concat(parts["train"]).sort_values("StartTime").reset_index(drop=True)
    val = pd.concat(parts["val"]).sort_values("StartTime").reset_index(drop=True)
    test = pd.concat(parts["test"]).sort_values("StartTime").reset_index(drop=True)
    return train, val, test
```

Apply this same split function unchanged once more scenarios are added in Fix D —
it already generalizes to any number of scenarios grouped by the `Scenario` column.

## 3. Suggested order of operations

1. Fix A first (stop the bleeding — get honest measurement).
2. Fix E in parallel (it's independent and blocks even testing this in Docker).
3. Fix B, Option 1 (restructure the split so honest measurement is also useful
   measurement).
4. Re-run training. Look at the real stage-wise numbers.
5. Fix C (add a non-circular feature) and Fix D (address sparse/missing stages)
   together, iterating until you have a number you're willing to defend under
   questioning.
6. Fix F (real rollout examples).
7. Fix G last, once you know what the honest headline claim actually is.

## 4. Final report format

```
FIX STATUS
A. Split bug fixed & honest baseline reproduced: [DONE] — real chronological F1: ___%
B. Dataset restructuring:                        [Option 1 / Option 2 / not done]
C. Label/feature circularity addressed:           [DONE / PARTIAL] — new feature(s): ...
D. Six-stage coverage:                            [X / 6 stages have real test support]
E. Docker dependency fix verified:                [DONE] — fresh build log: ...
F. K-step rollout on real held-out sequences:     [DONE] — attach output
G. llms.txt claim corrected:                      [DONE]

FINAL HONEST METRICS TABLE (chronological split, reproduced this session)
| Stage | Precision | Recall | F1 | Test support (n) |
|-------|-----------|--------|----|----|
| Benign | ... | ... | ... | ... |
| Reconnaissance | ... | ... | ... | ... |
| Initial Access | ... | ... | ... | ... |
| Discovery | ... | ... | ... | ... |
| C2 Persistence | ... | ... | ... | ... |
| Lateral Movement | ... | ... | ... | ... |
| Exfiltration | ... | ... | ... | ... |

WHAT CAN BE HONESTLY CLAIMED TO A JUDGE RIGHT NOW
(one paragraph, plain language, no rounding up)

WHAT STILL CANNOT BE CLAIMED
(one paragraph — sparse stages, remaining caveats)
```
