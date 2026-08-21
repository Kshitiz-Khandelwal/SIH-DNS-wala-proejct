import yaml

with open("infra/docker-compose.yml", "r") as f:
    compose = yaml.safe_load(f)

for service_name, service in compose.get("services", {}).items():
    if service_name != "lab":
        service["restart"] = "unless-stopped"
    
    if service_name == "redis":
        v = service.get("volumes", [])
        if "redis_data:/data" not in v:
            v.append("redis_data:/data")
        service["volumes"] = v
    if service_name == "clickhouse":
        v = service.get("volumes", [])
        if "clickhouse_data:/var/lib/clickhouse" not in v:
            v.append("clickhouse_data:/var/lib/clickhouse")
        service["volumes"] = v

if "volumes" not in compose:
    compose["volumes"] = {}

compose["volumes"]["redis_data"] = None
compose["volumes"]["clickhouse_data"] = None

with open("infra/docker-compose.yml", "w") as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)
