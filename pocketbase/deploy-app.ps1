<#
.SYNOPSIS
  Publishes the copy of the BabelCart app that the PocketBase server serves
  itself, at https://<server>/ShoppingList/ (pb_public).

.DESCRIPTION
  With the app and the API on the same address, browsers don't block the
  API when Tailscale is on (the server then has a private 100.x address and
  a public web page — GitHub Pages — may not call it). GitHub Pages keeps
  working as before; this is a second copy.

    .\pocketbase\deploy-app.ps1                  # build + publish
    .\pocketbase\deploy-app.ps1 -SkipBuild       # publish the last build again

  Steps:
    1. npm run build with VITE_PB_URL=same-origin, into dist-server\
    2. Mirror dist-server\ into <repo>\Servidor\pb_public\ShoppingList\
       (only that folder; pb_data, hooks and migrations are not touched)
  PocketBase serves pb_public as it is: no restart, no Tailscale change.

.PARAMETER PublicDir
  PocketBase's pb_public folder (next to pocketbase.exe by default).
#>
param(
  [switch]$SkipBuild,
  [string]$PublicDir = (Join-Path (Split-Path $PSScriptRoot -Parent) "Servidor\pb_public"),
  [string]$AppUrl = "http://127.0.0.1:8090/ShoppingList/"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
$out = Join-Path $repo "dist-server"
$target = Join-Path $PublicDir "ShoppingList"

Push-Location $repo
try {
  if (-not $SkipBuild) {
    Write-Host "==> Building the server copy (VITE_PB_URL=same-origin)"
    $env:VITE_PB_URL = "same-origin"
    try {
      npm run build -- --outDir dist-server --emptyOutDir
      if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    } finally {
      Remove-Item Env:VITE_PB_URL -ErrorAction SilentlyContinue
    }
  }
  if (-not (Test-Path (Join-Path $out "index.html"))) { throw "No build in $out" }

  Write-Host "==> Publishing to $target"
  New-Item -ItemType Directory -Force $target | Out-Null
  robocopy $out $target /MIR /NFL /NDL /NJH /NJS /NP | Out-Host
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }

  $code = (Invoke-WebRequest $AppUrl -UseBasicParsing -TimeoutSec 15).StatusCode
  Write-Host "App answers at $AppUrl ($code)"
} finally {
  Pop-Location
}
