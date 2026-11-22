#!/bin/bash
# One-time setup on macOS: checks Node.js, installs the game's packages, fetches Cloudflare's tunnel program
# (for online play) and puts the "Ticket to Taitoka" icon on the Desktop.
# Usage (from the game folder): bash desktop/setup-mac.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# A folder downloaded with a browser is quarantined, and macOS would block the launcher; clear that.
xattr -dr com.apple.quarantine . 2>/dev/null || true
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin"

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  if command -v brew >/dev/null; then
    echo "Installing Node.js with Homebrew..."; brew install node
  else
    echo "Node.js 20 or newer is required. Install it from https://nodejs.org (the LTS .pkg), then run this again."; exit 1
  fi
fi
echo "Node $(node -v)"

echo "Installing the game's packages..."
npm install --no-audit --no-fund

if ! command -v cloudflared >/dev/null && [ ! -x .tools/cloudflared ]; then
  arch="$(uname -m)"; [ "$arch" = "arm64" ] && flavour=arm64 || flavour=amd64
  echo "Downloading Cloudflare's tunnel program (cloudflared, for online play)..."
  mkdir -p .tools
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-$flavour.tgz" | tar -xz -C .tools
  chmod +x .tools/cloudflared
fi

bash desktop/make-shortcut-mac.sh
echo
echo "Done. Double-click \"Ticket to Taitoka\" on the Desktop to play."
