import os, time, json, uuid
from collections import defaultdict, deque
from fastapi import FastAPI
from pydantic import BaseModel
import redis
app=FastAPI(title="DNS Shield Behavioral Engine",version="1.0.0")
r=redis.from_url(os.getenv("REDIS_URL","redis://redis:6379/0"),decode_responses=True)
windows=defaultdict(deque)
class Observation(BaseModel): domain:str; client_ip:str; ml_probability:float=0; threat_hit:bool=False
def parent(domain):
    xs=domain.rstrip('.').split('.'); return '.'.join(xs[-2:]) if len(xs)>1 else domain
@app.post("/observe")
def observe(o:Observation):
    now=time.time(); q=windows[o.client_ip]; q.append((now,o.domain))
    while q and q[0][0] < now-60:q.popleft()
    unique_tlds={x.split('.')[-1] for _,x in q if '.' in x}; sub=o.domain.split('.')[0]
    signals=[]; contribution=0
    if len(q)>50: contribution+=25; signals.append(f"request-volume spike: {len(q)} requests/min")
    if len(sub)>45: contribution+=30; signals.append(f"long subdomain ({len(sub)} chars), possible DNS tunnelling")
    if len(unique_tlds)>10: contribution+=20; signals.append(f"rapid unique-TLD fanout ({len(unique_tlds)})")
    if o.ml_probability>=.7: contribution+=15; signals.append("suspicious lexical query contributes to device risk")
    if o.threat_hit: contribution+=35; signals.append("known threat-intel hit contributes to device risk")
    current=int(r.get(f"device:risk:{o.client_ip}") or 0); risk=min(100,max(0,int(current*.90)+contribution)); r.setex(f"device:risk:{o.client_ip}",86400*30,risk)
    r.lpush(f"device:history:{o.client_ip}",json.dumps({"timestamp":now,"risk":risk,"domain":o.domain,"signals":signals})); r.ltrim(f"device:history:{o.client_ip}",0,199)
    domain_key=f"domain:profile:{o.domain.lower().rstrip('.')}"; first_seen=r.hget(domain_key,"first_seen") or str(now)
    r.hset(domain_key,mapping={"first_seen":first_seen,"last_seen":str(now),"query_count":str(int(r.hget(domain_key,"query_count") or 0)+1),"last_device":o.client_ip,"threat_intel_hits":str(int(r.hget(domain_key,"threat_intel_hits") or 0)+int(o.threat_hit)),"last_ml_probability":str(o.ml_probability)})
    r.sadd(f"domain:devices:{o.domain.lower().rstrip('.')}",o.client_ip); r.expire(f"domain:devices:{o.domain.lower().rstrip('.')}",86400*90)
    incident=None
    if len(signals)>=2 or (risk>=70 and (o.ml_probability>=.3 or o.threat_hit)):
      incident={"id":str(uuid.uuid4()),"device":o.client_ip,"severity":"critical" if risk>=70 else "high","summary":f"Correlated DNS anomaly: {'; '.join(signals)}","timeline":[{"at":now,"event":"DNS observation","evidence":signals}]}; r.lpush("incidents",json.dumps(incident)); r.ltrim("incidents",0,99)
    return {"device_risk":risk,"contribution":contribution,"signals":signals or ["normal request behavior"],"incident":incident,"parent_domain":parent(o.domain)}
@app.get("/devices/{ip}")
def device(ip:str): return {"ip":ip,"risk":int(r.get(f"device:risk:{ip}") or 0),"history":[json.loads(x) for x in r.lrange(f"device:history:{ip}",0,199)]}
@app.get("/domains/{domain}")
def domain_profile(domain:str):
    key=f"domain:profile:{domain.lower().rstrip('.')}"; profile=r.hgetall(key)
    return {"domain":domain,"profile":profile,"device_count":r.scard(f"domain:devices:{domain.lower().rstrip('.')}") if profile else 0,"parent_domain":parent(domain)}
@app.get("/incidents")
def incidents(): return [json.loads(x) for x in r.lrange("incidents",0,99)]
