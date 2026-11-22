#!/bin/zsh -l
# macOS: build the game, start the online game and open it in the browser (same as `npm run play:online`).
# The desktop icon made by make-shortcut-mac.sh opens this in Terminal. Keep the window open while you play.
here="${0:A:h}"
cd "$here/.."
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin"
[ -x "$PWD/.tools/cloudflared" ] && export CLOUDFLARED="$PWD/.tools/cloudflared"

printf '\033]0;Ticket to Taitoka - online\007'
echo
echo "  Building the game and starting an online game..."
echo "  Pick the edition (USA, China or Europe) in the game. Keep this window open while you play."
echo "  Close it (or press Ctrl+C) to stop."
echo
if ! command -v npm >/dev/null; then
  echo "  Node.js was not found. Install it (https://nodejs.org, version 20 or newer), then run desktop/setup-mac.sh again."
  read -k1 "?Press any key to close."; exit 1
fi
npm run play:online
echo
echo "  The game has stopped."
read -k1 "?Press any key to close."
