import os, time, uuid
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import redis, requests
from fastapi.middleware.cors import CORSMiddleware
app=FastAPI(title="DNS Shield SIEM API",version="1.0.0",description="Deterministic DNS security pipeline. OpenAPI at /openapi.json.")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS","http://localhost:3000").split(","), allow_credentials=False, allow_methods=["*"], allow_headers=["*"])
r=redis.from_url(os.getenv("REDIS_URL","redis://redis:6379/0"),decode_responses=True)
URLS={k:os.getenv(k) for k in ["ML_URL","BEHAVIOR_URL","GEO_URL","THREAT_INTEL_URL","ACTIVE_RESPONSE_URL"]}
STORE=os.getenv("ANALYTICS_STORE_URL","http://analytics-store:8005")
class Query(BaseModel): domain:str; client_ip:str="127.0.0.1"; target_ip:str=""; source:str="dashboard"; whois_age_days:int|None=None
class Feedback(BaseModel): label:str; analyst:str="dashboard"
def post(base,path,payload):
  try:return requests.post(base+path,json=payload,timeout=.25).json(),False
  except Exception:return None,True
def get(base,path):
  try:return requests.get(base+path,timeout=.25).json(),False
  except Exception:return None,True
@app.post("/v1/query")
def query(q:Query):
  started=time.perf_counter(); domain=q.domain.lower().rstrip('.')
  cached=r.hgetall(f"verdict:{domain}")
  if cached:
    return {"domain":domain,"verdict":cached["verdict"],"risk_score":int(cached["risk"]),"cache":"hit","explanation":["cached deterministic verdict"],"latency_ms":round((time.perf_counter()-started)*1000,3)}
  ti, ti_down=get(URLS["THREAT_INTEL_URL"],f"/lookup/{domain}") if URLS["THREAT_INTEL_URL"] else (None,True)
  ml, ml_down=post(URLS["ML_URL"],"/predict",{"domain":domain,"whois_age_days":q.whois_age_days}) if URLS["ML_URL"] else (None,True)
  behavior, b_down=post(URLS["BEHAVIOR_URL"],"/observe",{"domain":domain,"client_ip":q.client_ip,"ml_probability":(ml or {}).get("probability",0),"threat_hit":bool((ti or {}).get("hit"))}) if URLS["BEHAVIOR_URL"] else (None,True)
  geo, g_down=(None,True) if not q.target_ip else post(URLS["GEO_URL"],"/lookup",{"ip":q.target_ip})
  quarantine, q_down=get(URLS["ACTIVE_RESPONSE_URL"],"/quarantine") if URLS["ACTIVE_RESPONSE_URL"] else (None,True)
  device_quarantined=bool((quarantine or {}).get("rules",{}).get(q.client_ip))
  reasons=[]; risk=0
  if ti and ti.get("hit"): risk=100; reasons.append(f"threat-intel match from {ti['indicator'].get('source','cached feed')}")
  else:
    if ml: risk+=round(ml["probability"]*55); reasons += ml["reasons"]
    if behavior: risk+=behavior["contribution"]; reasons += behavior["signals"]
    if geo: risk+=geo.get("risk_contribution",0); reasons.append(geo.get("reason","geo lookup"))
  if device_quarantined: risk=max(risk,45); reasons.append("requesting device is already quarantined in the virtual lab")
  risk=min(100,risk); uncertain=ml and ml.get("uncertainty_band")=="uncertain"
  verdict="BLOCK" if risk>=71 and not (uncertain and not (ti and ti.get("hit"))) else "FLAG" if risk>=41 or uncertain else "ALLOW"
  confidence="HIGH" if ti and ti.get("hit") or risk>=80 else "MEDIUM" if risk>=41 else "LOW"
  degraded=[n for n,d in [("threat-intel",ti_down),("ml",ml_down),("behavioral",b_down),("geo",g_down),("active-response",q_down)] if d]
  if ml_down and verdict=="BLOCK" and not (ti and ti.get("hit")): verdict="FLAG"; reasons.append("ML unavailable: degraded safely to FLAG")
  if not reasons: reasons=["threat-intel clean, low lexical risk and normal device behavior"]
  event={"event_id":str(uuid.uuid4()),"domain":domain,"client_ip":q.client_ip,"verdict":verdict,"domain_risk":risk,"device_risk":(behavior or {}).get("device_risk",0),"confidence":confidence,"reasons":reasons,"target_ip":q.target_ip,"source":q.source,"geo_json":str(geo or {})}
  post(STORE,"/events",event)
  r.hset(f"verdict:{domain}",mapping={"verdict":verdict,"risk":risk}); r.expire(f"verdict:{domain}",300)
  if event["device_risk"]>=80 and URLS["ACTIVE_RESPONSE_URL"]: post(URLS["ACTIVE_RESPONSE_URL"],"/quarantine",{"device_ip":q.client_ip,"reason":"automated lab threshold reached"})
  if verdict=="BLOCK" and URLS["ACTIVE_RESPONSE_URL"]: event["sinkhole"],_=post(URLS["ACTIVE_RESPONSE_URL"],f"/sinkhole?domain={domain}",{})
  event.update({"cache":"miss","ml":ml,"behavior":behavior,"geo":geo,"degraded_dependencies":degraded,"latency_ms":round((time.perf_counter()-started)*1000,3)})
  return event
@app.get("/v1/events")
def events(limit:int=100):
  try:return requests.get(STORE+f"/events?limit={limit}",timeout=2).json()
  except Exception:return []
@app.get("/v1/devices/{ip}")
def device(ip:str): return requests.get(URLS["BEHAVIOR_URL"]+f"/devices/{ip}",timeout=2).json()
@app.get("/v1/domains/{domain}")
def domain_profile(domain:str): return requests.get(URLS["BEHAVIOR_URL"]+f"/domains/{domain}",timeout=2).json()
@app.get("/v1/incidents")
def incidents(): return requests.get(URLS["BEHAVIOR_URL"]+"/incidents",timeout=2).json()
@app.get("/v1/feed-health")
def feed_health(): return requests.get(URLS["THREAT_INTEL_URL"]+"/feeds/health",timeout=2).json()
@app.post("/v1/events/{event_id}/feedback")
def feedback(event_id:str, body:Feedback): r.hset(f"feedback:{event_id}",mapping=body.model_dump()); return {"event_id":event_id,**body.model_dump(),"status":"persisted","retraining_path":"ml-training/README.md"}
@app.post("/v1/passive/zeek")
async def passive(file:UploadFile=File(...)): return requests.post(STORE+"/passive/zeek",files={"file":(file.filename,await file.read(),file.content_type)},timeout=15).json()
@app.post("/v1/passive/pcap")
async def pcap(file:UploadFile=File(...)): return requests.post(STORE+"/passive/pcap",files={"file":(file.filename,await file.read(),file.content_type)},timeout=15).json()
@app.get("/v1/quarantine")
def quarantine_rules(): return requests.get(URLS["ACTIVE_RESPONSE_URL"]+"/quarantine",timeout=2).json()
@app.delete("/v1/quarantine/{ip}")
def release(ip:str): return requests.delete(URLS["ACTIVE_RESPONSE_URL"]+f"/quarantine/{ip}",timeout=2).json()
@app.get("/health")
def health(): return {"status":"ok","detection_plane":"local deterministic","llm_required":False}
