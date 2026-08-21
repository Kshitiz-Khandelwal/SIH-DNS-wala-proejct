import yaml

with open("infra/docker-compose.yml", "r") as f:
    compose = yaml.safe_load(f)

for service_name, service in compose.get("services", {}).items():
    # add restart policy
    if service_name != "lab":
        service["restart"] = "unless-stopped"
    
    # add volumes for redis and clickhouse
    if service_name == "redis":
        service.setdefault("volumes", []).append("redis_data:/data")
    if service_name == "clickhouse":
        volumes = service.get("volumes", [])
        # replace the relative path schema file with the named volume for data
        volumes.append("clickhouse_data:/var/lib/clickhouse")
        service["volumes"] = volumes

# ensure volumes block exists at root level
if "volumes" not in compose:
    compose["volumes"] = {}

compose["volumes"]["redis_data"] = None
compose["volumes"]["clickhouse_data"] = None

with open("infra/docker-compose.yml", "w") as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)
