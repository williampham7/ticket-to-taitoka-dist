# Blocky Implementation Plan

> **For agentic workers:** This is a milestone checklist, not code. Execute it in order in one session (superpowers:executing-plans style). Subagents only where a task says so. Tick `- [ ]` boxes as you go. After every milestone: tick, commit, push `feat/blocky`.

**Goal:** Blocky, a 2-4 player corner-touching polyomino game ("Sky Isles"), with online rooms, server bots, party, pass and play, vs computer, and full art, animation and audio.

**Architecture:** pure-TS rules in `packages/shared/src/blocky/` (a single `act` move, perfect information, a public capped log plus `G.placed` as the board's truth). A React client in `packages/client/src/blocky/` that is a copy of Runeshift's plumbing (lobby, Lan, Local, the fx queue) with a new SVG board. Server bots in `packages/server/src/blockyBots.ts`.

**Tech stack:** boardgame.io, React, Vite, TS, inline SVG, CSS, Web Audio. No new dependencies.

**Spec:** `docs/blocky/PROMPT.md`, with every fix in `docs/blocky/REVIEW.md` applied (cited below as R1-R23). Decisions go in `docs/blocky/SPEC.md`.

## Global constraints
- The trademarked name never appears. CSS prefix `bly-`, storage `bly.*`, never the class `hidden`, never `.blocky > *`. `.blocky { isolation: isolate }`.
- Shared files get one additive block each, marked `// Blocky` (list in Task 3.1).
- Every move is `client: false` with `ActivePlayers.ALL`. The engine checks `G.actor` (R2).
- Timings live in `shared/src/blocky/timing.ts` (blocking lengths) and `client/src/blocky/fx.ts`. Tuning numbers live in `shared/src/blocky/tuning.ts`.
- iPad: no per-cell filters, no `feTurbulence`, no `backdrop-filter` on anything that animates. The ghost moves by transform in rAF. Pointer Events, `touch-action: none` on the board and shelf, 44 px targets.
- While building, run only targeted Vitest files. Run the full suite in M10.

## Review focus (each item is pinned by a test in the named task)
1. 3-player shared rotation when a seat resigns mid-rotation: the next live seat plays it (1.3 `shared rotation skips resigned seat`).
2. A pending ghost made illegal by an incoming event is dropped, not sent (5.3 `pending revalidated on event`).
3. A reconnect with a log gap jumps and clears drag and pending (6.1 `newEvents returns null on gap`; 5.3 `jump clears pending`).
4. The same human twice in a row gets no curtain (7.3 `curtain only between different humans`).
5. A 2-player resign ends the game at once with the other seat winning (1.3 `2p resign ends game`).

## Shared types (produced by 1.1-1.3; every later task uses these names)
```ts
type Guild = 'tide' | 'sun' | 'ember' | 'grove';            // GUILDS in play order
type PieceId = 'I1'|'I2'|'I3'|'V3'|'I4'|'L4'|'T4'|'S4'|'O4'|'F'|'I5'|'L5'|'N'|'P'|'T5'|'U'|'V'|'W'|'X'|'Y'|'Z';
type Board = 'classic' | 'duo';
type Reason = 'offBoard' | 'overlap' | 'ownEdge' | 'noCorner' | 'notStart' | 'notYours' | 'used' | 'grounded';
interface Shape { cells: [number, number][]; w: number; h: number }      // normalised to (0,0)
interface Place { piece: PieceId; orient: number; at: number }            // at = r*size+c of the shape's (0,0)
type Action = ({ k: 'place' } & Place) | { k: 'done' };
interface Placed extends Place { guild: Guild; n: number }                // n = global placement index
type BEvent = { n: number } & (
  | { k: 'start'; seats: Record<Guild, string | 'shared'> } | { k: 'place'; p: string; guild: Guild; piece: PieceId; orient: number; at: number; points: number }
  | { k: 'stuck'; guild: Guild } | { k: 'done'; p: string } | { k: 'resign'; p: string } | { k: 'dismiss'; p: string; by: string }
  | { k: 'turn'; guild: Guild; actor: string } | { k: 'end'; scores: Record<string, number> });
interface BState { board: Board; size: 14 | 20; cells: number[] /* -1 or index into placed */; placed: Placed[];
  guilds: Guild[]; seats: Record<Guild, string | 'shared'>; order: string[]; sharedTurns: number;
  shelf: Record<Guild, PieceId[]>; grounded: Guild[]; out: string[]; current: Guild; actor: string;
  hints: boolean; bots: boolean[]; log: BEvent[]; logTotal: number; result: null | { ranking: string[]; scores: Record<string, number>; winners: string[] } }
```

---

## Milestone 1: Rules and tests (Sonnet subagent A, effort high, TDD)
**Read first:** the brief below only. **Commit:** `Blocky: rules engine and tests`. **Gate:** `npx vitest run packages/shared/test/blocky` is green, and main checks the report.

### Task 1.1: Pieces and orientations
- [x] Files: create `packages/shared/src/blocky/pieces.ts` (`PIECES: Record<PieceId, Shape>`, `PIECE_IDS`, `orientations(id): Shape[]`, `ALL_ORIENTS`, `squaresOf(id)`). Create `tuning.ts` (`SIZES`, `DUO_STARTS = { tide: [4,4], ember: [9,9] }`, `BONUS_ALL = 15`, `BONUS_MONO = 20`, `LOG_KEEP = 120`).
- [x] Tests in `packages/shared/test/blocky.pieces.test.ts`: `21 pieces, 89 squares`, `91 fixed orientations`, `orientations are distinct and normalised`, `X has 1, I5 has 2, F has 8`.
- [x] Acceptance: `npx vitest run packages/shared/test/blocky.pieces.test.ts`.

### Task 1.2: Placement, legal moves, speed
- [x] Files: `rules.ts`: `canPlace(s, guild, p: Place): Reason | null`, `anchors(s, guild): number[]` (live = some remaining piece fits, R22, plus `rawAnchors`), `fits(s, guild, piece): Place[]`, `legalMoves(s, guild): Place[]` (corner-anchored, deduped), `hasMove(s, guild): boolean` (early exit).
- [x] Tests in `blocky.rules.test.ts`:
  - `first move must cover start square` (Classic corners clockwise from top-left; Duo (4,4)/(9,9))
  - `reason codes`: one case per code
  - `fits and anchors agree with legalMoves`
  - `legalMoves equals brute force on 200 random positions` (`test/blockySim.ts` builds the positions)
  - `edge contact with other guilds is legal`
- [x] Test in `blocky.perf.test.ts`: `legalMoves median of 30 < 15ms on mid-game Classic`. It logs the median, which must be < 5 ms.

### Task 1.3: Game flow, scoring, boardgame.io wrapper
- [x] Files:
  - `rules.ts`: `newGame(numPlayers, rand, data)`, `seatOf(s, guild)`, `act(s, playerID, a): string | undefined`, `resign`, `dismiss`, `score(s): Record<Guild, number>`, `playerScores(s)`, `advance(s)` (auto-pass with `stuck`, R2 rotation).
  - `view.ts`: `viewFor(s, playerID)`, which returns `s` as `BView` (R21).
  - `game.ts`: `BlockyGame`, `BLOCKY_GAME_NAME = 'blocky'`, `validateBlockySetupData` (`{ board, hints, bots, avatars? }`; `duo` only with 2 players, R18).
  - `index.ts`: barrel.
- [x] Tests in `blocky.game.test.ts`:
  - `start event names every guild's seat`
  - `4p seeded seat shuffle`
  - `2p classic: one seat holds tide+ember or sun+grove, scores summed`
  - `3p: grove shared, rotation order[k%3], unscored`
  - `shared rotation skips resigned seat`
  - `grounded seat still plays shared turns`
  - `done grounds own guilds only`
  - `auto-pass only when no move`
  - `+15 all pieces, +20 when last is I1`
  - `ends when every guild stuck or finished`
  - `2p resign ends game`
  - `resigned rank last`
  - `dismiss host-only after handover to lowest human seat`
  - `ties share the win`
  - `log capped at LOG_KEEP, logTotal monotonic`
  - `illegal place returns reason, state unchanged`
- [x] Test in `blocky.local.test.ts`: `Local() two clients stay in sync incl. reconnect`, using a fresh `{ ...BlockyGame }` per match.
- [x] Acceptance: `npx vitest run packages/shared/test/blocky`.

## Milestone 2: Bots and fuzz (the same subagent A)
**Commit:** `Blocky: bots, strength and fuzz`. **Gate:** all four files green; the report lists the median ms for legalMoves and Hard, the win rates, and the fuzz time.

### Task 2.1: Bots
- [x] File `bot.ts`: `chooseBlockyAction(view: BView, me: string, level: BBotLevel, rng): Action` (always legal; falls back to `done` only when `!hasMove`), `suggestMove(view, me): Place | null` (Medium from your seat), `evaluate(view, guild, p): number`. Levels as in brief §10 M2. Weights go in `tuning.ts` `BOT`.
- [x] Tests in `blocky.bot.test.ts`: `always legal over 50 games`, `decides only from own view` (deep-frozen view), `hard < 300ms median`, `hard keeps I1 for last when possible`.
- [x] Test in `blocky.strength.test.ts` (timeout 300 s): 100 seeded Duo games per pairing, seats alternate, a tie counts half. Hard beats Medium in at least 60% of games, and Medium beats Easy in at least 70%.

### Task 2.2: Fuzz and timing
- [x] File `timing.ts`: `BT` (blocking ms per event at full speed, R3: place ≤ 1100, stuck 600, turn 500, start 1800, end 0), `eventMs(e: BEvent): number`.
- [x] Test in `fuzz.blocky.test.ts` (timeout 180 s): 500 games over Duo and 2/3/4-player Classic, with Easy/Medium bots and 2% random done/resign/dismiss. Every game ends; after every action `cells` is consistent with `placed` and `canPlace` held; final `score` equals a recount. The test logs the total time.

### Subagent brief (paste as-is; `model: "sonnet"`, `effort: "high"`)
```
You build the pure-TS rules engine for "Blocky", a corner-touching polyomino territory game, in the monorepo at
/Users/tai/Developer/Ticket to Boboland. Use superpowers:test-driven-development: write each test first and watch it fail.
Read ONLY: docs/blocky/PROMPT.md §3 and §10 (M1-M2); docs/blocky/REVIEW.md items 2, 3, 5, 10, 14, 17, 18, 21, 22;
docs/blocky/PLAN.md Milestones 1-2 and "Shared types" (use those names and signatures exactly);
packages/shared/src/kingdom/game.ts and packages/shared/src/kingdom/rules.ts lines 1-160 (the pattern: act returns an
error string, log push with logTotal + LOG_KEEP splice, dismiss/host handover); packages/shared/test/kingdomSim.ts.
Write: packages/shared/src/blocky/{pieces,tuning,rules,view,game,bot,timing,index}.ts and
packages/shared/test/{blocky.pieces,blocky.rules,blocky.perf,blocky.game,blocky.local,blocky.bot,blocky.strength}.test.ts,
fuzz.blocky.test.ts, blockySim.ts. Add one line to packages/shared/src/index.ts:
`export { BlockyGame, BLOCKY_GAME_NAME } from './blocky/game'; // Blocky`. Touch nothing else.
Never write the trademarked name of the original game. Themed piece names go in pieces.ts as PIECE_NAME (X Crossroads,
I5 Causeway, U Harbour, T5 Watchtower, O4 Plaza, I1 Keystone; choose the other 15 in the same builder spirit).
Run only: npx vitest run packages/shared/test/blocky packages/shared/test/fuzz.blocky.test.ts, and npx tsc -p packages/shared --noEmit.
Commit twice on feat/blocky ("Blocky: rules engine and tests", "Blocky: bots, strength and fuzz"). Do not push.
Return under 25 lines: files written, test counts, medians (legalMoves, Hard), strength win rates, fuzz seconds,
every exported signature that differs from PLAN.md "Shared types", and any rule decision you made (one line each).
```

## Milestone 3: Playable online, plain (main)
**Read first:** `packages/client/src/kingdom/{KingdomApp.tsx,Lan.tsx,lobby.ts,Local.tsx,setup.ts}`, `packages/server/src/kingdomBots.ts`, `packages/server/src/serve.ts`. **Commit:** `Blocky: playable online (plain)`. **Gate:** one bot game played to the end in the browser (`npm run dev`), and `npx vitest run packages/client/src/lib/partyRules.test.ts` green.

### Task 3.1: Registration and shared files (R13)
- [x] `packages/server/src/serve.ts`: import, the `SEED` line, add to `games`, `installBlockyBots(server, { port: PORT })`.
- [x] `packages/client/src/App.tsx`: `case 'blocky': return <BlockyApp />`.
- [x] `packages/client/src/lib/partyRules.ts`: `hasBlockySeat?`, the `blocky()` follower (copy of `kingdom()`), `case 'blocky'`, the `ttr` exclusion. Test: `partyRules.test.ts` `blocky: members take free seats, rest watch`.
- [x] `packages/client/src/lib/party.ts`: the savedSeat import, the edition exclusion, `hasBlockySeat`.
- [x] `packages/client/src/lib/music.ts`: `/blocky` in the silent check and in `onPicker`.
### Task 3.2: Server bots
- [x] Create `packages/server/src/blockyBots.ts` (a copy of `kingdomBots.ts`: `/api/blocky/bots/add|remove`; compares `v.actor`; waits for `eventMs` blocking lengths plus a turn lead; `TTB_BOT_DELAY`). `BLOCKY_BOT_NAMES` = Easy Apprentice, Medium Mason, Hard Architect.
### Task 3.3: Client plumbing, plain UI
- [x] Create in `packages/client/src/blocky/`:
  - `BlockyApp.tsx`: router; mounts `BlockyArtDefs` (a stub until M4).
  - `lobby.ts`: the kingdom copy, with `avatar` in place of `hero`.
  - `Lan.tsx`: `BlyHost`, `BlyJoin`, `BlyWait` (Guild Hall, neutral seat pennants, R5), `BlyPlay`, `BlyWatch`, and a private `useMatch` (real `numPlayers`).
  - `setup.ts`: `LocalCfg { seats: { kind, name, avatar }[]; board; hints }`, `encodeCfg`, `readCfg`.
  - `Local.tsx`: a setup page, then a Local() match with a fresh `{ ...BlockyGame }`; computer seats act from their own view.
  - `Screen.tsx`: the plain board and shelf; click a piece, click a cell; R and F keys; sends `act`.
  - `text.ts`: reason lines, narration, guild names.
- [x] Test `packages/client/src/blocky/setup.test.ts`: `readCfg rejects bad seats, duo needs 2`.

## Milestone 4: Art direction, the mock-up, art (main)
**Read first:** none beyond ART.md. Load frontend-design once. **Commits:** `Blocky: art bible and mock-up (Gate A0 …)`, then `Blocky: art set and gallery (Gate A …)`. **Gates:** A0 (≤3 rounds), A (≤2).
- [x] 4.1 Write `docs/blocky/ART.md` (§6.1 plus the R4 render recipe plus the R19 counts).
- [x] 4.2 Build `blocky/Mock.tsx` + `blocky/mock.css` at `/blocky/mock`. It's static but uses the real `art/Defs.tsx` symbols as they are written. Every §6.2 line and every §7.1 cue, R5's "You" tag and R16's mini-shelves are in it. Screenshots go to `docs/blocky/gates/A0/` at 1180x820 and 1920x1080. Run the gate.
- [x] 4.3 Write the art components in `blocky/art/`:
  - `Defs.tsx`: `BlockyArtDefs`, with the 91 orientation symbols, neutral gradients, 4 alpha patterns and the joint stud.
  - `blocks.tsx`: `PieceArt({ guild, piece, orient, x, y, stage })`, `Details`.
  - `plateau.tsx`, `sky.tsx` (`Sky({ progress })`, R15).
  - `crests.tsx`, `avatars.tsx` (6 avatars, each with `blink` and `thinking`), `icons.tsx` (10 icons).
  - `materials.css`: stone, plank, brass, pennant and cloud, each with 4 states.
- [x] 4.4 Build `blocky/Gallery.tsx` at `/blocky/gallery` (the Gate A list in §9). Screenshot it into `docs/blocky/gates/A/`. Run the gate.

## Milestone 5: Board, shelf, HUD, clarity (main)
**Read first:** `docs/blocky/ART.md`, the A0 screenshots. **Commit:** `Blocky: board, input and clarity (Gate B …)`. **Gate:** B, at every §2 size × `?screen=mid` and `?screen=duo`.
- [x] 5.1 Layout. `Screen.tsx` (rewritten), `Board.tsx` (one SVG: sockets, sigils, a `<g>` of placed `<use>`, an anchors layer, invisible `rect[data-cell]`), `Shelf.tsx` (the plank; active guild full size, the idle 2-player-Classic guild lowered), `Hud.tsx` (banners with a mini-shelf, placed count / official score, rank, "You", "Grounded", danger; the status line; the log), `board.css`. The board fits unscrolled at all 7 sizes.
- [x] 5.2 Input. `input.ts` has pure helpers: `cellAt(pt, rect, size)`, `ghostCell(finger, pointerType)` (touch adds a 1.5-cell lift), `snap(s, guild, piece, orient, ghostAt): Place | null` (within ½ cell), `fitCycle(s, guild, piece, anchor): Place[]`, `tapAnchor(...)` (R8). `useDrag.ts`: pointer capture, rAF transform, `pointercancel`, `window.__blyFrames`.
  - Tests in `blocky/input.test.ts`: `touch ghost sits above finger`, `snap picks nearest legal within half cell`, `fitCycle only fitting orients`, `tapAnchor prefers current orient`.
- [x] 5.3 Pending, confirm, keyboard, Suggest.
  - `usePending.ts` has the R8 rules: the confirm choice follows the drop's `pointerType`; it's re-validated on every display change.
  - The keyboard map goes in `keys.ts`.
  - Suggest calls `suggestMove` and always ends in a pending ghost.
  - Tests in `blocky/pending.test.ts`: `pending revalidated on event`, `jump clears pending`, `mouse drop commits when confirm off`, `suggest always pending`.
- [x] 5.4 Clarity cues: the status line copy for every state (`text.ts` `statusLine(view, me, ui)`), reason lines, anchors (live, R22), fit glows, "No room" tags, the last-piece outline plus newest ring, tapping a log line to flash its piece, clean view (V or the eye key), inspect (hover or long-press 450 ms), "Last builder standing". Test in `blocky/text.test.ts`: `statusLine covers every state` (snapshot of 12 states, including shared and 2-player Classic).
- [x] 5.5 `fixtures.ts`: `fixture(name: 'mid'|'duo'|'grounded'|'last'|'end', as?: string): BView`, built with the shared rules and seeded bots. `Scenes.tsx` with `?screen=` renders the full Screen.

## Milestone 6: Animation layer (main)
**Read first:** `packages/client/src/kingdom/{fx.ts,fxQueue.ts,useKingdomFx.ts}`. **Commits:** `Blocky: animation layer (Gate C …)`, `Blocky: clarity pass (Gate E …)`. **Gates:** C (≤2 rounds), then E (≤3).
- [x] 6.1 `fx.ts`: `bly.fx`, reduced motion = Fast, `ms()`, `evMs()`, `botMs()` (`bly.botMs`), and the `BEAT` table (per animation: beats, ms, easing, particle counts; R19). `fxQueue.ts`: `applyEvent(d, e)`, `newEvents(view, seen)`. `useBlockyFx.ts`: the kingdom copy, plus a residue list that doesn't block. Test in `blocky/fxQueue.test.ts`: `events replay in order`, `newEvents returns null on gap`, `residue does not extend busy`.
- [x] 6.2 `BoardFx.tsx`: the drop (staggered fall, squash), dust, socket ripple, joint flash, +N, the 4 guild flourishes, opponent travel from the banner, the stuck cloud and stamp, the flag on first piece, the 5-square flourish, last-piece confetti, the sprite builder. `Moments.tsx`: the guild reveal (R5), the turn ribbon (R3 rule), "your turn" (chime hook, shelf rise, anchor pulse), the growth pop. `fx.css`. Ambient effects are paused on `document.hidden`.
- [x] 6.3 `Scenes.tsx`: `?play=<anim>&scrub=<0..1>` (R11) and one button per animation. Shoot the filmstrips into `docs/blocky/gates/C/` and log the drag p95 from `__blyFrames`.
- [x] 6.4 Bot pacing: local `botMs` and the server `blockyBots.ts` both use `eventMs`. Check a 4-bot Classic game in the browser takes under 4 minutes at Full.
- [x] 6.5 Gate E: the 8 shots from `?screen=` fixtures plus scripted pointer, at 1180x820.

## Milestone 7: Menu and polish (main)
**Read first:** `packages/client/src/kingdom/{Menu.tsx,PickerCard.tsx,Coach.tsx}` (skim). `packages/client/src/screens/EditionPicker.tsx` lines 1-15 and 70-85. **Commit:** `Blocky: menu, screens and polish (Gate F …)`. **Gate:** F (R1, ≤2 rounds).
- [x] 7.1 `PickerCard.tsx` + `picker.css`, plus one line in `EditionPicker.tsx` (`blocky-card`, `follower` prop).
- [x] 7.2 `Menu.tsx` + `menu.css`: the falling-block title and the 6 options; Settings holds fx, music, sound, Show open corners, Confirm placements and Clean view.
- [x] 7.3 `Curtain.tsx` (the cloud bank). Test in `blocky/curtain.test.ts`: `curtain only between different humans`. Also `Coach.tsx` (`bly.coach`, 3 marks), `HowTo.tsx` (4 pages, looping demos).
- [x] 7.4 `Result.tsx`: night isles, the leftover tally, the +15/+20 bursts, the podium and fireworks; rematch through `nextRoom`.
- [x] 7.5 Guild Hall and setup page restyled in materials (`room.css`), the time-of-day cycle wired to `Sky`, cloud emote bubbles from banners, guild sprites.
- [x] 7.6 Gate F screenshots into `docs/blocky/gates/F/`.

## Milestone 8: Audio (Sonnet subagent B, effort medium)
**Commit:** `Blocky: sound and music`. **Gate:** the tests below are green, and main listens once on `/blocky/scenes`.
- [x] 8.1 `packages/client/src/blocky/sound.ts`: `sfx(name: BSfx, opts?)`, `land(guild, size)`, `ambience(progress)`, `setSfxVolume`. `packages/client/src/lib/songBlocky.ts` + `songBlocky.test.ts` (offline render levelled). `packages/client/src/blocky/music.ts` (its own AudioContext, the copy of `kingdom/music.ts`).
- [x] 8.2 Main wires `sfx` into the `useBlockyFx` `onEvent` and the UI hooks.

### Subagent brief (`model: "sonnet"`, `effort: "medium"`)
```
Write the audio for "Blocky" (a bright sky-island toy-block game) in /Users/tai/Developer/Ticket to Boboland.
Read ONLY: docs/blocky/PROMPT.md §8; packages/client/src/kingdom/sound.ts and packages/client/src/kingdom/music.ts
(copy their structure and volume/settings API, storage keys bly.sfx / bly.music); packages/client/src/lib/songKingdom.ts
and songKingdom.test.ts (the song format and the offline-render level test using lib/offlineAudio.testutil.ts).
Write: packages/client/src/blocky/sound.ts exporting
  type BSfx = 'pick'|'rotate'|'flip'|'snap'|'corner'|'invalid'|'stuck'|'turn'|'tally'|'bonus'|'win';
  sfx(name: BSfx, opts?: { pitch?: number }): void; land(guild: 'tide'|'sun'|'ember'|'grove', size: number): void
  (per-block clacks pitched up per block, plus the guild layer: splash / chime / crackle / rustle);
  ambience(progress: number): void (wind, birds, waterfall; crickets past 0.75); stopAmbience(): void;
  setSfxVolume(v: number): void; and an unlock-on-first-gesture like kingdom.
packages/client/src/lib/songBlocky.ts (breezy, bouncy: kalimba, marimba, soft pads, light hand percussion, about 90 s loop)
+ songBlocky.test.ts (same level bounds as songKingdom.test.ts); packages/client/src/blocky/music.ts (own AudioContext).
No new dependencies, no files elsewhere. Synthesis only (oscillators, noise buffers, filters, envelopes).
Run: npx vitest run packages/client/src/lib/songBlocky.test.ts && npx tsc -p packages/client --noEmit.
Commit "Blocky: sound and music" on feat/blocky; do not push. Return under 15 lines: the exports, the measured levels, anything stubbed.
```

## Milestone 9: E2E (Sonnet subagent C, effort medium)
**Commit:** `Blocky: e2e`, then `Blocky: full online game (Gate D …)`. **Gate:** `npm run build && npx playwright test e2e/blocky.spec.ts` green twice in a row; then Gate D.
- [x] 9.1 Write `e2e/blocky.spec.ts` (the brief below).
- [x] 9.2 Gate D (main): host + joiner + 2 server bots, Classic, to the end; one window at 1180x820; reconnect; scores; rematch. Screenshots go to `docs/blocky/gates/D/`.

### Subagent brief (`model: "sonnet"`, `effort: "medium"`)
```
Write e2e/blocky.spec.ts for "Blocky" in /Users/tai/Developer/Ticket to Boboland. The client is built already.
Read ONLY: e2e/kingdom.spec.ts (copy its structure, helpers use, the localStorage presets and its "tolerate the turn
passing between check and click" pattern), e2e/helpers.ts, playwright.config.ts, docs/blocky/PROMPT.md §10 M9,
and the selector list below.
Selectors (data-testid unless noted):
  blocky-card · bly-menu-host / -join / -bot / -local · bly-setup-start · bly-seat-<i>-kind ·
  bly-board-<classic|duo> · rect[data-cell="r,c"] · bly-piece-<ID> · bly-suggest · bly-confirm · bly-cancel ·
  bly-reason · bly-status · bly-result · bly-rematch · bly-invite-url · bly-addbot-<level> · bly-start ·
  bly-banner-<guild> (attr data-score) · bly-turn (attr data-actor) · bly-hints.
Every test: addInitScript sets bly.fx='off', bly.coach='done', bly.botMs='30'; test.setTimeout(180_000).
A human turn = wait for bly-status to contain "Your turn", click bly-suggest, click bly-confirm; tolerate the turn having
passed, and stop when bly-result is visible or the status says "grounded".
Tests: (1) / picker → blocky-card → menu; (2) local pass-and-play: pick I5, drop it off its start corner, expect
bly-reason "start" text and no move sent, then a legal turn; (3) vs computer on Duo to the result; scores in
bly-result equal the banner data-score; (4) 2 windows online: with 2 seated, host switches Board to Classic and toggles Hints,
the joiner sees both settings live, start, play 3 turns each; (5) spectator /blocky/watch/:id sees placements; (6) reload mid-game
returns to the same seat and the game continues.
If a selector is missing, report it; do not edit client code. Run: npx playwright test e2e/blocky.spec.ts (twice).
Commit "Blocky: e2e" on feat/blocky; do not push. Return under 15 lines: pass/fail per test, run times, missing selectors, flakes.
```
- [x] Main adds every listed `data-testid` in M5/M7 (check this before dispatching C).

## Milestone 10: Wrap-up (main)
**Read first:** CLAUDE.md's Runeshift section. **Commit:** `Blocky: CLAUDE.md and wrap-up`; then merge. **Gate:** superpowers:verification-before-completion.
- [x] 10.1 Add a CLAUDE.md section "Blocky" after Runeshift, in the same style: files, hidden-info note, tests and commands.
- [x] 10.2 Check that `/` → `blocky-card` → `/blocky` works, and that party follow works for host → Guild Hall → game (`npx playwright test e2e/party.spec.ts`).
- [x] 10.3 Run `npm run typecheck && npm test && npm run e2e`; all green.
- [x] 10.4 Push `feat/blocky`. Merge `--no-ff` into `main` and push `main`. Write the 5-line summary, including what was cut (§10 cut order) and unrelated issues.

---

## Gate reviewer prompt template (fresh subagent per round; `model: "sonnet"`, `effort: "high"`, except Gates A0 and E: `model: "opus"`, `effort: "medium"`)
```
You are a harsh art director and UX reviewer for "Blocky" ("Sky Isles": chunky clay/vinyl toy blocks on a floating
stone plateau above the clouds). A reasonable-looking result is a FAIL if it misses a detail-bar line. You have no stake
in this work. Read ONLY these files: docs/blocky/PROMPT.md §6.2 and §7.1, docs/blocky/ART.md, and the screenshots:
<PATHS>. Reference mock (from Gate B on): <A0 PATHS>. Gate: <GATE NAME>. Checklist:
<CHECKLIST: paste the gate's lines from PROMPT.md §9, plus the gate-specific items below>
For Gate E: answer from EACH screenshot alone: whose turn and which guild, what to do next, where I can play, why not
(if shown), what just happened, who is winning. Any wrong or unsure answer is a FAIL for that shot.
For Gate C: judge each filmstrip for all five beats (anticipation, action, impact, settle, residue), easing, and
layout jumps; read the BEAT table in packages/client/src/blocky/fx.ts.
Return, under 40 lines: a PASS/FAIL per checklist item (one line each, with the screenshot it is judged from);
then at least 5 ranked defects (even on PASS), each with the file/area to change and the concrete fix;
then "could this be any other game?" in one line. Overall verdict: PASS only if every item passes.
```
Main records the final verdict line in the gate commit's body, and commits only the final-round screenshots (R23).
