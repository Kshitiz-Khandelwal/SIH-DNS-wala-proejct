# ML training

The runtime starts with a transparent deterministic baseline. Train and export versioned local artifacts from labelled data before presenting model-quality metrics.

Data sources to download manually and license/review before use: Bambenek Consulting DGA feeds (historical), UMUDGA, and DGArchive academic references. Use a benign set such as Tranco (CC BY-SA) and retain source/date/checksum beside the CSV.

Expected CSV format: `domain,label`, where `1` is DGA/typosquat and `0` is benign. Run `python train.py --data data/dga.csv --name dga` and `python train.py --data data/typosquat.csv --name typosquat`. The inference service automatically uses `dga-v*.joblib` and `typosquat-v*.joblib` from its read-only artifact mount; if either is absent or unreadable it uses the explicit deterministic baseline. Copy resulting metrics into the dashboard only after that real run. Analyst feedback persisted through `/v1/events/{id}/feedback` should be exported into the next labelled CSV and split by time to avoid leakage.
