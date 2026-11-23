# Project: Ticket to Taitoka (LAN, Online & Pass-and-Play Tabletop Web App)

> **Setting the game up for a player?** Follow "Setup instructions for Claude" in `README.md` (macOS: `bash desktop/setup-mac.sh`; Windows: `powershell -ExecutionPolicy Bypass -File desktop\setup-windows.ps1`). They install Node if needed, run `npm install`, and put a **Ticket to Taitoka** icon on the Desktop.

## Tech Stack & Architecture
- **Monorepo**: `npm` workspaces with `/packages/shared` (rules, types, map JSON), `/packages/server` (Node + `boardgame.io`), and `/packages/client` (React + Vite + TypeScript + Tailwind CSS).
- **Library Docs**: Use `context7` to verify exact APIs for `boardgame.io`, `graphology`, and Tailwind CSS.
- **Board Rendering**: Scalable interactive `<svg>` map with vector tracks, curved/offset double routes, individual clickable train car slots, and city nodes.
- **Graph Engine**: Use `graphology` in `/packages/shared` for ticket completion verification and edge-disjoint longest continuous trail calculation (permitting loops/cycles without reusing individual train pieces)[cite: 4].

## Core Game Rules & State Machine Specifications (`@rules.pdf`)
1. **Setup**: 
   - Each player starts with **50** train cars (house rule; the rulebook says 45)[cite: 2].
   - **House rule: 7 card colours** (purple removed): 14 of each colour + 14 locomotives = 112 train cards.
   - Deal **4 Train Car cards** to each player[cite: 2].
   - Turn 5 Train Car cards face-up in the market pool; place the rest as a draw deck[cite: 2].
   - Deal **3 Destination Tickets** to each player; each must keep at least 2 (may keep all 3), returning unkept tickets to the bottom of the deck[cite: 2].
2. **Turn Actions (Pick 1 of 3)**:
   - **Draw Train Car Cards**: Draw 2 cards total. Face-up locomotive rule: taking 1 face-up locomotive ends the draw phase immediately (cannot draw a second card); if a replacement card is a locomotive, it cannot be taken. If 3 of the 5 face-up cards are locomotives, all 5 are immediately discarded and replaced[cite: 3]. Blind draws from the deck count as 1 card even if a locomotive is drawn[cite: 3]. If deck and discards are completely empty, drawing train cards is disabled[cite: 3].
   - **Claim a Route**: Play a set of matching colored cards equal to the route length (or gray routes using any single color plus optional locomotives)[cite: 3]. Score points immediately based on the official table: 
     - 1 length = 1 pt[cite: 4]
     - 2 length = 2 pts[cite: 4]
     - 3 length = 4 pts[cite: 4]
     - 4 length = 7 pts[cite: 4]
     - 5 length = 10 pts[cite: 4]
     - 6 length = 15 pts[cite: 4]
   - **Draw Destination Tickets**: Draw 3 tickets from the top of the deck; must keep at least 1 (up to all 3)[cite: 3, 4].
3. **Double-Routes (house rule)**: 
   - At every player count both tracks of a double route are usable, but one player may own only one of the two. (The rulebook closes the second track in 2–3 player games[cite: 3]; this game uses the house rule.)
4. **Game End & Final Scoring**:
   - Triggered when any player's train stock drops to **0, 1, or 2 trains** at the end of their turn[cite: 4]. Every player (including the trigger player) gets **one final turn**[cite: 4].
   - Final scoring adds completed ticket values and subtracts uncompleted ticket values[cite: 4].
   - Longest Continuous Path bonus awards **10 points** (ties split the bonus)[cite: 4].
   - Tie-breakers: 1) Most completed Destination Tickets, 2) Longest Continuous Path card[cite: 4].

## Editions and Skins (USA / China / Europe / Singapore, chosen at runtime)
- **One build, one server.** `npm run play` builds the client once and starts the server; the player picks the edition in the browser. There are no per-edition build modes, `.env.*` files or `play:usa|china|europe|singapore` scripts.
- An **edition** (`packages/shared/src/editions.ts`: `EDITIONS`, `EDITION_IDS`, `isEditionId`, `editionFor`) fixes three things together: the map, the skin (game name) and the theme. `usa` = Taitoka skin, USA map, `vintage` theme ("Ticket to Taitoka"); `china` = Beijing skin, China map, `hsr` theme ("Ticket to Beijing"); `europe` = Europa skin, Europe map, `rail` theme ("Ticket to Europa"); `singapore` = Singapore skin, SG map, `merlion` theme ("Ticket to Singapore"; the hub is named Marina Bay via `skin.hubName`). Only these four are offered.
- A **skin** (`packages/shared/src/skins.ts`) changes only the game name (= hub city `BOB`'s name, unless `hubName` is set).
- Client: `packages/client/src/edition.ts` is imported first in `main.tsx`. It resolves the edition (`?edition=` in the URL, else `localStorage` `ttb.edition`, else `usa`), sets `globalThis.__TTB_EDITION__`, `<html data-theme>` and the tab title, and exports `EDITION`. `setEdition(id)` saves the choice and reloads, because many modules read the map and theme once when they load. `/` is the edition picker (`EditionPicker`), `/menu` is the start menu, and `EditionSwitcher` (via `Frame edition`) switches edition on the menu, local setup and waiting room.
- Client code must use `cityName(id)`, `SKIN` and `GAME_TITLE` from `packages/client/src/lib/skin.ts`, never `CITY_BY_ID[id].name` or a literal game name; `skin.test.ts` enforces this.

## Bots (LAN/online waiting room)
- The host adds Easy / Medium / Hard bots to open seats (`/api/bots/add`, `/api/bots/remove`, host checked by seat-0 credentials). The seat's `data.bot` holds the level.
- Brain: `packages/shared/src/bot/`, a pure `chooseBotMove(view, ctx, me, level, rng)`. Strategies are in `levels/`, planning in `plan.ts`, and opponent guessing in `opponents.ts`. `legalize()` turns any illegal choice into a legal one, so a bot never stalls the game.
- Bots play fair: they decide only from their own `playerView`. `test/botRunner.ts` enforces this.
- Server: `packages/server/src/bots.ts` connects one socket client per bot to the server. Bots follow the group into the game and back into the next waiting room. Each action waits about 1.1 s, and the first action of a turn about 2.1 s (`turnLeadMs`, 2100/1100 x the delay) so the turn banner is over first; `TTB_BOT_DELAY` overrides the delay and the lead scales with it (e2e uses 50 ms).
- Tests: `bot*.test.ts` and `fuzz.bots*.test.ts`, plus `bot.strength.test.ts`, which checks that Hard > Medium > Easy.

## Chat
- LAN, online and pass-and-play: boardgame.io's chat relay (`client.sendChatMessage`, `client.chatMessages`), passed from `screens/Lan.tsx` to `GameScreen` as `chat`. Received payloads are untrusted: always read them through `readChat()` in `packages/client/src/lib/chat.ts` (text capped, emotes from a fixed list). Messages are not stored, so a reload starts with an empty chat.

## Maps (USA / China / Europe / Singapore)
- **Runtime maps, one process.** All maps are loaded; the active map is a live binding that `useMap(id)` / `withMap(id, fn)` (`packages/shared/src/map/index.ts`) switch. Every game records its own map in `G.mapId` (set in `setup` from `setupData.map`, default `DEFAULT_MAP_ID`). `BobolandGame` wraps every hook (setup, moves, `playerView`, phases, `endIf`...) in `withMap(G.mapId, ...)`, so one server runs games on different maps at once. Code that runs outside the game hooks (bots, `legalActions`, `chooseBotMove`) uses `withGameMap(G, fn)` / `mapOfGame(G)`. `setupData` is validated (an unknown map is rejected).
- `DEFAULT_MAP_ID` (`map/index.ts`, from `activeMapId()` in `map/active.ts`) is fixed when the code loads: in the browser it follows the edition (`globalThis.__TTB_EDITION__`, set by `edition.ts` before the map code loads); on the server and in tests it is `TTB_MAP`. The server (`packages/server/src/map.ts` `defaultMap`) takes `--map=`, else `TTB_MAP`, else `usa`; it only decides which map a match gets when `setupData` names none. Clients always send `setupData: { map }`.
- Pass-and-play: `lib/setupGame.ts` `gameOnMap(game, map)` passes the map into `setup` (boardgame.io's local Client cannot pass `setupData`). LAN: `startLanMatch` sends `setupData: { map }` to `playAgain`, using the room's edition (seat 0 data) when known (`mapForRoom`), else this page's edition.
- Map data: `map/usa/` (cities, routes with optional `curve`, tickets, Albers projection, generated geography), `map/china/` and `map/europe/` (37 cities, 83 links / 94 routes, 42 tickets; London + Edinburgh only in Britain; the long 5-6 routes sit mostly in the North Sea / Scandinavia / Baltic). Geometry (lanes, car slots, curves, crowded-city insets) is in `map/model.ts`; client code gets cars from `carRects()` and draws them with `CarBox` so curved cars bend.
- USA map rules are tests in `packages/shared/test/usa-map.test.ts` (no colour 3+ times into a city; exactly Nashville, Atlanta, Pittsburgh have one colour twice; equal cars per colour; no city easy to cut off; no crossings or touching cars). `fuzz.usa.test.ts` plays 500 games on it. China: `china-map.test.ts`, `fuzz.china.test.ts`. Europe: `europe*.test.ts`. `editions.test.ts` covers runtime switching and `G.mapId`.

## Themes
- `THEME_ID` / `HSR` in `packages/client/src/theme.ts` (`vintage` | `hsr` | `rail` | `merlion`) come from the edition (`EDITION.theme`), so they are fixed per page load. Palettes share names, so components read tokens and need no branching.
- Tailwind tokens are overridden in `theme-hsr.css`; per-area HSR styles live in `src/hsr/*.css`, scoped under `[data-theme="hsr"]`.
- Sounds and music switch by `HSR` (`soundHsr.ts`, `songHsr.ts`).
- Singapore (`merlion`): `MERLION` flag and palette in `theme.ts`; `theme-merlion.css` imports `merlion/*.css` (Poppins + Inter, Peranakan tile pattern, MRT line colours); `src/merlion/` holds the cards, tickets, menu chrome/hero and board places; `board/SgGeoLayer.tsx` draws the island; `MerlionCelebration` in `ClaimCelebration.tsx`; intro `curtain/MerlionCurtain.tsx`; sounds `lib/soundMerlion.ts`, music `lib/songMerlion.ts`. Map data in `packages/shared/src/map/sg/` (38 places). Tests: `sg-map.test.ts`, `sg-balance.test.ts`, `fuzz.sg.test.ts`, `fuzz.bots.sg.test.ts`, client `merlionFx.test.ts`, e2e `singapore.spec.ts`.
- Vintage must stay unchanged.

## Game Modes & LAN Networking
- **LAN Multiplayer**: Bind Vite and `boardgame.io` server to `0.0.0.0`. Display local LAN IP URL + QR code (`qrcode.react`) in the lobby. Use `playerView` to hide draw deck orders and opponents' secret tickets.
- **Pass-and-Play**: Single-device turn-based mode with a privacy curtain between turns.
- **Lobby (LAN/online)**: hosting creates a 5-seat waiting-room match (no player count). Joiners pick colours there (`data.color` via the Lobby `update` API). Seat 0's `data.edition` is the room's edition: only the host sees an enabled `EditionSwitcher` in the waiting room (`setRoomEdition`), every other screen is locked and follows (`useFollowEdition` reloads into the host's edition; `lib/seatData.ts` merges seat data, since `updatePlayer` replaces `data`). `LanGame` also reloads into the edition of `G.mapId` if it differs. The host's Start calls `playAgain` with the number who joined and `setupData: { map }`; every waiting room sees `nextMatchID` and joins the new match in seat order (`packages/client/src/lib/lobbyRules.ts`, `lib/lobby.ts`).
- **Turn order**: `setup` shuffles all seat ids with boardgame.io's seeded `random.Shuffle` (after the card shuffles) into `G.turnOrder`; the main phase uses it as `playOrder`, so both who starts and who follows whom are random (bots and humans alike). Seat ids, colours and the waiting-room mapping do not change. `finalTurnsDone` reads `G.turnOrder` too.

## Engineering & Testing Standards
- **TDD (`superpowers:test-driven-development`)**: Write failing Vitest unit tests before implementing core rules. Include fuzz tests running 500 simulated games to ensure zero soft-locks.
- **Playwright E2E**: `npm run e2e` builds the client once and runs every spec against the one server (default map `usa`). Specs open `/menu` (or `/menu?edition=china|europe`; `/` is the edition picker) and play on the USA edition unless they pick another. `?seed=e2e1` makes pass-and-play deterministic (Bo first on the USA map; seed `e2e` gives Ana). Specs: pass-and-play, 2-window LAN sync, bots, music, `china.spec.ts` and `europe.spec.ts` (seed-independent, via `?edition=`), and `editions.spec.ts` (picker, menu switcher, local game on the chosen map, host switches the map in the waiting room and the joiner follows).
- Commands: `npm run dev` (server + Vite), `npm run build`, `npm run play`, `npm run play:online`, `npm run start`, `npm run typecheck`, `npm test`, `npm run e2e`.