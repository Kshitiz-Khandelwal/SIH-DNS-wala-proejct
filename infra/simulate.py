"""Safe demo traffic generator; it only calls the local gateway API."""
import argparse, requests, random
BASE="http://localhost:8080/v1/query"
scenarios={
 "benign":["isro.gov.in","google.com","github.com"],
 "dga":["xq9m2kz7v4na.com","lq3zp89vbcx.net","ad7qxm91bz.io"],
 "tunnelling":["".join("abcdef0123456789"[i%16] for i in range(60))+".exfil-demo.example"],
 "c2":["c2.bad-demo.example"],
 "typosquat":["gooogle.com","isro-gov.in"]}
p=argparse.ArgumentParser();p.add_argument("scenario",choices=scenarios);p.add_argument("--device",default="172.28.0.99");p.add_argument("--repeat",type=int,default=1);a=p.parse_args()
for _ in range(a.repeat):
 for domain in scenarios[a.scenario]: print(requests.post(BASE,json={"domain":domain,"client_ip":a.device,"source":"lab-simulation"},timeout=2).json())

