# Review of PROMPT.md (Blocky)

Independent review, 2026-11-25. Ranked. **All 23 fixes are now applied to PROMPT.md**; this file is kept for the record. PLAN.md assumes them.

## Blockers

1. **No visual gate covers half the screens (the Runeshift failure, again).** Menu, Guild Hall, setup page, cloud curtain, How to play, result, coach marks and the picker card on `/` are built in M3 ("plain") and M7 with no reviewer. The Guild Hall and setup page are never even listed for polish.
   *Fix:* in §10 M7 add "the Guild Hall and the setup page, restyled to the mock's materials". In §9 add:
   > **Gate F: screens** (1180x820 and 1920x1080): `/` with the picker card in place, `/blocky` menu (mid-build and settled), Guild Hall with 2 humans + 1 bot, setup page, curtain, How to play page 2, result (mid-tally and final), a coach mark. Check: every surface is a 6.1 material, type scale, custom icons, no generic UI, matches the mock's art. Up to 2 rounds.
   And add "F" to §11's gate list.

2. **`G.current` is ambiguous: guild or seat.** 2-player Classic and the 3-player shared guild break any client or bot that compares `current` with `playerID` (Runeshift's bots and screens do exactly that).
   *Fix (§3 Engine):* "`G.current` is the guild to place; `G.actor` is the seat that must act. `seatOf(G, guild)` is the one source. The shared guild's k-th turn (k = 0, 1, …) is played by `G.order[k % 3]`, skipping seats that resigned or were dismissed. A seat whose own guilds are all grounded still plays its shared turns. `done` grounds only the seat's own guilds, never the shared one. Clients, bots and the status line compare `actor`, never `current`."

3. **The animation budget will make games crawl.** Five beats, a flourish, a sprite and a cloud ribbon on every placement, with input locked and bots waiting for it: about 3.5 s × 84 placements in a 4-player game.
   *Fix (§7.3):* "Each event has a **blocking** length (the queue waits for it) and a **residue** that overlaps whatever comes next. At full speed, a place event blocks for at most 1100 ms, stuck for 600 ms and turn for 500 ms. Flourish, sprite, growth pop and +N are residue. `eventMs()` in `timing.ts` returns the blocking length only, and both bots and `useBlockyFx` use it. The cloud ribbon plays only when the turn passes to you, or to a different human on this device. Bot-to-bot turns only move the banner glow."

## Important

4. **The block recipe contradicts itself and has no rendering plan.** "7 layers per cell" vs "merged moulded shape, outline only around the piece". It also doesn't say how guild colour reaches a `<use>`, and gradient stops don't reliably inherit CSS variables through a `<use>` shadow tree.
   *Fix (§6.2 Block):* "Render per piece, not per cell. `art/blocks.tsx` builds one `<symbol>` per fixed orientation (91) from the cell union: the outline path, plus south face and east bevel only on exposed edges. Colour arrives as `color`/CSS vars on the `<use>` (`fill="currentColor"`). Shading is shared neutral alpha gradients (white/ink), and each guild pattern is one alpha `<pattern>`. A placed piece is one `<use>`, plus a details `<g>`. `BlockyArtDefs` is mounted once, in `blocky/BlockyApp.tsx`."

5. **The guild assignment is never shown.** Guilds are shuffled at start, yet the Guild Hall shows "4 guild banners" (which implies choosing one), and nothing tells a player which guild(s) they lead.
   *Fix:* "Guild Hall banners are neutral seat pennants. The first log event is `start { seats: Record<Guild, string | 'shared'> }`. It plays a guild reveal ('You lead Sun and Grove'). The player's own banners carry a 'You' tag for the whole game."

6. **The live score reads −89 at the start.** That's correct under the advanced rule, but confusing.
   *Fix (§7.1.6):* "Banners show **squares placed** (0-89; summed per player in 2-player Classic) as the big number, and the official score small beneath it. `place.points` = piece size. The shared guild shows 'Not scored'. The result shows the official formula line by line."

7. **"Hints" is undefined, so a builder could hide the clarity cues behind it.**
   *Fix:* "The room Hints setting controls only Suggest and the danger nudge. Anchors, fit glows, 'No room' tags and reason lines are always on. The personal 'Show open corners' setting hides only the idle anchor diamonds. Suggest always makes a pending ghost, whatever Confirm placements says."

8. **Input edge cases are missing.**
   *Fix (§7.2, add):*
   - `pointercancel` drops the drag back to the hand.
   - Snap and legality use the **ghost** position, never the finger.
   - Confirm-or-commit follows the `pointerType` of that drop, so an iPad with a trackpad behaves like a mouse.
   - Tapping a glowing anchor with a piece held makes a pending placement covering that anchor: the current orientation if it fits there, otherwise the first fitting orientation.
   - The pending ghost is re-validated on every display-state change. It's dropped with a short notice if it turns illegal, the turn isn't yours, or a reconnect jump happens.
   - Off-turn, you may pick up, rotate and flip a piece, but not drop it.
   - Buttons get `touch-action: manipulation`, so double-tap never zooms.
   - The shelf uses a roving tabindex. Space and the arrow keys act on the ghost only while the board has focus.
   - Status-line verbs follow the last pointer type ("Tap ✓" vs "Click ✓ or press Enter").

9. **Pass-and-play curtain in 3 players.** The shared rotation makes one human act twice in a row (Grove then Tide).
   *Fix (§5):* "The curtain falls only between two different humans. A computer seat never gets a curtain."

10. **Test time and flaky timing asserts.** 200 Duo games per pairing with Hard at about 50 ms a move takes minutes, and wall-clock asserts flake under `npm test`.
    *Fix (§10 M2):* "Put the strength test in its own file, `blocky.strength.test.ts`: 100 seeded Duo games per pairing, seats alternate, a tie counts half, timeout 300 s. In the fuzz, 2% of actions are random done/resign/dismiss, with a 180 s timeout. Timing tests take the median of 30 runs and assert 3x the budget (legalMoves < 15 ms, Hard < 300 ms). They log the real median, which must meet the budget in the M2 report."

11. **Gate C judges motion from 3 stills, which can't show bad easing.**
    *Fix (§9 Gate C):* "`/blocky/scenes?play=<anim>&scrub=<0..1>` freezes any animation at a fraction: CSS uses paused animations with a negative delay, and JS fx read one shared clock. The reviewer gets an 8-frame filmstrip per animation. The drag loop pushes frame times into `window.__blyFrames`, and the gate reads the p95 from there."

12. **Gate E has no deterministic states.** "A scripted bot game" can't reliably reach a grounded guild or the endgame.
    *Fix:* "`/blocky/scenes` also renders the full game screen from fixtures in `blocky/fixtures.ts` (built with the shared rules): `?screen=mid|duo|grounded|last|end&as=<seat>`. Gate E shoots these, plus scripted pointer moves for legal, illegal and pending."

13. **Exact plumbing touch points are missing** (they're the parts a one-pass builder gets wrong):
    - `App.tsx`: `case 'blocky': return <BlockyApp />`.
    - `partyRules.ts`: `hasBlockySeat?` in `FollowInput`, `case 'blocky'` in `targetPath`, and `/blocky` added to the `ttr` exclusion line.
    - `lib/party.ts`: the `savedSeat` import, the `at` edition exclusion, and `hasBlockySeat` in the input.
    - `lib/music.ts`: **both** the silent check (about line 557) and `onPicker` (about line 610).
    - `serve.ts`: the `SEED` line plus `installBlockyBots(server, { port: PORT })`.
    - `shared/src/index.ts`: the export.
    - "Seat 0's settings" is wrong. As in Runeshift, the room host is the lowest joined human seat (`roomHost`), and settings live in that seat's data.
    - `useMatch` is private to `kingdom/Lan.tsx`: copy it.
    - Add a sim helper, `packages/shared/test/blockySim.ts`, like `kingdomSim.ts`.

14. **Board truth must not live in the log.** Runeshift caps the log (`LOG_KEEP = 80`) and jumps on a gap. Last-piece outlines, "tap a log line", the sprites and the growth stages would all break after a reconnect.
    *Fix (§3):*
    - "`G.placed: { guild, piece, orient, at, n }[]` is the board's truth, and `G.board` cells hold an index into it."
    - "Growth is per piece: stage 2 once its guild has placed 2 more pieces, stage 3 after 6 more. So no round events are needed."
    - "`LOG_KEEP = 120`. A log line whose piece has left the window is no longer tappable."

15. **Time of day never reaches night.** Classic boards end about 70-85% full.
    *Fix:* "progress = (placed squares + squares left on grounded guilds' shelves) / (89 × guilds). Night falls at the end."

16. **Opponent shelves are undefined**, yet pieces "travel from that guild's shelf". Seeing what's left is also key strategy information.
    *Fix (§7.1.6):* "Each banner holds a mini-shelf. Tapping or hovering expands it to show that guild's remaining pieces. Opponent pieces travel from their banner. Only the active guild's shelf is full size, and in 2-player Classic your idle guild's shelf sits lowered beside it."

17. **A resign in 2 players leaves one builder placing alone.**
    *Fix (§3):* "The game also ends when one non-resigned player is left, and that player wins. Resigned and dismissed players rank last, ordered by score among themselves."

18. **Board and seat edge cases.**
    *Fix (§3):*
    - "If a 3rd seat joins, Board is forced to Classic. `validateSetupData` rejects `duo` unless there are 2 players."
    - "In Duo, Tide's start is (4,4) and Ember's is (9,9)."
    - "In 2-player Classic, the shuffle decides which seat gets Tide+Ember."
    - "In 3 players, the shuffle gives Tide, Sun and Ember to seats, and Grove is shared."

## Nice

19. **Vague detail lines a builder can satisfy minimally.**
    *Fix:* set the numbers below, and put particle counts and durations in a beat table in `fx.ts` that the Gate C reviewer receives.
    - Rim: at least 14 rim stones in 3 variants, at least 8 moss clumps, at least 6 roots, at least 4 crystals, 1 nest.
    - Avatars: 3-tone shading, a prop each, and silhouettes that stay distinct in grayscale at 40 px.
20. **Reviewer leniency.**
    *Fix:* "The reviewer lists at least 5 defects even on PASS. From Gate B on, it also gets the A0 mock screenshot as the reference."
21. **The view has no rng to strip.** boardgame.io keeps rng in `ctx`.
    *Fix:* "`viewFor` returns G as is. It exists as the one place to filter."
22. **"Open corners" should count only live anchors** (where some remaining piece fits); the raw diagonal cells include dead ones. That's the number the danger badge needs.
23. **Gate screenshot bloat.** Commit only each gate's final-round shots, and keep earlier rounds out of git.
