# DNS Shield Jupyter notebooks

The notebooks in this directory are presentation and investigation companions, not part of the DNS hot path. They are deliberately not executed during the build.

## `01_soc_demo_analysis.ipynb`

After the Docker demo stack is running, this notebook can:

- submit known-bad, benign, DGA-style, and typosquat queries to the same API gateway pipeline used by the resolver;
- visualize exact pipeline-stage contributions and XAI reasons;
- retrieve persisted events and plot verdict, risk, and hourly trend summaries;
- inspect incidents, device/domain reputation, feed health, and model-monitoring state;
- export notebook charts for a presentation only after results have been generated from a real run.

## Setup after execution is approved

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r notebooks/requirements.txt
jupyter lab
```

Open `notebooks/01_soc_demo_analysis.ipynb`. The default base URL is `http://localhost:8080`; change it only when your approved deployment URL differs.

Do not type API keys directly into notebook cells. Put an optional local development key in the `DNS_SHIELD_API_KEY` environment variable before starting Jupyter.

