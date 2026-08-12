# ML training

The runtime starts with a transparent deterministic baseline. Train and export versioned local artifacts from labelled data before presenting model-quality metrics.

Data sources to download manually and license/review before use: Bambenek Consulting DGA feeds (historical), UMUDGA, and DGArchive academic references. Use a benign set such as Tranco (CC BY-SA) and retain source/date/checksum beside the CSV.

Expected CSV format: `domain,label[,observed_at]`, where `1` is DGA/typosquat and `0` is benign. Every training run requires a `--source` value that records the dataset's source/license reference:

```powershell
python train.py --data data/dga.csv --name dga --version 1 --source "documented dataset URL and license" --chronological
python train.py --data data/typosquat.csv --name typosquat --version 1 --source "documented dataset URL and license" --chronological
```

Each run writes `.joblib`, held-out `.metrics.json`, `.feature-baseline.json`, and auditable `.metadata.json` files. The inference service uses only artifacts with `dns-shield-model-v1` metadata matching their model family; absent, invalid, or mismatched artifacts use the explicit deterministic baseline. Copy resulting metrics into the dashboard only after that real run. Analyst feedback persisted through `/v1/events/{id}/feedback` should be exported into the next labelled CSV and split by time to avoid leakage.
