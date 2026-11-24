# Fleet: build plan

Single source of truth for resuming. Do the first unchecked item, tick it when it is done, and keep going in order. Design and working rules: `docs/fleet/SPEC.md` (read the Decisions section too). Template: Frontline (`packages/shared/src/frontline/`, `packages/client/src/frontline/`, `packages/shared/test/frontline*.test.ts`, `e2e/frontline.spec.ts`).

After every milestone: run the full suite (`npm test`) and `npm run typecheck`, tick the milestone box, commit (conventional message), `git push origin main`.

## Task 0: setup

- [x] Write `docs/fleet/SPEC.md` (whole design, working rules, decisions)
- [x] Write `docs/fleet/PLAN.md` (this file)
- [x] Auto-resume job: `~/.fleet-build/resume.sh` + `~/Library/LaunchAgents/com.ttb.fleet-resume.plist`, bootstrapped and verified (headless `claude -p "reply OK"` and git auth from a launchd context, `launchctl print`, `pmset -g assertions`)
- [x] Commit and push Task 0

## Milestone 1: rules engine (`packages/shared/src/fleet/`)

- [x] `board.ts`: 10x10 geometry, square index <-> {x,y}, labels (A-J / 1-10), in-bounds, neighbours
- [x] `ships.ts`: ship classes table (Dreadnought 5, Cruiser 4, Frigate 3, Submarine 3, Corvette 2, Cutter 3), ship squares from anchor + orientation, placement validation (on board, no overlap, Decoy not on a ship, Cutter only with Reinforcement), random placement (seeded rng)
- [x] `weapons.ts`: the one tuning table (id, name, kind active/passive, pattern, charge turns, unlock rule, once-per-round), pattern squares for an anchor (clipped), anchor validity
- [x] `rules.ts`: resolve a shell / salvo / weapon against a fleet (hit, miss, deflected, sunk, decoy hit), Shield, Supernova, Torpedo run, Sea Mine place/drift/explode, Smoke Screen masking (Smoke Screen removed 2026-11-23), charge tick/reset, win check
- [x] `game.ts`: `FleetGame` (name `fleet`), setupData `{ mode, bestOf }` validated; phases placement (`deploy`/`undeploy`, redact) → battle (`fire`, `fireSalvo`, `useWeapon`) → roundEnd (`nextRound`) → gameover; `resign`; all moves `client: false`; seeded randomness only
- [x] `view.ts`: `viewFor(G, playerID)` is the only filter (no enemy ships/decoy/mine/loadout, smoke shows "?", spectators see neither fleet, everything after gameover)
- [x] `bot.ts`: `botDeploy` + `chooseBotMove(view, level, rng)` from the bot's own view; Easy random, Medium hunt/target with parity, Hard probability density + loadout + weapon use
- [x] Export from `packages/shared/src/index.ts`
- [x] Tests: `packages/shared/test/fleet.rules.test.ts`, `fleet.game.test.ts`, `fleet.view.test.ts`, `fleet.game.test.ts` (Local() no-leak incl. reconnect), `fleet.bot.test.ts`, `fuzz.fleet.test.ts` (500 games per mode, bots at every difficulty, zero soft-locks)
- [x] Milestone 1 done: full suite + typecheck green, commit, push

## Milestone 2: server, lobby, party

- [x] Register `FleetGame` next to `FrontlineGame` in `packages/server/src/serve.ts` (SEED support as Frontline)
- [x] Client lobby helpers `packages/client/src/fleet/lobby.ts` (create 2-seat `fleet` match with setupData, join, playAgain rematch) copied from Frontline's
- [x] Routes in `FleetApp.tsx` (+ `App.tsx` case `fleet`): `/fleet`, `/fleet/host?mode=&bestOf=`, `/fleet/play/:id`, `/fleet/join/:id`, `/fleet/watch/:id` (`/fleet/bot` and `/fleet/local` are added in Milestone 3; `FleetScreen.tsx` is a stand-in until Milestones 4-5)
- [x] Party: `lib/partyRules.ts` handles `/fleet` like `/frontline` (first member takes seat 1, the rest watch); tests in `partyRules.test.ts`
- [x] Milestone 2 done: full suite + typecheck green, commit, push

## Milestone 3: picker card and menu

- [x] `fleet-card` on the `/` picker next to the Frontline card, original art (CIC console look)
- [x] `/fleet` menu: step 1 play type (Pass-and-play / vs Computer / Online), step 2 mode (Classic / Salvo / Super Weapons), step 3 options (match length; difficulty for vs Computer; "All weapons unlocked" toggle for Super Weapons)
- [x] vs Computer runs in the browser (`/fleet/bot`, like `/frontline/bot`); pass-and-play local (`/fleet/local`)
- [x] Milestone 3 done: full suite + typecheck green, commit, push

## Milestone 4: placement and loadout

- [x] Loadout picker (Super Weapons): 3 slots, locked weapons show their unlock hint, passive weapons flagged
- [x] Placement screen: drag ships, tap to rotate, Redeploy = random, Decoy and Cutter placement when chosen, Confirm only when valid
- [x] Milestone 4 done: full suite + typecheck green, commit, push

## Milestone 5: battle UI

- [x] Ship top-down SVG art (6 classes + Decoy) in `shipArt.tsx` (done in Milestone 4)
- [x] Damage scorch/fire on hit squares of your own ships
- [x] Board: your fleet + target grid (side by side wide, stacked target-first on phones, no horizontal scroll at 375px); distinct shape + colour for hit / miss / deflected / sunk / "?"
- [x] HUD: whose turn, salvo shots left, segmented charge meters, side rail with both fleets' status
- [x] Targeting preview: pattern ghost on hover/tap, second tap fires; salvo marking + Fire
- [x] Pass-and-play curtain (attacker sees result, then curtain), end screen (fleets revealed, stats, rank/XP, new unlocks, Rematch)
- [x] Settings (sound, music, cinematics Full/Fast/Off) and progression wired into the end screen (`progress.ts` + tests already exist from Milestone 4)
- [x] Milestone 5 done: full suite + typecheck green, commit, push

## Milestone 6: sound and music

- [x] `fleet/sound.ts` (`createFleetSfx`, `fleetSound`): fire, whistle, splash, hit, sink, alarm, per-weapon sounds (+ test)
- [x] `lib/songFleet.ts`: tense low-key loop (+ offline-render level test, like `songFrontline`)
- [x] Respect sound/music toggles and prefers-reduced-motion
- [x] Milestone 6 done: full suite + typecheck green, commit, push

## Milestone 7: e2e

- [x] `e2e/fleet.spec.ts`: vs Computer game in Classic, Salvo, Super Weapons
- [x] Pass-and-play game
- [x] 2-window online game
- [x] Milestone 7 done: `npm run build`, `npx playwright test e2e/fleet.spec.ts` green, commit, push

## Milestone 8: cinematics (`packages/client/src/fleet/fx.ts` holds all timing)

- [x] Generic fallback effect + skippable player (tap), Full/Fast/Off, input blocked, both players see it online
- [x] Shell flight
- [x] Miss splash
- [x] Hit: Dreadnought
- [x] Hit: Cruiser
- [x] Hit: Frigate
- [x] Hit: Submarine
- [x] Hit: Corvette
- [x] Hit: Cutter
- [x] Sinking: Dreadnought (deck aircraft slide into the sea)
- [x] Sinking: Cruiser
- [x] Sinking: Frigate
- [x] Sinking: Submarine
- [x] Sinking: Corvette
- [x] Sinking: Cutter
- [x] Salvo volley
- [x] Shield deflection (hex forcefield flash)
- [x] Delivery: Frag Bomb (airburst)
- [x] Delivery: Air Strike (bomber pass)
- [x] Delivery: Chain Gun (helicopter strafe)
- [x] Delivery: Sea Mine (drop and drift)
- [x] Delivery: Torpedo (underwater wake)
- [x] Delivery: Supernova (airdropped device, white flash)
- [x] Delivery: Thunderhead (heavy airburst)
- [x] Delivery: Cherry Bomb (cluster)
- [x] Delivery: Maelstrom (orbital strike)
- [x] Delivery: Smoke Screen (smoke drifting over the grid)
- [x] Win stinger
- [x] Lose stinger
- [x] Milestone 8 done: full suite + typecheck green, commit, push

## Milestone 9: wrap-up

- [x] Fleet section in CLAUDE.md (like Frontline's)
- [x] Full `npm test`, `npm run typecheck`, `npm run e2e` green
- [x] Final commit and push
