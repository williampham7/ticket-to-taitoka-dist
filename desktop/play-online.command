#!/bin/zsh -l
# macOS: update the game if a new version is on GitHub, then build it, start the online game and open it in
# the browser (same as `npm run play:online`). The desktop icon made by make-shortcut-mac.sh opens this in
# Terminal. Keep the window open while you play.
# The body is one { } block so zsh reads all of it before running: the updater may replace this file.
{
here="${0:A:h}"
cd "$here/.."
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin:/opt/homebrew/opt/node@22/bin:/usr/local/opt/node@22/bin"
[ -x "$PWD/.tools/cloudflared" ] && export CLOUDFLARED="$PWD/.tools/cloudflared"

printf '\033]0;Ticket to Taitoka - online\007'
echo
echo "  Ticket to Taitoka"
echo
if ! command -v npm >/dev/null; then
  echo "  Node.js was not found. Install it (https://nodejs.org, version 20 or newer), then run desktop/setup-mac.sh again."
  read -k1 "?Press any key to close."; exit 1
fi
node desktop/update.mjs
echo
echo "  Building the game and starting an online game..."
echo "  Pick the edition in the game. Keep this window open while you play."
echo "  Close it (or press Ctrl+C) to stop."
echo
npm run play:online
echo
echo "  The game has stopped."
read -k1 "?Press any key to close."
exit
}
