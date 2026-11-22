#!/bin/bash
# macOS: puts a "Ticket to Taitoka" app on the Desktop. Double-clicking it opens play-online.command in Terminal.
# Usage: bash desktop/make-shortcut-mac.sh   (run it again if you move the game folder)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
app="$HOME/Desktop/Ticket to Taitoka.app"
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp "$here/icon.icns" "$app/Contents/Resources/AppIcon.icns"
cat > "$app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Ticket to Taitoka</string>
  <key>CFBundleDisplayName</key><string>Ticket to Taitoka</string>
  <key>CFBundleIdentifier</key><string>local.tickettotaitoka.launcher</string>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1.0</string>
</dict></plist>
PLIST
cat > "$app/Contents/MacOS/launch" <<LAUNCH
#!/bin/bash
open -a Terminal "$here/play-online.command"
LAUNCH
chmod +x "$app/Contents/MacOS/launch" "$here/play-online.command"
touch "$app"
echo "Created $app"
