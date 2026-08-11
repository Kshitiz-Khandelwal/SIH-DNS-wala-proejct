"""Lab-only response controller. It records rules; it never invokes host iptables/nftables."""
import os, time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import redis
app=FastAPI(title="DNS Shield Lab Active Response",version="1.0.0")
r=redis.from_url(os.getenv("REDIS_URL","redis://redis:6379/0"),decode_responses=True)
class Quarantine(BaseModel): device_ip:str; reason:str
@app.post("/sinkhole")
def sinkhole(domain:str): return {"domain":domain,"sinkhole_ip":os.getenv("SINKHOLE_IP","172.28.0.250"),"scope":"dns-shield-lab Docker network only","logged_at":time.time()}
@app.post("/quarantine")
def quarantine(q:Quarantine): r.hset("lab:quarantine",q.device_ip,q.reason); return {"device_ip":q.device_ip,"status":"quarantined","scope":"virtual lab only","reason":q.reason}
@app.delete("/quarantine/{ip}")
def release(ip:str): r.hdel("lab:quarantine",ip); return {"device_ip":ip,"status":"released","scope":"virtual lab only"}
@app.get("/quarantine")
def list_rules(): return {"rules":r.hgetall("lab:quarantine"),"warning":"This service is intentionally non-destructive and never modifies host networking."}

