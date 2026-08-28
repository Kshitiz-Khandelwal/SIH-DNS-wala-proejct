# DNS Shield — Local Dev Launcher
# Run from repo root: .\start_local.ps1
# Starts: Redis + all Python services + Next.js frontend

$ROOT = $PSScriptRoot
$PYTHONPATH = $ROOT
$ARTIFACTS = "$ROOT\services\ml-inference\artifacts"

function Start-Service($name, $port, $dir, $module) {
    Write-Host "Starting $name on :$port ..." -ForegroundColor Cyan
    $env:PYTHONPATH = $ROOT
    $env:MODEL_ARTIFACT_DIR = $ARTIFACTS
    $env:REDIS_URL = "redis://localhost:6379/0"
    $env:CORS_ORIGINS = "http://localhost:3000"
    Start-Process powershell -ArgumentList "-NoExit", "-Command",
        "cd '$dir'; `$env:PYTHONPATH='$ROOT'; `$env:MODEL_ARTIFACT_DIR='$ARTIFACTS'; `$env:REDIS_URL='redis://localhost:6379/0'; `$env:CORS_ORIGINS='http://localhost:3000'; uvicorn $module --host 0.0.0.0 --port $port --reload" `
        -WindowStyle Normal
    Start-Sleep -Milliseconds 800
}

# 1. Redis
Write-Host "Checking Redis..." -ForegroundColor Yellow
$ping = redis-cli ping 2>&1
if ($ping -ne "PONG") {
    Write-Host "Starting Redis..." -ForegroundColor Yellow
    Start-Process -FilePath "redis-server" -ArgumentList "--port 6379" -WindowStyle Minimized
    Start-Sleep -Seconds 2
}
Write-Host "Redis: READY" -ForegroundColor Green

# 2. Python services
Start-Service "threat-intel"      8003 "$ROOT\services\threat-intel"      "app:app"
Start-Service "ml-inference"      8000 "$ROOT\services\ml-inference"      "app:app"
Start-Service "behavioral-engine" 8001 "$ROOT\services\behavioral-engine" "app:app"
Start-Service "geo-intel"         8002 "$ROOT\services\geo-intel"         "app:app"
Start-Service "active-response"   8004 "$ROOT\services\active-response"   "app:app"
Start-Service "analytics-store"   8005 "$ROOT\services\analytics-store"   "app:app"
Start-Service "api-gateway"       8080 "$ROOT\services\api-gateway"       "app:app"

Write-Host ""
Write-Host "Waiting 5s for services to boot..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 3. Health checks
Write-Host ""
Write-Host "=== Health Checks ===" -ForegroundColor Cyan
$ports = @(8000,8001,8002,8003,8004,8005,8080)
foreach ($p in $ports) {
    try {
        $r = Invoke-RestMethod "http://localhost:$p/health" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "  :$p  OK  $($r | ConvertTo-Json -Compress)" -ForegroundColor Green
    } catch {
        Write-Host "  :$p  (starting or no /health endpoint)" -ForegroundColor Yellow
    }
}

# 4. Frontend
Write-Host ""
Write-Host "Starting Next.js frontend on :3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$ROOT\frontend'; `$env:NEXT_PUBLIC_API_URL='http://localhost:8080'; npm run dev" `
    -WindowStyle Normal

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  All services launched!" -ForegroundColor Green
Write-Host "  Frontend:   http://localhost:3000" -ForegroundColor White
Write-Host "  Gateway:    http://localhost:8080/docs" -ForegroundColor White
Write-Host "  ML Service: http://localhost:8000/docs" -ForegroundColor White
Write-Host "=======================================" -ForegroundColor Green
