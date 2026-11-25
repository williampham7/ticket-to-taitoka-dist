# Runeshift Implementation Plan

> **For agentic workers:** the owner's brief (`PROMPT.md` §1) forbids subagents: execute inline, milestone by milestone. Steps use checkbox (`- [ ]`) syntax. After every milestone: tick it here, commit, push to `feat/kingdom`.

**Goal:** a storybook shifting-maze game (`kingdom`) playable online, by pass and play and vs computer, with the four quality gates passed.

**Architecture:** pure TS rules in `packages/shared/src/kingdom/` wrapped by `KingdomGame` (one `act` move + `resign` + `dismiss`, `ActivePlayers.ALL`, `client: false`), server bots in `packages/server/src/kingdomBots.ts` (copy of Warfront's), client in `packages/client/src/kingdom/` (DOM + inline SVG tilted tray + flat overlay, animations stepped from the public event log).

**Tech Stack:** boardgame.io, React, TypeScript, Vitest, Playwright. No new dependencies.

**Spec:** `docs/kingdom/SPEC.md` (with the brief `docs/kingdom/PROMPT.md`).

## Global Constraints
- Never write the trademarked name of the original game; docs say "the classic shifting-maze board game".
- CSS prefix `kg-`; `.kingdom { isolation: isolate }`; never the class `hidden`; no `.kingdom > *` selectors; storage keys `kg.*`.
- Shared files touched additively with one `// Kingdom` block each: `serve.ts`, `shared/src/index.ts`, `App.tsx`, `EditionPicker.tsx`, `partyRules.ts` (+test), `lib/party.ts`, `lib/music.ts`, `CLAUDE.md`.
- Reduced motion = Fast (not Off). Input locked while animating. All timings in `kingdom/fx.ts` / `shared/src/kingdom/timing.ts`.
- Board fits unscrolled at 1280x720, 1440x900, 1920x1080, 1180x820, 820x1180, 390x844.

## Review Focus
1. A bot's shift and move arriving in one update: the fx queue must play both in order (test: `useKingdomFx` queue logic in `kingdom/fxQueue.test.ts`).
2. Reconnect mid-animation: backlog skipped, display = current view (same test file).
3. Hero standing on the tile pushed out while another hero is mid-line: both end where `applyShift` says (rules test "wrap with two heroes").
4. Treasure pushed out onto the spare while it is someone's target: not collectable, "Where is it?" points at the spare (rules test).
5. The host drops while it is their own turn: next human dismisses them and the turn passes (rules test).

---

### Milestone 1: Rules and tests (TDD)
**Files:** create `shared/src/kingdom/{tiles,tuning,rules,view,game,index}.ts`; tests `shared/test/kingdom.rules.test.ts`, `kingdom.game.test.ts`, helper `kingdomSim.ts`.
**Produces:** `newGame(n, rng, opts)`, `applyShift`, `reachable`, `pathTo`, `legalShifts`, `act`, `resign`, `dismiss`, `hostSeat`, `viewFor`, `KingdomGame`, `KINGDOM_GAME_NAME`, `validateKingdomSetupData`.
- [x] Write the correctness-checklist tests (PROMPT §9) + layout/centre pinwheel + view no-leak + Local() reconnect; see them fail
- [x] Implement; targeted Vitest green
- [x] Commit + push

### Milestone 2: Bots
**Files:** `shared/src/kingdom/bot.ts`; tests `kingdom.bot.test.ts`, `fuzz.kingdom.test.ts`.
**Produces:** `chooseKingdomAction(view, me, level, rng)`, `suggestShift(view, me)`, `KINGDOM_BOT_LEVELS`.
- [x] Fair-view test, always-legal test, strength (200 games: Hard>Medium ≥55%, Medium>Easy ≥60%), fuzz 500 games ≤120 s
- [x] Commit + push

### Milestone 3: Playable online, plain
**Files:** `server/src/kingdomBots.ts`, `serve.ts`, `shared/src/index.ts`, `partyRules.ts`(+test), `lib/party.ts`, `App.tsx`, `client/src/kingdom/{KingdomApp,lobby,setup,Lan,Local,Screen,Board}.tsx`.
- [x] Waiting room, host/join/play/watch, local + bot setup page, functional flat board wired to `act`
- [x] Play one bot game end to end (Playwright script)
- [x] Commit + push

### Milestone 4: Art → Gate A
**Files:** `client/src/kingdom/art/{Defs,tiles,treasures,heroes,cards,scene}.tsx`, `Gallery.tsx`.
- [x] Gallery screenshots, self-critique in commit body, ≤2 fix rounds
- [x] Commit + push

### Milestone 5: Board and HUD → Gate B
**Files:** `project.ts`, `Board.tsx`, `Hud.tsx`, `kingdom.css`, `Scenes.tsx` (`?board=mid`).
- [x] Screenshots at 1440x900, 1180x820, 390x844 tilted + flat; ≤2 fix rounds
- [x] Commit + push

### Milestone 6: Animation layer → Gate C
**Files:** `shared/src/kingdom/timing.ts`, `fx.ts`, `useKingdomFx.ts` (+`fxQueue.ts` test), `Scenes.tsx`, bot pacing in `kingdomBots.ts`.
- [x] Every §7 animation; scene gallery; mid-flight screenshots; ≤2 fix rounds
- [x] Commit + push

### Milestone 7: Menu and polish
- [x] Menu, picker card, curtain, coach marks, How to play, result page, chat bubbles, time-of-day cycle
- [x] Commit + push

### Milestone 8: Audio and music
**Files:** `kingdom/sound.ts`, `kingdom/music.ts`, `lib/songKingdom.ts` (+test), `lib/music.ts` (`/kingdom` silence).
- [x] Offline-render level test green
- [x] Commit + push

### Milestone 9: e2e → Gate D
**Files:** `e2e/kingdom.spec.ts`.
- [x] picker→menu, local turn, bot game to the end (Short), 2-window online with hero picks + settings, spectator, reconnect
- [x] Gate D: host + 2 joiners + Easy bot to the end on Short; no target leaks; reconnect; rematch
- [x] Commit + push

### Milestone 10: Wrap-up
- [x] CLAUDE.md section after Warfront
- [x] `npm run typecheck && npm test && npm run e2e` all green
- [x] PLAN.md fully checked; final commit + push

## Final verification (2026-11-25)
- `npm run typecheck`: clean. `npm test`: 120 files, 915 tests passed.
- `npm run e2e`: kingdom.spec.ts 5/5 in every run. Two full runs had one or two load-sensitive failures in other games' specs (egyptian rule checklist, frontline spotter, warfront online), a different one each run; each passed when rerun alone.
