# ML training

The runtime starts with a transparent deterministic baseline. Train and export versioned local artifacts from labelled data before presenting model-quality metrics.

Data sources to download manually and license/review before use: Bambenek Consulting DGA feeds (historical), UMUDGA, and DGArchive academic references. Use a benign set such as Tranco (CC BY-SA) and retain source/date/checksum beside the CSV.

Expected CSV format: `domain,label`, where `1` is DGA/typosquat and `0` is benign. Run `python train.py --data data/dga.csv --name dga`. Copy resulting metrics into the dashboard only after that real run. Analyst feedback persisted through `/v1/events/{id}/feedback` should be exported into the next labelled CSV and split by time to avoid leakage.

