# Ticket to Taitoka

A railway game for two to five players, with four editions to pick from: **Ticket to Taitoka** on a vintage travel-poster map of the USA, **Ticket to Beijing** on a map of China with a modern high-speed-rail look, **Ticket to Europa** on a 1930s continental-rail map of Europe, and **Ticket to Singapore** on a tropical map of Singapore with an MRT look. Draw train cards, claim routes between cities, and connect your secret destination tickets before the trains run out.

## Quick start: paste this repo's link into Claude

Paste this repository's GitHub link into Claude (Claude Code, the Claude desktop app, or claude.ai) and ask it to set the game up. When it's done, a **Ticket to Taitoka** icon is on your Desktop. Double-click it to play.

### Setup instructions for Claude

You're setting this game up on the user's computer. The goal is a **Ticket to Taitoka** icon on their Desktop that starts the game. Work out which operating system they use.

**Where the game goes.** Put the game folder in the user's home folder (`~/Ticket to Taitoka` on macOS, `C:\Users\<name>\Ticket to Taitoka` on Windows), as the commands below do. Never put it on the Desktop, in Documents, or in iCloud Drive or OneDrive: those sync to the cloud, which locks or evicts files while the game builds. The setup scripts refuse to run from those places. Only the small **Ticket to Taitoka** icon belongs on the Desktop, and the setup script makes it; it just points at the game folder.

**If you can run commands on their computer** (Claude Code, or the desktop app with a terminal or computer-use tool), do the steps below yourself. **If you can't** (for example on claude.ai in a browser), give the user these steps one at a time to copy into Terminal (macOS) or PowerShell (Windows), and check each step's output with them.

**macOS**

```bash
cd ~
curl -L <REPO_URL>/archive/refs/heads/main.zip -o ticket-to-taitoka.zip
unzip -q ticket-to-taitoka.zip && rm ticket-to-taitoka.zip
mv <REPO_NAME>-main "Ticket to Taitoka"
cd "Ticket to Taitoka"
bash desktop/setup-mac.sh
```

(`git clone <REPO_URL> "Ticket to Taitoka"` works too if git is installed.) `setup-mac.sh` does the following:

- checks for Node.js 20 or newer, and installs it with Homebrew if Homebrew is there
- runs `npm install`
- downloads Cloudflare's `cloudflared` into `.tools/`, for online play
- creates `~/Desktop/Ticket to Taitoka.app`

If there's no Node.js and no Homebrew, have the user install the LTS `.pkg` from https://nodejs.org, then run the script again.

**Windows** (PowerShell)

```powershell
cd ~
Invoke-WebRequest <REPO_URL>/archive/refs/heads/main.zip -OutFile ticket-to-taitoka.zip
Expand-Archive ticket-to-taitoka.zip -DestinationPath . ; Remove-Item ticket-to-taitoka.zip
Rename-Item <REPO_NAME>-main "Ticket to Taitoka"
cd "Ticket to Taitoka"
powershell -ExecutionPolicy Bypass -File desktop\setup-windows.ps1
```

`setup-windows.ps1` does the following:

- checks for Node.js 20 or newer, and installs Node LTS with winget if it's missing
- runs `npm install`
- creates the **Ticket to Taitoka** shortcut on the Desktop

`cloudflared` downloads itself the first time the user plays online.

Replace `<REPO_URL>` with the GitHub link the user gave you, without `.git` or a trailing slash, and `<REPO_NAME>` with the repo's name. If the default branch isn't `main`, use its name in the zip URL and in the folder name. To finish, tell the user:

- Double-click the icon. The first start takes a minute while the game builds. Updates install themselves when the icon starts the game.
- Keep the window that opens running while you play.
- Pick USA, China, Europe or Singapore in the browser.
- To play with friends elsewhere, choose *Play online*, host a game and send them the link it shows.

## Play

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run play
```

`npm run play` builds the game, starts it on port 8000, and opens it in your browser. The game opens with a picker for the edition (see below). The terminal also prints the addresses, for other devices:

```
This computer:  http://localhost:8000
On your Wi-Fi:  http://192.168.x.x:8000
```

- **On one computer:** open the first address and choose *Play on this computer*. Between turns, a curtain hides the cards until the next player clicks to reveal theirs.
- **On several computers:** on the host computer, choose *Play on two computers*, enter your name and host a game. Up to four others open the link shown (or scan the QR code) and land in the waiting room, where everyone can pick their colour. When everyone is in, the host presses *Start the game*; the game is set up for exactly the people who joined. All computers must be on the same Wi-Fi network. If a page is refreshed, it rejoins the same seat.
- **Who goes first** is drawn at random at the start of each game.

### Play online with friends in another city

```bash
npm run play:online
```

This starts the game together with a free Cloudflare tunnel, which gives this computer a temporary public address such as `https://some-random-words.trycloudflare.com`. The game opens at that address, where the menu says *Play online*. Host a game and send the link it shows. Anyone can open it from anywhere, with nothing to install. The desktop icon does the same thing.

- It needs Cloudflare's tunnel program, `cloudflared`. On Windows it downloads itself the first time (about 60 MB) into `%LOCALAPPDATA%`, with no installer or admin rights needed. On macOS, `desktop/setup-mac.sh` puts it in `.tools/` (or use `brew install cloudflared`).
- Keep the window open and the computer awake until the game ends. This computer is hosting the game for everyone.
- The address changes every time you start it. Games live in memory, so stopping the window ends any game in progress.
- Anyone with the link can take an open seat, so only share it with the people you're playing with.

### Editions

One build and one server serve all four editions. When the game opens you pick one, then land on the menu (`/menu`):

| Edition | Name | Look |
|---|---|---|
| USA | Ticket to Taitoka | vintage travel poster |
| China | Ticket to Beijing | high-speed rail |
| Europe | Ticket to Europa | 1930s continental rail |
| Singapore | Ticket to Singapore | tropical, MRT |

A switcher in the top bar of the menu, the pass-and-play setup, and the host and waiting-room screens changes the edition; switching reloads the page. In a waiting room only the host can switch, and everyone's screen follows. After a game, the next waiting room keeps the same map. Adding `?edition=usa`, `?edition=china`, `?edition=europe` or `?edition=singapore` to the address also picks one.

### More games

The first page also has four other games, each with its own card. All of them can be played online by sending a link:

| Game | Players | What it is |
|---|---|---|
| Frontline | 2 | hidden-army strategy on a 10 by 10 battlefield; also against the computer or on one screen |
| Fleet | 2 | hide your ships and hunt theirs, with Classic, Salvo and Super Weapons modes; also against the computer or on one screen |
| Egyptian War | 2 to 5 | real-time card slapping: flip, challenge and slap to win all 52 cards; two players can share one keyboard |
| Warfront | 2 to 6 | territory conquest on a world map; also against computer generals or on one screen |

### Desktop icon

The setup scripts above create it. The icon is a combined badge of all three editions, and double-clicking it starts the online game, the same as `npm run play:online`. To make it again, for example after moving the folder:

- **macOS:** `bash desktop/make-shortcut-mac.sh` creates `Ticket to Taitoka.app` on the Desktop. It opens `desktop/play-online.command` in Terminal.
- **Windows:** `powershell -ExecutionPolicy Bypass -File desktop\make-shortcut.ps1` creates a `Ticket to Taitoka` shortcut that runs `desktop\play-online.bat`.

To redraw the icon from `desktop/icon.svg`, run `node desktop/make-icon.mjs`. It writes `icon.ico`, and `icon.icns` on macOS.

**Chat:** in LAN and online games, the panel under "Last moves" lets you type messages or send emotes and quick phrases. Each one also pops up over the sender's name in the top bar. Pass-and-play has no chat, since everyone shares one screen.

**Sound:** the game plays an original old-time railway tune in the background and short sound effects for draws, claims and tickets. The music-note button and the speaker button switch them on and off separately, the volume slider sets how loud both are, and all of it is remembered. The music starts after your first click, because browsers don't play sound before that.

**Updates are automatic.** Each time the desktop icon starts the game, it checks this repository for a newer version. When there is one, the window shows *UPDATE FOUND*, what's new, and progress while it downloads the changed files (about 1 MB) and, only if the game's packages changed, runs `npm install`. Then the game starts as usual. If the computer is offline or GitHub can't be reached, the installed version starts. The updater is `desktop/update.mjs`; it remembers the installed version in `.tools/update-state.json`, and it never touches a git checkout (use `git pull` there).

**Moved or renamed the folder?** Run `npm install` again, then remake the desktop icon. `npm install` relinks the game's internal packages, and `npm run play` won't start until you do.

**Firewall:** the first time the server starts, Windows (or macOS) may ask whether Node.js can use the network. Allow it, at least on **private networks**, or other computers won't be able to connect.

## Rules in brief

On your turn, do one of these:

- **Draw two train cards,** face-up or from the deck. Each player has 50 trains, and there are 7 card colours. A face-up locomotive counts as both of your draws, and it can't be your second card.
- **Claim a route:** pay cards equal to its length, in its colour (gray routes take any one colour; locomotives are wild). Routes score 1, 2, 4, 7, 10 or 15 points for lengths 1 to 6. Both tracks of a double route can be used, but nobody can own both of them.
- **Take three destination tickets** (you'll be asked to confirm) and keep at least one.

When someone ends a turn with two or fewer trains, everyone gets one last turn. Completed tickets add their value and incomplete ones subtract it, and the longest continuous path earns 10 points (ties all score). If the totals are tied, the player with the most completed tickets wins, then the holder of the longest path.

The **Rules** button in the game (and **How to play** on the start screen) opens an illustrated guide. After a game, **View the board** shows the final map and **Save results (PDF)** prints a results sheet you can save as a PDF.

## Develop

```bash
npm run dev        # game server on :8000 plus Vite on :5173 (also reachable on your LAN)
npm test           # Vitest: rules engine, map layout checks, 500-game fuzz test, client selectors
npm run e2e        # builds, then runs the Playwright tests (needs: npx playwright install chromium)
npm run typecheck
```

The project is split into three packages:

- `packages/shared`: map data, the rules engine, graph helpers (graphology) and the boardgame.io game definition. Editions are defined in `packages/shared/src/editions.ts`, and the maps are in `packages/shared/src/map/` (`usa`, `china`, `europe`).
- `packages/server`: the boardgame.io server. It also serves the built client and `/api/lan-info`.
- `packages/client`: React, Vite and Tailwind.
