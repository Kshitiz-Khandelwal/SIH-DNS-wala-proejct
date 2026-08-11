"""Reproducible offline trainer. Supply CSVs with `domain,label` (1=DGA/typo, 0=benign)."""
import argparse, csv, json, math
from collections import Counter
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
import joblib
p=argparse.ArgumentParser(); p.add_argument("--data",required=True); p.add_argument("--name",required=True); a=p.parse_args()
rows=list(csv.DictReader(open(a.data,encoding="utf-8"))); x=[r["domain"] for r in rows]; y=[int(r["label"]) for r in rows]
xtr,xte,ytr,yte=train_test_split(x,y,test_size=.2,random_state=42,stratify=y)
model=Pipeline([("chars",TfidfVectorizer(analyzer="char",ngram_range=(2,4))), ("classifier",LogisticRegression(max_iter=1000,class_weight="balanced"))]); model.fit(xtr,ytr); report=classification_report(yte,model.predict(xte),output_dict=True)
def entropy(s):
 c=Counter(s);return -sum((n/len(s))*math.log2(n/len(s)) for n in c.values()) if s else 0
baseline={"sample_count":len(x),"length_mean":sum(map(len,x))/len(x),"entropy_mean":sum(entropy(d) for d in x)/len(x)}
out=Path("artifacts");out.mkdir(exist_ok=True);joblib.dump(model,out/f"{a.name}-v1.joblib");(out/f"{a.name}-v1.metrics.json").write_text(json.dumps(report,indent=2));(out/f"{a.name}-v1.feature-baseline.json").write_text(json.dumps(baseline,indent=2));print(json.dumps(report,indent=2))
