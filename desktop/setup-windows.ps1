# One-time setup on Windows: checks Node.js, installs the game's packages and puts the "Ticket to Taitoka"
# shortcut on the Desktop. (Cloudflare's tunnel program downloads itself the first time you play online.)
# Usage (from the game folder): powershell -ExecutionPolicy Bypass -File desktop\setup-windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))

function Get-NodeMajor { try { [int]((node -p "process.versions.node.split('.')[0]") 2>$null) } catch { 0 } }
if ((Get-NodeMajor) -lt 20) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Output 'Installing Node.js LTS with winget...'
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  }
  if ((Get-NodeMajor) -lt 20) { Write-Output 'Node.js 20 or newer is required. Install it from https://nodejs.org, then run this again.'; exit 1 }
}
Write-Output "Node $(node -v)"

Write-Output "Installing the game's packages..."
npm install --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& (Join-Path $PSScriptRoot 'make-shortcut.ps1')
Write-Output ''
Write-Output 'Done. Double-click "Ticket to Taitoka" on the Desktop to play.'
