# Runeshift: spec

The brief (`PROMPT.md`) made precise. A storybook-kingdom game that plays like the classic shifting-maze board game: shift the maze with the spare tile, then walk your hero to your secret treasures and home. Game name `kingdom`, 2-4 players, online first, with server bots, pass and play, vs computer, party and spectators.

## 1. Data model (`packages/shared/src/kingdom/`)

- **Openings mask:** N=1, E=2, S=4, W=8. `rotCW(m) = ((m << 1) | (m >> 3)) & 15`. Base masks: I = N|S (5), L = N|E (3), T = E|S|W (14, closed north).
- **Cells:** index `r * 7 + c`, row 0 at the top. Fixed cells: r and c both even (16).
- **Fixed layout** (`tiles.ts` `FIXED`):
  - Corners (homes, L): (0,0) E|S, (0,6) S|W, (6,6) N|W, (6,0) N|E.
  - Edge T tiles closed toward the edge: top 14 (E|S|W), right 13 (N|S|W), bottom 11 (N|E|W), left 7 (N|E|S).
  - Centre four: a pinwheel, each closed on its outer side: (2,2) closed N, (2,4) closed E, (4,4) closed S, (4,2) closed W. So each opens toward both of its centre-side neighbours. Pinned by a test.
  - Objects in reading order of the 12 fixed T cells: (0,2) harp, (0,4) slipper, (2,0) crystal, (2,2) musicbox, (2,4) sceptre, (2,6) watch, (4,0) lantern, (4,2) teapot, (4,4) apple, (4,6) wheel, (6,2) coin, (6,4) beans.
- **Treasures** (24 ids, `TREASURES`): objects `harp slipper crystal musicbox sceptre watch lantern teapot apple wheel coin beans`; creatures `unicorn goose frog fox griffin fairy gnome tortoise bear rose phoenix comb`. Creatures: the first 6 on L tiles, the last 6 on T tiles.
- **Movable tiles (34):** 12 I, 16 L (6 with creatures), 6 T (6 with creatures). Tile `{ id: number, m: mask, t?: TreasureId }`; ids 0-15 fixed, 16-49 movable, stable for art seeding.
- **Setup:** boardgame.io seeded random shuffles the 34 movable tiles; the first 33 fill the free cells in reading order, each at a random rotation; the last is the spare. Then the treasures are shuffled and dealt, then `G.order` = shuffle of the seats. Homes by turn order: 1st TL (0), 2nd TR (6), 3rd BR (48), 4th BL (42).
- **Game length** (`tuning.ts` `LENGTH`): `full` = 24 / n each (12, 8, 6), `medium` = 5, `short` = 3. Undealt treasures stay on the board as scenery.
- **Insertion points** (`INSERTS`, index 0-11, clockwise from the top-left): N1 N3 N5 (push down columns 1,3,5), E1 E3 E5 (push left along rows 1,3,5), S5 S3 S1 (push up), W5 W3 W1 (push right). `opposite(at)` is the same line on the other side. **No-undo:** after a shift at `a`, the next shift may not be at `opposite(a)`.

## 2. State and actions

`KState`: `board: Tile[49]`, `spare`, `players` (seat ids), `order`, `current`, `step: 'shift' | 'move'`, `lastAt: number | null`, `pos`, `home`, `stacks` (secret, top = index 0), `found`, `young: boolean[]`, `heroes: number[]`, `bots: boolean[]`, `hints`, `length`, `out: string[]`, `result: { winner, reason: 'home' | 'last' } | null`, `log: KEvent[]` (last 80), `logTotal`, `turn` (count).

- `act(G, p, a)` returns an error string or applies. `{ k: 'shift', at, rot }`: `rot` = quarter turns clockwise applied to the current spare; needs `step === 'shift'` and `at !== opposite(lastAt)`. `{ k: 'move', to }`: `to` must be in `reachable(G.board, pos[p])` (staying = `to` is your own cell).
- `applyShift(board, spare, pos, at, rot)` is pure and returns `{ board, spare, pos, wraps }`. Heroes on the pushed-out tile land on the inserted tile.
- `reachable(board, from)`: BFS over facing openings. `pathTo(board, from, to)`: BFS shortest path, neighbour order N, E, S, W, returns the cells from `from` to `to` inclusive, or null. Shared by the engine, bots and client.
- **Collect** at the end of a move only: your current target (or, in Young Adventurer mode, any treasure left in your stack) sits on the cell you end on. A treasure on the spare can never be collected.
- **Home win:** end a move on your home with an empty stack.
- `resign(G, p)` (any time) and `dismiss(G, by, seat)`: the hero is removed (`out`), if it was their turn the turn passes, and the last hero left wins. `dismiss` is allowed only from `hostSeat(G)` (the lowest seat that is human and not out), except that the next human seat may dismiss the host itself (the host dropped). After that, the next human seat is the host.
- **Events** (`KEvent`, each with `n` = its logTotal): `shift { p, at, rot, out, wraps }` (`out` = id of the tile pushed out), `move { p, path }`, `collect { p, t }`, `home { p }` (stack emptied: heading home), `turn { p }`, `resign { p, by? }`, `win { p, reason }`.
- **View** (`view.ts`, the only filter): `stacks` is replaced by `targets: Record<p, TreasureId[]>`: your own top card (your whole stack in Young Adventurer mode), `[]` for everyone else; `left: Record<p, number>` public. After the game everything shows. Spectators see no targets.

## 3. Setup data and lobby

`setupData { length?: 'full'|'medium'|'short', hints?: boolean, young?: boolean[], heroes?: number[], bots?: boolean[] }`, validated (`validateKingdomSetupData`). Waiting room = a 4-seat `kingdom` match; seat data `{ hero, young, bot?, settings? }`; the room host is the lowest joined human seat, whose `settings { length, hints }` rule the room. Start calls `playAgain` with the joined count and setupData (`heroes`, `young`, `bots` in joined order).

## 4. Client

DOM + inline SVG, a tilted tray (`perspective` + `rotateX(28deg)`) holding the tiles, and a flat overlay for everything upright, positioned by `project(row, col)` (`kingdom/project.ts`, the same numbers as the CSS). Flat view toggle (`kg.flat`). The display state is stepped through the event log by `useKingdomFx`; the client never diffs boards.

## Decisions

1. **Masks and rotations** as in section 1; `rot` in the shift action is relative to the spare as it is in `G`.
2. **Centre pinwheel** orientation (section 1), pinned by a test.
3. **Object layout:** objects in reading order of the fixed T cells (section 1).
4. **Tile ids** are stable (0-15 fixed, 16-49 movable) so decorations seed from the id.
5. **Undealt treasures** (Medium and Short) stay on the board as scenery and can't be collected.
6. **Events:** `collect` is its own event right after `move` (no `collected` field on `move`), and `home` means "stack emptied, heading home". A `turn` event marks each turn change so the banner plays from the log.
7. **Host for `dismiss`:** the engine knows which seats are bots from setupData `bots`. Host = lowest human seat not out; the next human seat may dismiss the host. The 30 s offline check is client-side (`matchData.isConnected`), since moves can't see connection state.
8. **Room host** = the lowest joined human seat (also for server-bot add/remove), so a host who leaves the waiting room hands over.
9. **Bot distance** for Medium/Hard when the target can't be reached is grid (Manhattan) distance from the end square to the target cell (to the insertion end if the target is on the spare), ties broken by the shorter walk.
10. **Hard lookahead:** top 8 shifts by Medium's score × the 6 closest reachable squares × all next-turn shifts; +0.5 bonus for ending on a fixed tile. Opponents' moves in between are ignored.
11. **Strength test** uses Medium length (5 treasures each) to keep it fast; the fuzz uses mostly Short/Medium and some Full.
12. **Tuning numbers** live in `shared/src/kingdom/tuning.ts` (lengths and bot numbers); timings in `shared/src/kingdom/timing.ts` (shared by server bots and `client/src/kingdom/fx.ts`).
13. **Server bot pace:** a bot waits for the Full-speed animation time of every event since it last acted, plus the turn lead; `TTB_BOT_DELAY` replaces this with that fixed delay (×2 for the first action of a turn).
14. **Log** keeps the last 80 events; `logTotal` counts all of them. A client that falls more than 80 behind jumps to the current state.
15. **Pass and play:** heroes are chosen on the setup page; computer seats in local games act from their own client view with the browser bot.
16. **Hints** default on; "Suggest a push" uses the Easy logic from the player's own view, picking the first reaching shift in insertion order so it is stable.
17. **Collected treasures leave the board** visually (the client hides any treasure in someone's `found`); `G` keeps the tile data unchanged.
18. **Intro** plays at the start of every new match (log empty) unless fx is Off or `kg.intro` = `seen`; one click skips it.
19. **The pushed-out tile** slides off inside the tilted tray, then a flat copy arcs to the pedestal in the overlay (the flat/tilted hand-over happens off the board edge, where it reads as the tile being lifted).
