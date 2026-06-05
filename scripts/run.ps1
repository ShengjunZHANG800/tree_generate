param(
  [int]$Port = 8765,
  [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
  $Python = "python"
}

Set-Location $ProjectRoot
& $Python -m uvicorn ewens_app.main:app --host $HostName --port $Port
