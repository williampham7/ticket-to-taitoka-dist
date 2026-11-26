# Blocky: decisions

Calls made while building (PROMPT.md and PLAN.md are the spec).

## Rules (M1-M2)
- Duo is the 2-player default. Duo start squares are fixed: Tide (4,4), Ember (9,9), 0-indexed (house rule). In Duo and 2-player Classic the seeded shuffle picks which seat gets which guild(s).
- `newGame` forces Classic unless exactly 2 are seated; `validateBlockySetupData(d, numPlayers)` rejects `duo` for other counts.
- `order` = seats in the order of the guilds they lead first. The shared guild's k-th turn goes to `order[k % n]`, or the next live seat after it; `sharedTurns` counts its placements.
- `act` returns the `Reason` code for an illegal placement, `notYours` when the caller is not `G.actor`, `nothing to ground` for a `done` with no ungrounded own guild. `done` during a shared turn does not ground the shared guild.
- A guild with no legal placement is grounded and logged `stuck`; a guild that placed all 21 is grounded silently.
- A `turn` event is logged on every step to a new guild/actor (including after done/resign/dismiss).
- Ending: all guilds grounded, or one or fewer non-out seats left. Ranking: in-game seats by score (ties in `order` order), then out seats by score. Winners: top-scoring non-out seats (ties share).
- Hard keeps the monomino for last (drops monomino placements unless nothing else fits). Tuning: one round, own-mobility 0.1, mobility 0.4. Strength: Hard v Medium 85%, Medium v Easy 95.5%.
- `BState` carries `avatars: number[]` (0-5) from setupData.

## Plumbing (M3)
- Avatars are unique per room and per local match (6 builders, 4 seats), like Runeshift's heroes.
- `lobby.ts` `boardFor(settings, joined)`: the host's Board choice applies only with exactly 2 seated; otherwise Classic. The Duo button is disabled with 3+ seated.
- Bot titles: Apprentice (easy), Mason (medium), Architect (hard), the same online and locally.
- Pass-and-play hand-off is the pure `handoff.ts` (`nextShown`, `curtainUp`); `curtain.ts` would clash with `Curtain.tsx` on a case-insensitive disk.

## Art (M4)
- The mock (`/blocky/mock`) is composed from the real presentational components (`Board.tsx`, `Hud.tsx`, `Shelf.tsx`) fed a fixture, so the game matches it by construction; the game screen adds input and state around the same components.
- Guild colours are clay, at four separate grey levels (Tide darkest, Ember, Grove, Sun lightest); patterns differ in structure (waves, dots, cracks, leaves).
- The centre compass rose is covered mid-game, so a carved compass medallion also sits in the south rim.
- The game screen's top bar holds only the brand, leave, settings and sound keys (it must fit the 20vw left column at 1024 px); chat lives in the log header, clean view and Done building in the shelf's tool row (Done = a flag icon, an 11th icon).
- The pending ✓ ✕ keys sit beside the ghost on the side covering the fewest placed blocks (`keySpot`), with a tether.
- Marching ants mean "ghost" only; the last-piece outline and the newest-move ring are solid glows.
- Shortcuts S (Suggest) and D (Done building) were added so every tool key shows its letter.

## Animation and audio (M6, M8)
- Every effect is a CSS keyframe animation started by `--d` (ms from the event's start), so `/blocky/scenes?play=<anim>&scrub=<0..1>` and `?strip=<anim>` freeze any frame (paused + `--scrub`). The beat table is `fx.ts` `BEAT`.
- The display queue (`fxQueue.ts`) re-applies each public log event with the shared rules; `useBlockyFx` keeps a residue list so flourishes overlap the next event, and hides a placed piece only until its blocks land.
- Opponents' pieces fly in from their banner (anticipation 120 + travel 240 ms) so even a 1-square landing fits its 620 ms blocking time (unit-tested); your own drop dips for 150 ms.
- A fresh game (nothing placed, log from event 1) replays its `start` event so the guild reveal shows.
- The reason line for an illegal drop shows in red in the status line (`bly-reason`), not over the board; the turn ribbon plays over the plateau's underside.
- Touch lift = max(1.5 cells, 56 px).
- Sounds ride the same log as the animations (landings at the landing moment). Mute: `bly.muted` (top-bar key); volumes in Settings (`bly.sfx`, `bly.music`).
