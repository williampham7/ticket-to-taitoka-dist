# Fleet: design spec

Fleet is a separate 2-player game in this repo (Ticket to Boboland), like Frontline: not an edition and not Taitoka-themed. Use the Frontline code as the structural template (`packages/shared/src/frontline/`, `packages/client/src/frontline/`, its server registration, lobby, party rules and tests). Reuse its patterns rather than inventing new ones.

The design below is DECIDED. Do not run brainstorming Q&A and do not ask the owner questions. Where something is unspecified, pick the sensible option, record it in the "Decisions" section at the end of this file, and keep going.

Progress lives in `docs/fleet/PLAN.md`, which is the single source of truth for resuming.

## Working rules (token efficiency + quality)

- Do not spawn subagents. Work inline.
- Read files selectively (grep, then read ranges). Never re-read a file you just edited.
- TDD for all rules code (superpowers:test-driven-development). While working, run only targeted tests. Run the full suite plus typecheck at each milestone.
- After every milestone: tick its box in docs/fleet/PLAN.md, commit with a conventional message, and push to origin main.
- Never write the trademarked name of the classic grid game (the one whose name starts with "Battle-" and ends with "-ship") anywhere: UI, code, docs, tests or comments. Never use EA's or Hasbro's art or names beyond the weapon names listed below.
- Never use the CSS class name `hidden` for custom CSS (Tailwind conflict).
- Tick PLAN.md boxes as steps finish (not only at milestone end), so an interrupted run resumes at the right step.

## Auto-resume

A launchd job (`~/Library/LaunchAgents/com.ttb.fleet-resume.plist` running `~/.fleet-build/resume.sh`) reruns the claude CLI headless with "Continue building Fleet. Read CLAUDE.md, docs/fleet/SPEC.md and docs/fleet/PLAN.md, then do the next unchecked items in order, following the working rules in SPEC.md. Commit and push after each milestone. Stop when every box is ticked." It wakes at 06:25 and 11:25 local time (the owner's usage window resets), reruns immediately after a long run, retries after 30 minutes (or at the next wake time, if sooner) after a run shorter than 10 minutes, waits while someone else edited the repo in the last 10 minutes, and gives up after 72 hours. It stops by itself once PLAN.md has no `- [ ]` left; `touch ~/.fleet-build/stop` stops it by hand. Log: `~/.fleet-build/resume.log`. Headless runs have no one to ask: follow this spec and record any new decision below.

## Milestones (in order)

1. Rules engine `packages/shared/src/fleet/` (pure TS): board, ships, patterns, weapons, charge, salvo, series, phases, `FleetGame` (game name `fleet`), `view.ts` (the only filter of hidden info), bot. Tests: rules, a Local() no-leak test (including reconnect), and a 500-game fuzz test per mode with bots at every difficulty (zero soft-locks).
2. Server registration next to FrontlineGame in packages/server/src/serve.ts. Lobby flow copied from Frontline (host creates a 2-seat `fleet` match with setupData; the joiner uses `/fleet/join/:id`; rematch via playAgain; spectators via `/fleet/watch/:id`). Party: the first member takes seat 1 and the rest watch, as in Frontline (update partyRules + tests).
3. A card on the `/` picker (EditionPicker, next to the Frontline card): `fleet-card`, with original art matching the theme. Then the `/fleet` menu: step 1 play type (Pass-and-play / vs Computer / Online), step 2 mode (Classic / Salvo / Super Weapons), step 3 options (match length; difficulty for vs Computer; "All weapons unlocked" toggle for Super Weapons). vs Computer runs in the browser like `/frontline/bot`.
4. Placement screen (drag, tap to rotate, Redeploy = random) and the Super Weapons loadout picker (3 slots; locked weapons show their unlock hint).
5. Game board UI, ship top-down art, HUD, targeting preview, pass-and-play curtain, end screen, settings, progression.
6. Sound effects + music (WebAudio, following the existing `lib/sound*.ts` / `lib/song*.ts` pattern).
7. e2e `e2e/fleet.spec.ts`: one game per mode (vs Computer), pass-and-play, and a 2-window online game.
8. Cinematics, built one at a time in this order: shell flight; miss splash; hit on each ship type (6); sinking of each ship type (6); salvo volley; Shield deflection; the delivery of each attacking weapon; win and lose stingers. Every cinematic falls back to a short generic effect until its custom one exists, so the game is always complete.
9. A Fleet section in CLAUDE.md (like Frontline's), then full test, typecheck and e2e runs, then the final commit and push.

## Game design

**Board and fleet.** Two 10x10 grids, A-J / 1-10. Ships are horizontal or vertical, cannot touch-overlap (adjacency allowed), and never move.
- Dreadnought 5: flagship supercarrier with aircraft on deck
- Cruiser 4: guided-missile cruiser with launch cells and radar arrays
- Frigate 3: angular stealth frigate
- Submarine 3: attack submarine
- Corvette 2: fast missile corvette
- Cutter 3: patrol cutter, only via Reinforcement

You win by sinking every enemy ship (the Decoy never counts).

**What a shot reveals.** Hit or miss. A sinking announces the ship class. Hits never say which ship was hit.

**Modes.**
- **Classic:** one shell per turn, alternating.
- **Salvo:** each turn you fire one shell per ship you still have afloat (5, dropping as you lose ships). You mark all targets, press Fire, and the results land and reveal one shot at a time.
- **Super Weapons:** Classic (one action per turn) plus a loadout of 3 weapons picked before placement. The basic shell is always available. Firing a weapon uses your whole turn. Passive weapons (Shield, Decoy, Reinforcement) are set up during placement, take a slot and never use a turn.

**Charge.** Active weapons start uncharged. The counter goes up by 1 at the start of each of your turns and resets after you fire. Speeds: Quick 2, Normal 3, Slow 5, Very slow 7 turns. Passive = Ready.

**Match length.** Single game, best of 3 or best of 5 (rounds within one match; re-place your fleet between rounds).

**Weapons** (pattern; charge; unlock). Patterns are clipped at the board edge and need a valid anchor square.
- Frag Bomb: 5 squares in an X (centre + 4 diagonals); Normal; starts unlocked
- Air Strike: squares 0, 2, 4 of a 5-square line, horizontal or vertical (player rotates); Quick; starts unlocked
- Chain Gun: 5 squares in a vertical line; Slow; starts unlocked
- Shield (passive): each of your ships ignores the first hit it takes. The attacker sees "Deflected" (a ship is there, no damage), and that square can be shot again; starts unlocked
- Sea Mine: place it on an enemy square. At the end of each of your turns it drifts 1 square (orthogonal, random from the server's seeded random, stays on the board). When it is on an unhit ship square it explodes as a hit (cinematic for both players). Neither player sees it after it is placed; one mine per player at a time; Quick; unlock: sink 10 ships
- Decoy (passive): a 1-square fake ship placed during placement. Shooting it shows a hit; it never sinks and never counts. Revealed at game end; unlock: sink 25 ships
- Torpedo: pick a column. It runs from your side of the board and explodes on the first unhit ship square; the squares it passes become misses; Very slow; unlock: sink 45 ships
- Supernova: 1 square. A hit sinks the whole ship (a Shield absorbs it instead); Slow; unlock: sink 100 ships
- Thunderhead: 3x3 block; Slow; unlock: sink 135 ships
- Cherry Bomb: 5 squares in a + shape; Normal; unlock: win without losing a ship
- Reinforcement (passive): adds a Cutter (3) to your fleet, placed during placement; it counts toward the win; unlock: hit all 5 enemy ships with one salvo (in Salvo mode)
- Maelstrom: 13-square diamond (|dx|+|dy| <= 2); Very slow; once per game; unlock: win within 10 of your turns
- Smoke Screen: removed on 2026-11-23 at the owners' request (see "Changes after launch").

Charge and unlocks are tuning knobs; keep them in one table in code.

**Progression.** Per device in localStorage (try/catch everywhere): ships sunk, wins, XP, and rank Cadet → Ensign → Lieutenant → Commander → Captain → Commodore → Admiral. Earned in vs Computer and online games only. Pass-and-play defaults to all weapons unlocked. Bots use any weapon.

**Bots** (decide only from their own playerView; deterministic with a seeded rng):
- Easy: random shots
- Medium: hunt and target (finish a ship once it is found, respecting parity)
- Hard: probability-density targeting, smart loadouts, weapons fired where they pay off

**Hidden information (critical).** As in Frontline: G holds everything. Clients only ever get the playerView: no enemy ship, decoy, mine or loadout positions. Every move is `client: false`. Placement and loadout moves are `redact: true`. All randomness is server-side. Everything is revealed after the game.

**Phases.** placement (both players at once, plus loadout) → battle → roundEnd (series) → gameover.

## Look and feel

- **Theme:** modern tactical naval warfare. You are the admiral of an elite navy, standing at a combat information centre console.
- **Palette:** deep navy-black, cool steel, a cyan tactical-display accent, amber for warnings, red for hits. Monospace accents for coordinates and readouts. A subtle radar sweep and a grid glow.
- **Readability first:** hit, miss, deflected, sunk and "?" each use a distinct shape AND colour (colour-blind safe). Always show whose turn it is, shots left in a salvo, and weapon charge as segmented meters. Both fleets' status sits in a side rail (ships afloat, hits taken).
- **Layout:** your fleet and the target grid side by side on wide screens; stacked, with the target grid first, on phones; no horizontal scroll at 375px. A weapon's pattern previews as a ghost on hover or tap, and a second tap fires.
- **Ships:** original vector SVG art in two views each: top-down for the grid and side-on for the cinematics. Detailed and distinct silhouettes. Damage shows on the grid (scorch and fire at hit squares).
- **Cinematics:** short (about 1.2-2.5 s), punchy and skippable by tap. Setting: Full / Fast / Off. All timing lives in one `fx.ts` (as in Frontline). During a cinematic, input is blocked. Online, both players watch it (the attacker sees the shot go out, the defender sees it come in). No scenes are built from game state. Shell flight → impact → result. Each ship class has its own hit and its own sinking; the Dreadnought's sinking slides its deck aircraft into the sea. Weapon deliveries:
  - Frag Bomb: airburst
  - Air Strike: bomber pass
  - Chain Gun: helicopter strafe
  - Sea Mine: drop and drift
  - Torpedo: underwater wake
  - Supernova: airdropped device with a white flash
  - Thunderhead: heavy airburst
  - Cherry Bomb: cluster
  - Maelstrom: orbital strike
  - Shield: hex forcefield flash
- **Sound:** fire, whistle, splash, hit, sink, alarm, per-weapon sounds, and a tense low-key music loop. Respect the sound and music toggles and prefers-reduced-motion.
- **Pass-and-play:** the attacker watches their result, then the privacy curtain falls (as in Frontline).
- **End screen:** both fleets revealed, stats (accuracy, shots, turns, ships lost), rank and XP gain, newly unlocked weapons, Rematch.

## Decisions (points the design leaves open)

Recorded here so every session applies them the same way. Add new ones at the end.

1. **Coordinates.** Columns are lettered A-J left to right, rows numbered 1-10 top to bottom. In code a square is `{ x, y }` with `x, y` in 0..9, or index `y * 10 + x`. Label = letter + number, e.g. `C7`.
2. **Your side of the target grid** is the bottom edge (row 10). A Torpedo enters at row 10 of the chosen column and runs up toward row 1.
3. **Sinking reveal.** A sinking announces the class to both players and marks that ship's squares as sunk on the attacker's target grid (the outline is shown). Hits before that never say which ship.
4. **Re-targeting.** A square already resolved for the attacker (miss, hit, sunk, or "?") cannot be the target of a basic shell or a salvo shell. A "Deflected" square can be shot again. A pattern weapon skips resolved squares inside its pattern; it is valid when its anchor is on the board and at least one square of the clipped pattern is targetable.
5. **Anchors.** Frag Bomb, Cherry Bomb, Thunderhead and Maelstrom are anchored on their centre. Air Strike and Chain Gun are anchored on the centre of their 5-square line (offsets -2..+2; Air Strike uses -2, 0, +2). Torpedo is anchored on a column; Sea Mine and Supernova on a square.
6. **Shield.** One charge per ship (Cutter included; the Decoy has none). Within one pattern, squares resolve in a fixed reading order (row by row, left to right), so a pattern that lands two squares on one shielded ship deflects the first and damages the second. A Supernova on a shielded, not-yet-deflected ship is deflected (shield spent, no damage). A Torpedo or Sea Mine that meets a shield is deflected and spent.
7. **Decoy.** Counts as an unhit ship square for the Torpedo and the Sea Mine, so it can absorb them. A Supernova on the Decoy shows a hit and sinks nothing. The Decoy square must not overlap a ship.
8. **Sea Mine.** May be placed on any square of the enemy grid. If it lands on an unhit ship square (or the unhit Decoy) it explodes at once. Drift happens at the end of each of the owner's turns, to a random orthogonal neighbour that is on the board (seeded server random); after a drift it checks again. While the owner's mine is live the Sea Mine cannot be fired again; its charge counter still builds and resets when fired. A mine explosion is shown to both players like a shot result (with "?" for the owner while smoked).
9. **Charge counting.** Counter starts at 0 and gains 1 at the start of each of the owner's turns (so on the first turn it is 1). A weapon is ready when counter >= its charge turns. Firing resets it to 0. Charge is per weapon.
10. **Maelstrom "once per game"** means once per round (each round is a game).
11. **Smoke Screen.** Removed (2026-11-23).
12. **Salvo count** = the firer's ships afloat at the start of the turn (Cutter does not exist in Salvo, since Salvo has no loadout). If fewer targetable squares remain, the salvo is that many. Results are resolved in the order marked and revealed one at a time.
13. **Series.** Best of 3 = first to 2 round wins; best of 5 = first to 3. Round 1's first player is chosen by the server's seeded random; each later round is opened by the loser of the round before. Loadouts are picked again each round, together with placement.
14. **Placement move.** One `deploy` move per player per round carries ships, loadout, Decoy square and Cutter (if any); it is `redact: true` and `client: false`. A player may `undeploy` (also redacted) until both are ready. Battle starts when both have deployed.
15. **Leaving.** As in Frontline: leaving during placement or battle resigns the whole match (`resign` move).
16. **Progression numbers.** XP: +2 per hit, +15 per enemy ship sunk, +40 per round won, +100 per match won, +25 bonus for beating Hard. Ranks at XP 0 Cadet, 250 Ensign, 750 Lieutenant, 2000 Commander, 4500 Captain, 9000 Commodore, 18000 Admiral. Unlock counters are lifetime totals from vs Computer and online games. Unlocks apply to the "you" side only; online, each client checks its own unlocks when it submits a loadout (the server accepts any weapon, since bots and pass-and-play may use all).
17. **Turn limit.** None for Fleet (no timer).
18. **Sea Mine drift timing.** No drift at the end of the turn it is dropped; it drifts at the end of every later turn of its owner.
19. **Enemy fleet list is public once the battle starts** (classes only, never positions), so a Cutter from Reinforcement is known to exist; the Decoy and the loadout stay hidden. Weapons show themselves when fired, the Shield when it deflects.
20. **Stats are hidden until the round ends**; the HUD derives hits from the grid.
21. **Torpedo passes** mark open water as misses but do not count as shots for accuracy.
22. **Moves.** `deploy(d)`, `undeploy()` (redacted), `fire(sq)`, `salvo(sqs)`, `weapon(id, sq, dir?)`, `dropMine(sq)` (redacted, so the drop square never reaches the defender's log), `nextRound()`, `resign()`. `moveFor(action)` maps a `FleetAction` to its move.
23. **CSS prefix.** Fleet's classes start with `fleet-` (Frontline already uses `flt-` for its tiles). Styles live in `packages/client/src/fleet/fleet.css` (+ further `fleet/*.css`), scoped under `.fleet`.
24. **"All weapons unlocked"** travels in the play address (`all=1`) for pass-and-play and vs Computer; pass-and-play turns it on by default. Online games use this device's unlocks (the toggle is also passed through `/fleet/host`).
25. **Menu addresses.** `/fleet/local|bot|host?mode=&bestOf=[&level=][&all=1]` (`fleet/setup.ts` `playPath` / `readPlay`). The menu remembers the last choice (`fleet.menu`).
26. **Reveal.** Results land one square at a time on both screens (`useReveal` + `fx.ts` `REVEAL`/`stepDelay`); a sinking shows as hits until its report finishes; input is blocked while results land; a tap skips. The battle stays up until the round's last report has landed, then the result screen shows.
27. **Aiming.** Mouse hover (or keyboard focus) aims and a click fires; on touch the first tap aims and a second tap on the same square fires. Air Strike turns with the Turn button or R.
28. **Settings.** Sound and music use the app's shared `VolumeSlider` / `MusicButton`; Cinematics (Full/Fast/Off) is Fleet's own (`fleet.fx`). Reduced motion turns Full into Fast.
29. **Pass and play.** The attacker watches their result, then the curtain names the next player; their screen then replays what landed on their own fleet since they last looked.
30. **Progression credit** happens on the match result screen, once per device per match (`fleet.credited`), for vs Computer and online only.
31. **Audio.** Sound effects: `packages/client/src/fleet/sound.ts` (follows the shared volume/mute), played from the reveal in `Battle.tsx` (one summary sound per report when cinematics are Off). Music: "Deep Contact", `lib/songFleet.ts`, its own bus in `lib/music.ts` (track `fleet` on `/fleet/...`, like Frontline's).
32. **e2e speed.** `localStorage['fleet.botMs']` makes the in-browser computer answer after that many ms (e2e uses 30), and `fleet.fx = 'off'` makes results land at once.
33. **Cinematics.** Full only (Fast keeps the short generic square effects; Off shows nothing). `fleet/cine/plan.ts` picks the scenes from the report as the viewer received it and their own fleet (attacker: generic hit; defender: their own ship's class; sinkings from the filtered report). `cine/scenes.tsx` draws them side-on in an 800x240 frame with SVG SMIL (delivery, then impact, during the lead-in; a sinking after the squares land); the defender's frame is mirrored so the shot comes in. Lengths are `SCENE_MS` in `fx.ts`. A tap that began while results were landing, or Escape, skips. `/fleet/scenes` is a QA gallery of every scene (pause and seek with `svg.setCurrentTime`).
34. **Stingers.** The match result title plays a win or lose stinger.

## Changes after launch (2026-11-23)

- **Smoke Screen removed** (owners' request). 12 weapons remain. The rules lost everything that only served it: the `?` result, masked squares, hidden sinkings and `clear` reports (`SeenCell` is now `Cell | null`). A stored loadout that still names it is filtered out; a deployment naming it is refused. Hard's smoke loadout became Decoy + Maelstrom + Supernova. Beating the Hard computer still earns its XP bonus.
- **Look revamp.** Every page is a station aboard a warship's combat information centre:
  - Menu = an operations chart table (graticule, depth contours and soundings, islands, the task force with range rings and one slow radar sweep, enemy contacts with heading vectors, a bearing line), the task force on the horizon under a stencilled wordmark, a map key, and the operation orders: Opponent, Rules of engagement, Orders. A status strip carries Zulu time, rank and XP, and the volume and music controls.
  - Rows that do not apply (Computer difficulty, Every weapon unlocked) stay in place, disabled, so the Start button never moves.
  - Armory (weapon choice) = three launch bays with large art, bay numbers and a spec readout for the weapon under the pointer; the catalogue lists strike weapons and defences as rows tagged "Bay n" when loaded.
  - Deployment = the plot plus an order of battle that keeps every ship listed (placed ones read "On station"); Rotate is an icon button; "Random" (dice icon) places everything at random.
  - Battle = two plots of equal size (enemy waters tinted red, yours blue), weapon keys above them, and a hub on the right: status (turn lamp), both fleets as side-on silhouettes with damage and a strength bar, an accuracy gauge with readouts, and a contact log of this round's results already shown. Notes such as "You have already shot there" appear in a fixed slot in the enemy plot's header, so nothing moves.
- **Blast doors** close and open between stations (Start game, Place fleet, Ready) with a plate naming the next station. They are skipped when cinematics are Off or with reduced motion, so e2e (fx Off) is unaffected.
