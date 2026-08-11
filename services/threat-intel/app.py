import os, re, uuid, requests
from datetime import datetime, timezone
import redis
from fastapi import FastAPI
from pydantic import BaseModel

app=FastAPI(title="DNS Shield Threat Intelligence", version="1.0.0")
r=redis.from_url(os.getenv("REDIS_URL","redis://redis:6379/0"), decode_responses=True)
SEED=[x.strip() for x in open("seed_indicators.txt") if x.strip() and not x.startswith("#")]
class Indicator(BaseModel): domain:str; source:str="manual"; confidence:int=90; tags:list[str]=[]
def normalize(domain, source, confidence=90, tags=[]):
    domain=domain.lower().rstrip(".")
    return {"type":"indicator","spec_version":"2.1","id":f"indicator--{uuid.uuid5(uuid.NAMESPACE_DNS, domain)}","created":datetime.now(timezone.utc).isoformat(),"pattern":f"[domain-name:value = '{domain}']","labels":tags,"x_dns_shield_source":source,"x_dns_shield_confidence":confidence}
@app.on_event("startup")
def seed():
    for domain in SEED: r.hset(f"indicator:{domain}", mapping={"source":"seed-urlhaus-demo","confidence":"100","stix":str(normalize(domain,"seed-urlhaus-demo",100,["malware"]))})
@app.get("/lookup/{domain}")
def lookup(domain:str):
    row=r.hgetall(f"indicator:{domain.lower().rstrip('.')}")
    return {"domain":domain,"hit":bool(row),"indicator":row or None,"degraded":False}
@app.post("/indicators")
def add(i:Indicator):
    d=i.domain.lower().rstrip("."); stix=normalize(d,i.source,i.confidence,i.tags)
    r.hset(f"indicator:{d}",mapping={"source":i.source,"confidence":str(i.confidence),"stix":str(stix)}); return stix
@app.post("/feeds/urlhaus")
def ingest_urlhaus():
    """Operator-triggered documented Abuse.ch text feed ingestion; no scraping or bypass."""
    response=requests.get("https://urlhaus.abuse.ch/downloads/text_online/",timeout=20); response.raise_for_status(); added=0
    for line in response.text.splitlines():
      if line.startswith('#') or not line.strip(): continue
      match=re.match(r"https?://([^/]+)",line.strip())
      if match:
       d=match.group(1).lower(); r.hset(f"indicator:{d}",mapping={"source":"abuse.ch-urlhaus","confidence":"95","stix":str(normalize(d,"abuse.ch-urlhaus",95,["malware","urlhaus"]))}); added+=1
    return {"source":"Abuse.ch URLhaus","indicators_added":added,"format":"normalized STIX 2.1 + Redis cache"}
@app.post("/feeds/certin")
def ingest_certin():
    url=os.getenv("CERTIN_FEED_URL")
    if not url: return {"status":"not_configured","action":"set CERTIN_FEED_URL to an approved published indicator list"}
    response=requests.get(url,timeout=20); response.raise_for_status(); added=0
    for item in re.findall(r"(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}",response.text):
      d=item.lower();r.hset(f"indicator:{d}",mapping={"source":"CERT-In","confidence":"85","stix":str(normalize(d,"CERT-In",85,["cert-in"]))});added+=1
    return {"source":"CERT-In","indicators_added":added,"format":"normalized STIX 2.1 + Redis cache"}
@app.get("/feeds/health")
def feeds(): return {"feeds":[{"name":"URLhaus seed","status":"loaded","auth_required":False},{"name":"AlienVault OTX","status":"not_configured" if not os.getenv("OTX_API_KEY") else "configured","auth_required":True},{"name":"CERT-In","status":"not_configured" if not os.getenv("CERTIN_FEED_URL") else "configured","auth_required":False}],"fallback":"last cached Redis indicators"}
