import os, csv, io, uuid
from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import requests
app=FastAPI(title="DNS Shield Analytics Store",version="1.0.0")
CH=os.getenv("CLICKHOUSE_URL","http://clickhouse:8123")
class Event(BaseModel): event_id:str|None=None; timestamp:str|None=None; domain:str; client_ip:str; verdict:str; domain_risk:int; device_risk:int; confidence:str; reasons:list[str]=[]; target_ip:str=""; source:str="active"; geo_json:str="{}"
def ch(query, data=None):
  return requests.post(CH,params={"query":query},data=data,timeout=2)
@app.post("/events")
def add(e:Event):
  payload=e.model_dump(); payload["event_id"] = payload["event_id"] or str(uuid.uuid4()); payload["timestamp"] = payload["timestamp"] or datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S.%f'); payload["reasons"]='; '.join(payload["reasons"])
  columns=','.join(payload); values='\t'.join(str(payload[k]).replace('\t',' ') for k in payload)
  ch(f"INSERT INTO dns_shield.events ({columns}) FORMAT TabSeparated",values); return payload
@app.get("/events")
def events(limit:int=100):
  result=ch(f"SELECT * FROM dns_shield.events ORDER BY timestamp DESC LIMIT {min(limit,500)} FORMAT JSONEachRow")
  return [__import__('json').loads(x) for x in result.text.splitlines() if x]
@app.post("/passive/zeek")
async def zeek(file:UploadFile=File(...)):
  text=(await file.read()).decode('utf-8',errors='replace'); rows=[]; reader=csv.DictReader([x for x in text.splitlines() if not x.startswith('#')],delimiter='\t')
  for row in reader:
    domain=row.get('query') or row.get('host')
    if domain: rows.append({"domain":domain,"client_ip":row.get('id.orig_h','offline')})
  return {"mode":"passive","format":"zeek-tsv","extracted_queries":rows,"note":"submit each extracted query to POST /v1/query for identical pipeline analysis"}
@app.post("/passive/pcap")
async def pcap(file:UploadFile=File(...)):
  import dpkt
  raw=await file.read(); rows=[]
  try:
    reader=dpkt.pcap.Reader(io.BytesIO(raw))
    for _,packet in reader:
      eth=dpkt.ethernet.Ethernet(packet); ip=eth.data
      if not isinstance(ip,dpkt.ip.IP): continue
      udp=ip.data
      if not isinstance(udp,dpkt.udp.UDP) or udp.dport!=53: continue
      try: q=dpkt.dns.DNS(udp.data)
      except Exception: continue
      if q.qd and q.qd[0].name: rows.append({"domain":q.qd[0].name.decode() if isinstance(q.qd[0].name,bytes) else q.qd[0].name,"client_ip":"offline-pcap"})
  except Exception as e: return {"mode":"passive","format":"pcap","error":f"PCAP parse failed: {e}","extracted_queries":[]}
  return {"mode":"passive","format":"pcap","extracted_queries":rows,"note":"submit extracted queries to the shared pipeline"}
