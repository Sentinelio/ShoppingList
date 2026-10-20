#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Deploys the BabelCart PocketBase backend (migrations + hooks) to the
  Windows server where PocketBase runs as the NSSM service "PocketBase".

.DESCRIPTION
  Run from a clone of the repo, in an elevated PowerShell:

    .\pocketbase\deploy-server.ps1            # update: replace migrations + hooks, restart
    .\pocketbase\deploy-server.ps1 -Reset     # first install: also wipes pb_data (ALL DATA)

  Steps:
    1. nssm stop PocketBase
    2. Replace C:\pocketbase\pb_migrations and C:\pocketbase\pb_hooks with
       the repo copies (both folders are emptied first)
    3. -Reset only: delete C:\pocketbase\pb_data
    4. nssm start PocketBase and wait for http://127.0.0.1:8090/api/health
  PocketBase applies pending migrations automatically when it starts.

.PARAMETER Reset
  Delete pb_data (database + uploaded files). Needed for the first install
  over the earlier prototype. You must recreate the superuser afterwards.

.PARAMETER Force
  With -Reset: don't ask for confirmation.
#>
param(
  [switch]$Reset,
  [switch]$Force,
  [string]$PbDir = "C:\pocketbase",
  [string]$Service = "PocketBase",
  [string]$HealthUrl = "http://127.0.0.1:8090/api/health"
)

$ErrorActionPreference = "Stop"

$src = $PSScriptRoot  # <repo>\pocketbase
$srcMigrations = Join-Path $src "pb_migrations"
$srcHooks = Join-Path $src "pb_hooks"
$dstMigrations = Join-Path $PbDir "pb_migrations"
$dstHooks = Join-Path $PbDir "pb_hooks"
$dstData = Join-Path $PbDir "pb_data"
$exe = Join-Path $PbDir "pocketbase.exe"

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }

# -- Sanity checks ----------------------------------------------------------
if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
  throw "nssm not found in PATH."
}
if (-not (Test-Path $exe)) { throw "$exe not found." }
if (-not (Test-Path $srcMigrations) -or -not (Test-Path $srcHooks)) {
  throw "Run this script from a clone of the repo (expected $srcMigrations and $srcHooks)."
}

# The earlier prototype's schema conflicts with these migrations (same
# collection names, different fields): it can only be replaced with -Reset.
$prototype = Join-Path $dstMigrations "1792516000_babelcart_schema.js"
if ((Test-Path $prototype) -and -not $Reset) {
  throw "The prototype migration ($prototype) is installed. The first deploy needs -Reset (wipes pb_data)."
}

if ($Reset -and -not $Force) {
  $answer = Read-Host "This deletes $dstData (database and uploaded files). Type RESET to continue"
  if ($answer -ne "RESET") { Write-Host "Aborted."; exit 1 }
}

# -- 1. Stop ----------------------------------------------------------------
Step "Stopping service $Service"
& nssm stop $Service 2>&1 | Out-Host
$deadline = (Get-Date).AddSeconds(30)
while ((Get-Service $Service).Status -ne "Stopped") {
  if ((Get-Date) -gt $deadline) { throw "Service $Service did not stop within 30s." }
  Start-Sleep -Milliseconds 500
}

# -- 2. Copy migrations + hooks ---------------------------------------------
foreach ($pair in @(@($srcMigrations, $dstMigrations), @($srcHooks, $dstHooks))) {
  $from, $to = $pair
  Step "Replacing $to"
  if (Test-Path $to) { Get-ChildItem -Force $to | Remove-Item -Recurse -Force }
  else { New-Item -ItemType Directory -Force $to | Out-Null }
  Copy-Item -Recurse -Force (Join-Path $from "*") $to
}

# -- 3. Reset data ----------------------------------------------------------
if ($Reset) {
  Step "Deleting $dstData"
  if (Test-Path $dstData) { Remove-Item -Recurse -Force $dstData }
}

# -- 4. Start + health check ------------------------------------------------
Step "Starting service $Service"
& nssm start $Service 2>&1 | Out-Host

$deadline = (Get-Date).AddSeconds(60)
$healthy = $false
while ((Get-Date) -lt $deadline) {
  try {
    $res = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 $HealthUrl
    if ($res.StatusCode -eq 200) { $healthy = $true; break }
  } catch { Start-Sleep -Seconds 1 }
}

if (-not $healthy) {
  Write-Host "Health check FAILED: $HealthUrl did not answer 200 within 60s." -ForegroundColor Red
  Write-Host "Check the service logs (nssm get $Service AppStdout / AppStderr)." -ForegroundColor Red
  exit 1
}
Write-Host "Health check OK: $HealthUrl" -ForegroundColor Green

if ($Reset) {
  Write-Host ""
  Write-Host "pb_data was wiped: recreate the superuser now, e.g.:" -ForegroundColor Yellow
  Write-Host "  & `"$exe`" superuser upsert you@example.com 'a-long-password' --dir `"$dstData`"" -ForegroundColor Yellow
  Write-Host "Then open https://server-pc.tail3b4002.ts.net/_/ to log in." -ForegroundColor Yellow
}
