import os
from fastapi import FastAPI
from pydantic import BaseModel
app=FastAPI(title="DNS Shield Geo Intelligence",version="1.0.0")
class Lookup(BaseModel): ip:str
@app.post("/lookup")
def lookup(q:Lookup):
    # GeoLite database is deliberately offline. Missing DB means neutral contribution.
    path=os.getenv("MAXMIND_MMDB_PATH","/data/GeoLite2-City.mmdb")
    if not os.path.exists(path): return {"ip":q.ip,"available":False,"risk_contribution":0,"reason":"offline GeoLite2 database unavailable; neutral fallback"}
    import geoip2.database
    with geoip2.database.Reader(path) as reader:
      city=reader.city(q.ip); country=city.country.iso_code; return {"ip":q.ip,"available":True,"country":country,"city":city.city.name,"latitude":city.location.latitude,"longitude":city.location.longitude,"risk_contribution":0,"reason":"offline lookup; country/ASN never blocks by itself"}
