# Egyptian War Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Egyptian War, a real-time 2-5 player card-slapping game, as a separate game on this repo's server, lobby, party, chat and audio system.

**Architecture:** Pure rules in `packages/shared/src/egyptian/` (explicit `now` everywhere, so tests own the clock), wrapped by a boardgame.io `EgyptianGame` where every seat is always active and timed events are resolved by a `tick` move checked on the server clock. The client in `packages/client/src/egyptian/` draws a deck-neutral table; all card art comes from a pluggable `DeckSkin` (one skin: `egyptian`).

**Tech Stack:** TypeScript, boardgame.io 0.50.2, React 19, Vite, Tailwind 4 + plain CSS, Vitest, Playwright, Web Audio.

**Spec:** `docs/egyptian/SPEC.md` (read it whole, including **Decisions**). Brief: `docs/egyptian/PROMPT.md`.

## Global Constraints

- Branch `egyptian-war`; small conventional commits ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never commit to `main`.
- Game name `egyptian`; CSS prefix `egw-`; never the class name `hidden`; never `.egw > *` blanket rules.
- Every move: `{ move, client: false, ignoreStaleStateID: true }`.
- Rule timings: `minFlipGapMs 400`, `latencyMs 200`, `graceMs 1000`, `lockoutMs 1000`, `idleFlipMs 15000`, `readyWaitMs 8000`; pauses `dealMs 2600`, `slapPauseMs 2400`, `challengePauseMs 1800` (quick: 200 / 300 / 300).
- Default slap rules `['double', 'sandwich']`; at least one rule always selected.
- Default keys by `KeyboardEvent.code`: P1 flip `KeyQ`, P1 slap `KeyW`, P2 flip `BracketRight`, P2 slap `BracketLeft`, online flip `KeyF`, online slap `Space`.
- `playerView` never exposes a stack's contents or a burned card, to anyone, ever.
- Inline SVG only for card art; no raster images.
- Client code reads storage only through `lib/storage.ts` (`load`/`save`), except the fx/e2e flags that mirror Fleet's direct `localStorage` reads.
- Test commands: `npx vitest run <paths>`, `npm test`, `npm run typecheck`, `npm run build && npx playwright test e2e/egyptian.spec.ts`.

## Review Focus

1. **Two slaps on one double, arriving 30 ms apart online:** the first wins; the second is stamped with the old round once the pile is won and must cost nothing (Task 3 test `second slap on a won pile is free`).
2. **A false-slap burn that empties the challenged player's stack:** the remaining tries must pass on exactly like running out by flipping (Task 3 test `burn empties the challenged player`).
3. **Every player out of cards at once** (last card flipped, or last card burned): the game must not stall (Task 3 test `nobody holds cards`; fuzz invariant).
4. **A tab that never sends `ready` or goes away mid-game:** the deal starts after 8 s and the idle auto-flip keeps play moving (Task 3 tests `ready cap` and `idle auto-flip`).
5. **Keys while typing in chat, or holding a key down:** no flips or slaps (Task 6 tests `ignores editable targets` and `ignores repeat`).

---

### Task 1: Cards and the slap-rule catalogue

**Files:**
- Create: `packages/shared/src/egyptian/cards.ts`, `packages/shared/src/egyptian/slapRules.ts`, `packages/shared/src/egyptian/index.ts`
- Test: `packages/shared/test/egyptian.slapRules.test.ts`

**Interfaces:**
- Produces (`cards.ts`): `type Card = number` (0..51); `type Suit = 'S'|'H'|'D'|'C'`; `SUITS: readonly Suit[]` = `['S','H','D','C']`; `DECK_SIZE = 52`; `rankOf(c): number` (1..13); `suitOf(c): Suit`; `cardOf(rank: number, suit: Suit): Card`; `challengeTries(c): 0|1|2|3|4` (J1 Q2 K3 A4); `rankLabel(rank): string` ('A','2'..'10','J','Q','K'); `cardName(c): string` ("7 of hearts", "Ace of spades", "Queen of diamonds"); `isRed(c): boolean`; `fullDeck(): Card[]`.
- Produces (`slapRules.ts`): `type SlapRuleId` (the 14 ids in SPEC §4 order); `interface SlapRule { id; name; description; example: Card[]; detect(pile: readonly Card[]): number[] | null }`; `SLAP_RULES: readonly SlapRule[]` (catalogue order); `SLAP_RULE_IDS`; `DEFAULT_RULES: SlapRuleId[]`; `isSlapRuleId(x: unknown): x is SlapRuleId`; `interface SlapMatch { rule: SlapRuleId; cards: number[] }`; `matchSlap(pile, rules): SlapMatch[]` (catalogue order, not `rules` order); `validateRules(x: unknown): string | undefined` (non-empty array of unique known ids).

- [x] **Step 1: Write the failing tests.** Helper `c('7H')` builds a card from a short name (`'10S'`, `'AH'`, `'KD'`). One `describe` per rule with at least one positive (asserting the exact indices from SPEC §4) and one negative case, plus:
  - `staircase`: `['QS','KH','AD']` -> `[0,1,2]`; `['AS','2H','3D']` matches; `['3S','2H','AD']` matches; `['KS','AH','2D']` -> null; `['5S','6H','8D']` -> null.
  - `tens`: `['AS','9H']` matches; `['4S','6H']` matches; `['10S','JH']` -> null and `['KS','3H']` -> null (J/Q/K never count); `['5S','5H']` matches.
  - `topBottom`: `['7S','2H','7D']` -> `[0,2]`; `['7S','7D']` -> null (needs 3+).
  - `matchSlap(['7S','7H'] , ['slapjack','double','lucky7'])` -> rules `['double','lucky7']` in that order; `matchSlap(['JS','2H','JD'], ['sandwich','slapjack'])` -> `['sandwich','slapjack']`.
  - Every `SLAP_RULES[i].example` matches its own rule; ids are unique and equal SPEC order; `validateRules([])`, `(['nope'])`, `(['double','double'])` are errors; `validateRules(DEFAULT_RULES)` is undefined.
  - `cards`: `rankOf(cardOf(12,'D')) === 12`, `cardName(cardOf(1,'S')) === 'Ace of spades'`, `fullDeck()` is 0..51.
- [x] **Step 2: Run** `npx vitest run packages/shared/test/egyptian.slapRules.test.ts` — expect FAIL (modules missing).
- [x] **Step 3: Implement `cards.ts` and `slapRules.ts`**; `index.ts` re-exports both (later tasks add their files).
- [x] **Step 4: Run** the test — expect PASS.
- [x] **Step 5: Commit** `feat(egyptian): cards and slap-rule catalogue`.

### Task 2: Timing table and core rules: deal, flip, challenge, grace, collect, win

**Files:**
- Create: `packages/shared/src/egyptian/timing.ts`, `packages/shared/src/egyptian/rules.ts`
- Test: `packages/shared/test/egyptian.rules.test.ts`, helper `packages/shared/test/egyptianHelpers.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces (`timing.ts`): `interface Timing { minFlipGapMs; latencyMs; graceMs; lockoutMs; idleFlipMs; readyWaitMs; dealMs; slapPauseMs; challengePauseMs }` (all `number`); `TIMING`, `QUICK_TIMING` with SPEC §3 values.
- Produces (`rules.ts`):
  - `type PlayerID = string`; `type Stage = 'waiting'|'ready'|'dealing'|'play'|'over'`.
  - `interface Challenge { by: PlayerID; target: PlayerID; tries: number; face: Card }`
  - `type Timer = { kind: 'grace'; at: number; winner: PlayerID; why: 'challenge'|'last' } | { kind: 'collect'; at: number }`
  - `interface Won { by: PlayerID; how: 'slap'|'slapIn'|'challenge'|'last'; matches: SlapMatch[]; pile: Card[]; face?: Card }`
  - `interface Stats { flips: number; slapsWon: number; falseSlaps: number; challengesWon: number; longest: number }`
  - `type EgwEvent = { seq: number; at: number } & ({ kind: 'deal' } | { kind: 'flip'; by: PlayerID; card: Card; auto?: true } | { kind: 'challenge'; by: PlayerID; target: PlayerID; face: Card; tries: number } | { kind: 'pass'; target: PlayerID; tries: number } | { kind: 'grace'; winner: PlayerID } | { kind: 'slap'; by: PlayerID; how: 'slap'|'slapIn' } | { kind: 'falseSlap'; by: PlayerID; burned: boolean } | { kind: 'won'; by: PlayerID; how: Won['how'] } | { kind: 'collect'; by: PlayerID; cards: number } | { kind: 'out'; by: PlayerID } | { kind: 'left'; by: PlayerID } | { kind: 'win'; by: PlayerID })`
  - `interface EgwState { stage; rules: SlapRuleId[]; timing: Timing; players: PlayerID[] /* deal = clockwise order */; stacks: Record<PlayerID, Card[]> /* [0] = top */; pile: Card[]; burned: Card[]; round: number; leader: PlayerID; turn: PlayerID|null; topBy: PlayerID|null; challenge: Challenge|null; timer: Timer|null; won: Won|null; lastFlip: { at: number; by: PlayerID }|null; turnSince: number; lockout: Record<PlayerID, number>; slapInUsed: Record<PlayerID, boolean>; left: Record<PlayerID, boolean>; ready: Record<PlayerID, boolean>; firstReadyAt: number|null; playAt: number|null; clock: number; stats: Record<PlayerID, Stats>; log: EgwEvent[] /* last 40 */; seq: number; result: { winner: PlayerID }|null }`
  - `interface Rng { shuffle<T>(a: T[]): T[]; die(n: number): number /* 1..n */ }`
  - `newGame(numPlayers: number, rules: SlapRuleId[], rng: Rng, timing?: Timing): EgwState` (stage `ready`); `waitingRoom(rules?: SlapRuleId[]): EgwState` (stage `waiting`, no players).
  - Each action returns `string | undefined` (error = refused, state untouched): `ready(G, p, now)`, `flip(G, p, now)`, `tick(G, now)`. Every accepted action sets `G.clock = now`.
  - `nextWithCards(G, from: PlayerID, includeSelf: boolean): PlayerID | null` (clockwise, skips empty stacks and left players).
  - `totalCards(G): number`; `nextTimed(G): number | null` (when the next timed event is due).

- [x] **Step 1: Write failing tests** (helper `rigged(stacks: Record<string,string[]>, opts?)` builds a `play`-stage state from short card names with `players = Object.keys(stacks)`, `turn = players[0]`, `now = 0`):
  - deal sizes: `newGame(n)` with an identity rng gives 26/26, 18/17/17, 13×4, 11/11/10/10/10 in deal order; `totalCards === 52`.
  - deal order vs starting player: with an rng whose `shuffle` reverses and `die` returns 2, `players` is reversed and `turn === players[1]`.
  - `ready`: all seats ready -> stage `dealing`, `playAt = now + dealMs`; `tick` before `playAt` is refused, at `playAt` -> `play`. **ready cap:** one seat ready at 0, `tick(G, 7999)` refused, `tick(G, 8000)` starts the deal.
  - clockwise play skipping empty stacks: A,B,C with B empty: A flips a number card -> `turn === 'C'`.
  - min flip gap: flip at 0 accepted; next flip at 399 refused; at 400 accepted.
  - challenge: A flips `KS` -> `challenge {by:A,target:B,tries:3}`, `turn B`; B flips 2 numbers -> tries 1; B flips `JD` -> new challenge by B on C (tries 1); C flips a number -> `timer {grace, winner B, at now+1000}`, `turn null`; flips refused during grace; `tick` at +999 refused; at +1000 -> `won {by B, how 'challenge'}`, `timer collect at +1800`; `tick` then -> B's stack = old stack + pile in played order, `round` 2, `turn B`, `leader B`, `pile []`.
  - running out mid-challenge: B (target) holds 1 number card, tries 3: B flips it -> challenge target C with tries 2. And: 2 players, target runs out -> grace for the challenger.
  - only player with cards plays a face card -> grace, winner = that player.
  - **nobody holds cards:** A is the only one with cards and flips its last (number) card, no challenge -> grace, winner A (`why 'last'`).
  - **idle auto-flip:** `tick(G, turnSince + 14999)` refused; at `+15000` the turn player's top card is on the pile, event `flip` has `auto: true`.
  - win: A holds 50, the pile has 2, A collects -> `result {winner A}`, stage `over`, event `win`.
  - invariant helper `assertInvariant(G)`: `totalCards === 52`; in `play` without result, `turn !== null` (holding cards, not left) or `timer !== null`.
- [x] **Step 2: Run** `npx vitest run packages/shared/test/egyptian.rules.test.ts` — FAIL.
- [x] **Step 3: Implement `timing.ts` and the listed `rules.ts` functions.** `log` keeps the last 40 events; `seq` increments per event; `stats.longest` updates on deal and collect; collecting order per SPEC §2 (burned first, then pile).
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(egyptian): deal, flips, challenges, grace and collecting`.

### Task 3: Slaps, false slaps, slap-ins, latency, leaving

**Files:**
- Modify: `packages/shared/src/egyptian/rules.ts`
- Test: `packages/shared/test/egyptian.slaps.test.ts`

**Interfaces:**
- Consumes: Task 2 state and helpers.
- Produces: `slap(G, p, round: number, now): string | undefined` (undefined = processed, valid or false; errors: `'not playing'`, `'left'`, `'stale'`, `'paused'`, `'locked'`, `'spent'`); `leave(G, p, now): string | undefined`.

- [x] **Step 1: Write failing tests:**
  - valid double -> `won {by, how 'slap', matches [{rule:'double', cards:[n-2,n-1]}]}`, `challenge null`, `turn null`, `timer collect at now+2400`, `stats.slapsWon` 1; flips and slaps during the collect pause are refused (`'paused'`).
  - slap during the grace window wins for the slapper, not the challenger.
  - **second slap on a won pile is free:** after a valid slap and the collect, a slap stamped with the old round returns `'stale'` and burns nothing.
  - false slap: top card moves to `burned`, `lockout[p] = now+1000`, `stats.falseSlaps` 1, event `falseSlap {penalty:true}`; a slap at +999 returns `'locked'` and burns nothing; at +1000 it is judged again.
  - burns never count: pile `['7S']`, burned `['7H']` -> a slap is false.
  - locked-out player can still flip on their turn.
  - **burn empties the challenged player:** target holds 1 card, false slap -> tries pass to the next player with cards (or grace for the challenger).
  - burn empties the turn player (no challenge) -> turn passes on; if nobody holds cards -> grace per the nobody rule (`why 'last'`, winner `topBy`, else `leader`).
  - slap-in: an out player's false slap -> `slapInUsed` true, nothing burned, event `falseSlap {penalty:false}`; second slap that round -> `'spent'`; after the next collect `slapInUsed` is all false; a valid slap-in -> `how 'slapIn'`, the player collects, leads, and is back in turn order.
  - latency: pile `['7S','7H']`, then a flip of `'2D'` at t=1000; slap at 1200 wins (matches cards `[0,1]`), slap at 1201 is false.
  - empty pile slap is false.
  - leave: cards go to `burned`, `left` true, turn/challenge pass as if out; leaver's slaps -> `'left'`; with 2 players the other wins at once; winner leaving during the collect pause -> the pile goes to the next non-left player clockwise.
  - `totalCards === 52` and `assertInvariant` after every step of every test.
- [x] **Step 2: Run** `npx vitest run packages/shared/test/egyptian.slaps.test.ts` — FAIL.
- [x] **Step 3: Implement `slap` and `leave`** (one internal `runOut(G, p, now)` handles a stack reaching 0 from a flip, a burn or a leave).
- [x] **Step 4: Run** Task 2 and 3 tests — PASS.
- [x] **Step 5: Commit** `feat(egyptian): slaps, burns, lockout, slap-ins, latency and leaving`.

### Task 4: View, boardgame.io game, server registration

**Files:**
- Create: `packages/shared/src/egyptian/view.ts`, `packages/shared/src/egyptian/game.ts`
- Modify: `packages/shared/src/egyptian/index.ts`, `packages/shared/src/index.ts` (export `EgyptianGame`, `EGYPTIAN_GAME_NAME`), `packages/server/src/serve.ts`
- Test: `packages/shared/test/egyptian.game.test.ts`

**Interfaces:**
- Produces (`view.ts`): `interface EgwView extends Omit<EgwState, 'stacks'|'burned'> { counts: Record<PlayerID, number>; burnedCount: number }`; `viewFor(G): EgwView` (same for every viewer).
- Produces (`game.ts`): `EGYPTIAN_GAME_NAME = 'egyptian'`; `interface EgyptianSetupData { rules?: SlapRuleId[]; waiting?: boolean; quick?: boolean }`; `validateEgyptianSetupData(d: unknown): string | undefined`; `EgyptianGame: Game<EgwState>` with `minPlayers 2`, `maxPlayers 5`, `turn: { activePlayers: ActivePlayers.ALL }`, moves `ready()`, `flip()`, `slap(round: number)`, `tick()`, `leave()` (each calls the rule with `Date.now()`, returns `INVALID_MOVE` on an error string), `endIf` from `G.result`. Setup: `waiting` -> `waitingRoom(rules)`; else `newGame(ctx.numPlayers, rules ?? DEFAULT_RULES, { shuffle: random.Shuffle, die: random.Die }, quick ? QUICK_TIMING : TIMING)`.
- Server: `const egyptian = process.env.SEED ? { ...EgyptianGame, seed: process.env.SEED } : EgyptianGame;` added to `games`.

- [x] **Step 1: Write failing tests** (`vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime` to drive the server clock; Local() table helper like `fleet.game.test.ts`):
  - setupData: `{rules:['tens']}`, `{waiting:true}`, `{quick:true}` valid; `{rules:[]}`, `{rules:['x']}`, `[]`, `{quick:'yes'}` invalid.
  - flow: 3 clients `ready` -> `dealing`; advance 200 ms (quick), `tick` -> `play`; the turn player flips; a non-turn flip changes nothing.
  - stale state: client B slaps after client A's flip without B having seen it (call B's move from a client whose state is older) and the slap is still judged (`ignoreStaleStateID`).
  - **no leaks**, every seat and a spectator, every step of a scripted game and after a reconnect (`make(null)` / a fresh client for seat 1 mid-game): no key named `stacks` or `burned` at any depth of the client's `{G, ctx, plugins, log}`; `counts` + pile + `burnedCount` = 52; `plugins.random.data` is undefined; every card id the client holds (in `pile`, `won.pile`, `challenge.face`, log `card`/`face`, move args) is one that has been flipped face up, i.e. in the test's own record of flipped cards; `falseSlap` events carry no card.
  - waiting room: `{waiting:true}` with 5 seats -> stage `waiting`; `flip`/`slap`/`ready` refused.
- [x] **Step 2: Run** `npx vitest run packages/shared/test/egyptian.game.test.ts` — FAIL.
- [x] **Step 3: Implement** `view.ts`, `game.ts`, exports, server registration.
- [x] **Step 4: Run** the test, then `npm run typecheck` — PASS.
- [x] **Step 5: Commit** `feat(egyptian): boardgame.io game, player view and server registration`.

### Task 5: Fuzz

**Files:**
- Test: `packages/shared/test/fuzz.egyptian.test.ts`

**Interfaces:**
- Consumes: `newGame`, `ready`, `tick`, `flip`, `slap`, `leave`, `matchSlap`, `nextTimed`, `totalCards` from Tasks 2-3; `assertInvariant` from `egyptianHelpers.ts`.

- [x] **Step 1: Write the fuzz test:** for each `n` in 2..5, 500 games, seeded `prng` from `frontlineHelpers.ts`, random rule subsets. Simulated clock: each step advances 30-700 ms, then one of: due `tick`; the turn player flips (60%); a random seat slaps (valid when `matchSlap` hits, with 70% chance it waits a beat) or false-slaps (5%); a random seat leaves (0.1% per step, at most one per game). After every step `assertInvariant(G)`. Cap 4000 steps; count capped games and `console.info` the count; a game that is neither over nor capped fails.
- [x] **Step 2: Run** `npx vitest run packages/shared/test/fuzz.egyptian.test.ts` — PASS (if it fails, fix the rule in `rules.ts` with a new unit test reproducing the seed first).
- [x] **Step 3: Commit** `test(egyptian): 500-game fuzz per player count`.

### Task 6: Client foundations: keys, fx timings, controls, timers, seating

**Files:**
- Create: `packages/client/src/egyptian/keys.ts`, `fx.ts`, `controls.ts`, `useTimers.ts`, `seating.ts`
- Test: `packages/client/src/egyptian/keys.test.ts`, `fx.test.ts`, `seating.test.ts`

**Interfaces:**
- Produces (`keys.ts`): `type KeyAction = 'p1Flip'|'p1Slap'|'p2Flip'|'p2Slap'|'flip'|'slap'`; `type Bindings = Record<KeyAction, string>`; `DEFAULT_KEYS`; `KEY_GROUPS: { local: KeyAction[]; online: KeyAction[] }`; `keyLabel(code): string` (`KeyQ`->`Q`, `BracketRight`->`]`, `Space`->`Space`, `Digit7`->`7`); `rebind(b, action, code): Bindings`; `conflicts(b): Set<KeyAction>` (same code twice within a group); `loadKeys(): Bindings` / `saveKeys(b)` (`egw.keys`, unknown/missing entries fall back to defaults); `actionFor(b, group, e: { code: string; repeat: boolean; target: EventTarget | null }): KeyAction | null` (null for `repeat`, for targets that are input/textarea/select/contenteditable).
- Produces (`fx.ts`): `type FxSetting = 'full'|'fast'|'off'`; `FX: Record<FxSetting, { flipMs; landMs; dealCardMs; dealHighlightMs; handMs; revealMs; sweepMs; crackMs; burnMs; flashMs }>`; `setFx`, `useFx`, `effectiveFx` (reduced motion: full -> fast; `egw.e2e` = `'1'`: off); `isE2E(): boolean`; `slapShowMs(fx)` = hand + reveal + sweep; `challengeShowMs(fx)` = reveal + sweep; `dealShowMs(fx, cards = 52)`.
- Produces (`controls.ts`): `interface EgwControls { ready(): void; flip(): void; slap(round: number): void; tick(): void; leave(): void }`; `controlsFor(client: BgioClient): EgwControls`; `interface EgwClientState { G: EgwState; ctx: {...}; isConnected?: boolean }`; `viewOf(s): EgwView`.
- Produces (`useTimers.ts`): `useTimers(view: EgwView | null, tick: () => void, active: boolean)`: computes `due = nextTimed(view)`; offset = `Date.now() - view.clock` at receipt; schedules `tick` at local `due`, then retries every 150 ms until `view.seq`/`clock` changes.
- Produces (`seating.ts`): `seatOrder(players: PlayerID[], me: PlayerID | null): PlayerID[]` (rotated so `me` first; spectators: `players[0]` first); `seatAngle(index, n): number` (degrees, 90 = bottom, increasing clockwise on screen: `90 + index * 360 / n`); `localSides`: seat `'0'` left, `'1'` right.

- [x] **Step 1: Write failing tests:** rebind then conflicts (`rebind(DEFAULT_KEYS,'p1Slap','KeyQ')` -> `conflicts` = {p1Flip,p1Slap}; same code in different groups is not a conflict); persistence round-trip through `localStorage` (jsdom/happy-dom as other client tests do) and corrupted storage -> defaults; **ignores repeat**; **ignores editable targets** (an `<input>` and a `contenteditable` div); `keyLabel` cases; `fx`: `slapShowMs('full') <= TIMING.slapPauseMs`, `challengeShowMs('full') <= TIMING.challengePauseMs`, `dealShowMs('full') <= TIMING.dealMs`, and `off` is all 0; `seatOrder(['2','0','1'],'0')` = `['0','1','2']`; `seatAngle(1,4) === 180` (left).
- [x] **Step 2: Run** `npx vitest run packages/client/src/egyptian` — FAIL.
- [x] **Step 3: Implement** the five modules.
- [x] **Step 4: Run** — PASS.
- [x] **Step 5: Commit** `feat(egyptian): key bindings, fx timings, controls, timers and seating`.

### Task 7: Deck system, card stock, pips, number cards, back, gallery

**Files:**
- Create: `packages/client/src/egyptian/decks/types.ts`, `decks/index.ts`, `decks/egyptian/index.tsx`, `decks/egyptian/defs.tsx` (papyrus pattern, fibre filter, gold gradients), `decks/egyptian/suits.tsx` (suit path data, `SuitShape`), `decks/egyptian/pips.tsx` (pip layouts 2-10), `decks/egyptian/frame.tsx` (stock, double gold border, frieze bands, corner indices), `decks/egyptian/back.tsx`, `decks/egyptian/deck.css`, `packages/client/src/egyptian/CardView.tsx`, `packages/client/src/egyptian/DeckGallery.tsx`, `packages/client/src/egyptian/EgyptianApp.tsx`, `packages/client/src/egyptian/egw.css`
- Modify: `packages/client/src/App.tsx` (`case 'egyptian'`), `packages/client/package.json` (`@fontsource/cinzel`)
- Test: `packages/client/src/egyptian/decks/deck.test.tsx`

**Interfaces:**
- Produces: `DeckSkin` exactly as SPEC §7; `DECKS: Record<string, DeckSkin>`; `DECK: DeckSkin`; `PIP_LAYOUT: Record<2|...|10, [x: number, y: number, flipped: boolean][]>` (viewBox 250×350); `<CardView card?: Card; back?: boolean; size?: number; className?; testid? />` (renders `data-card={card}` on faces); `EgyptianApp` routes per SPEC §1 (stubs for screens built in later tasks; `/egyptian/deck` -> `DeckGallery`); the gallery has `data-testid="egw-deck-gallery"` and 53 `egw-gallery-card` items. Aces and courts render a placeholder centre (large suit) until Tasks 8-9.

- [x] **Step 1: Write failing tests** (render to static markup with `react-dom/server`): every card 0..51 renders a face with both corner indices containing `rankLabel` text; hearts/diamonds use the red index colour token and spades/clubs the black one; for 2..10 the number of pip `<use>`/shape elements in the centre equals the rank; `Back` renders; `PIP_LAYOUT[n].length === n`.
- [x] **Step 2: Run** `npx vitest run packages/client/src/egyptian/decks` — FAIL.
- [x] **Step 3: Implement** stock, frame, indices (Barlow Condensed 700, large), suits, pips with gold inlay, back (lapis, gold diaper, cartouche with two Eyes of Horus rotated 180°), `CardView`, gallery, routes; add `@fontsource/cinzel` (`npm i -w @boboland/client @fontsource/cinzel`).
- [x] **Step 4: Run** tests + `npm run typecheck`; open `/egyptian/deck` in the dev server and screenshot (`run` skill) to check readability at 60 px and 250 px width.
- [x] **Step 5: Commit** `feat(egyptian): deck skin system, card stock, pips, back and gallery`.

### Task 8: Aces and the House of Night and House of the Nile courts

**Files:**
- Create: `decks/egyptian/aces.tsx`, `decks/egyptian/courts/figure.tsx` (shared profile body parts: head, eye, collar, arm, kilt; double-ended mirror wrapper), `decks/egyptian/courts/night.tsx` (K♠ Q♠ J♠), `decks/egyptian/courts/nile.tsx` (K♥ Q♥ J♥)
- Modify: `decks/egyptian/index.tsx`
- Test: `decks/deck.test.tsx` (extend)

**Interfaces:**
- Produces: `ACES: Record<Suit, () => JSX.Element>`; `COURTS: Partial<Record<Suit, Record<11|12|13, () => JSX.Element>>>`; `Face` uses them for ranks 1, 11-13.

- [x] **Step 1: Extend tests:** each Ace and each of the six courts renders an element with `data-art="ace-S"` / `data-art="court-13-S"` etc., and court art is double-ended (contains the mirrored group `data-half="bottom"` with `rotate(180`).
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Draw** the 4 Aces and the 6 courts exactly as SPEC §7 tables describe (crown, regalia, held object, house colours).
- [x] **Step 4: Run** tests; screenshot the gallery and check each figure reads at 120 px width.
- [x] **Step 5: Commit** `feat(egyptian): aces and the Night and Nile court cards`.

### Task 9: House of the Sun and House of the Delta courts

**Files:**
- Create: `decks/egyptian/courts/sun.tsx` (K♦ Q♦ J♦), `decks/egyptian/courts/delta.tsx` (K♣ Q♣ J♣)
- Modify: `decks/egyptian/index.tsx`; test file as Task 8.

- [x] **Step 1: Extend the test** to require all 12 `court-*` arts.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Draw** the 6 courts per SPEC §7.
- [x] **Step 4: Run** tests; screenshot the full gallery: 52 distinct faces, no placeholder left.
- [x] **Step 5: Commit** `feat(egyptian): Sun and Delta court cards`.

### Task 10: Table and game screen (static), legend, pass and play

**Files:**
- Create: `packages/client/src/egyptian/table/Table.tsx` (oval, seats placed by `seatAngle`), `table/Seat.tsx`, `table/Pile.tsx` (top-4 fan, `topBottom` peek, `data-testid="egw-pile"` with `data-cards` = comma list of the pile), `table/Legend.tsx`, `table/Controls.tsx` (Flip/Slap buttons with key labels; local: one pair at each end), `table/Status.tsx` (turn line + `aria-live`), `EgwScreen.tsx`, `EgyptianLocal.tsx`, `useKeys.ts`, `table/table.css`
- Test: `packages/client/src/egyptian/screenLogic.test.ts`, `screenLogic.ts`

**Interfaces:**
- Consumes: Tasks 4, 6, 7.
- Produces: `EgwScreen` props `{ view: EgwView; me: PlayerID | null; mode: 'local'|'online'|'watch'; names: Record<PlayerID,string>; colors: Record<PlayerID,number>; controls: EgwControls[] /* per seat; local = 2 */; chat?; onExit(); onAgain?: { label: string; onClick(): void; waiting?: boolean } }`; `useKeys(mode, handlers)` dispatching via `actionFor`; `screenLogic.ts`: `statusLine(view, names): string` ("Ana plays 7 of hearts", "Ace: Bo has 4 tries", "Bo to flip"), `seatBadges(view, p, now): { turn: boolean; lockedFor: number; spent: boolean; out: boolean; left: boolean; challenged: boolean }`. `EgyptianLocal` builds one `Local()` master and two clients (seeds from `?seed=`), calls `ready` on both, uses `useTimers`, names/rules from `egw.local`.
- Test ids: `egw-table`, `egw-seat-<pid>` (with `data-count`), `egw-flip-<pid>`, `egw-slap-<pid>`, `egw-legend`, `egw-status`, `egw-leave`, `egw-result`.

- [x] **Step 1: Write failing tests** for `statusLine` and `seatBadges` (each badge state from a rigged view).
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** the table and screen without motion (Task 11 adds it), pass-and-play wiring, game-over panel with stats and Rematch.
- [x] **Step 4: Run** tests + typecheck; play a local game by keyboard in the dev server (Q/W, ]/[), including a valid and a false slap.
- [x] **Step 5: Commit** `feat(egyptian): table, pile, legend and pass-and-play`.

### Task 11: Animations

**Files:**
- Create: `packages/client/src/egyptian/anim/` (`useEvents.ts` = new `log` events since last render by `seq`; `Deal.tsx`, `FlipFlight.tsx`, `SlapHand.tsx`, `SlapReveal.tsx`, `Sweep.tsx`, `ChallengeBanner.tsx` with ankh pips, `GraceRing.tsx`, `LockoutRing.tsx`, `SlapInFlash.tsx`, `Victory.tsx`, `anim.css`)
- Modify: `EgwScreen.tsx`, `table/*`
- Test: `packages/client/src/egyptian/anim/useEvents.test.ts`, `revealText.test.ts`

**Interfaces:**
- Produces: `newEvents(prevSeq: number, log: EgwEvent[]): EgwEvent[]`; `revealText(won: Won): { headline: string; lines: string[] }` ("Sandwich · 7 · 2 · 7"; challenge: "Challenge won by Ana · Ace"); all durations read from `FX[effectiveFx()]`, exposed to CSS as `--egw-t-*`.

- [x] **Step 1: Write failing tests** for `newEvents` (gaps, duplicates, log rollover) and `revealText` (single match, two matches with headline first, challenge, slap-in).
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** every animation in SPEC §8; Off renders end states only; reduced motion = Fast.
- [x] **Step 4: Run** tests; watch each animation in the dev server at Full and Fast.
- [x] **Step 5: Commit** `feat(egyptian): animations for every action`.

### Task 12: Menu, local setup, rule checklist, key settings, picker card

**Files:**
- Create: `packages/client/src/egyptian/EgyptianMenu.tsx`, `RulesChecklist.tsx` (mini card example per rule via `CardView`), `KeySettings.tsx` (also opened in game), `Settings.tsx` (keys, animations, `AudioButtons`), `HowTo.tsx`, `menu.css`, `PickerArt.tsx`
- Modify: `packages/client/src/screens/EditionPicker.tsx` (+ its CSS) for `egyptian-card`
- Test: `packages/client/src/egyptian/localSetup.test.ts`, `localSetup.ts`

**Interfaces:**
- Produces: `localSetup.ts`: `interface LocalSetup { names: [string, string]; rules: SlapRuleId[] }`; `loadLocal()`, `saveLocal(s)` (`egw.local`, invalid rules -> `DEFAULT_RULES`); `toggleRule(rules, id): SlapRuleId[]` (never empties). `<RulesChecklist value onChange disabled? />` with `data-testid="egw-rule-<id>"` checkboxes. `<KeySettings mode />` with `egw-bind-<action>` buttons, `egw-keys-reset`, conflict marks `data-conflict`. Menu buttons: `egw-local-start`, `egw-host`, `egw-settings`, `egw-howto`.

- [x] **Step 1: Write failing tests** for `toggleRule` (cannot remove the last rule) and `loadLocal` fallbacks.
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement** the menu, checklist, settings, picker card (fan of K♠ Q♥ J♦ K♣).
- [x] **Step 4: Run** tests; screenshot `/` and `/egyptian`.
- [x] **Step 5: Commit** `feat(egyptian): menu, rule checklist, key settings and picker card`.

### Task 13: Online: waiting room, play, watch, chat, party

**Files:**
- Create: `packages/client/src/egyptian/lobby.ts`, `roomData.ts`, `EgyptianLan.tsx` (`EgwHost`, `EgwWaiting`, `EgwJoin`, `EgwPlay`), `EgyptianWatch.tsx`, `lobby.css`
- Modify: `packages/client/src/lib/partyRules.ts` (+ `FollowInput.hasEgyptianSeat`, callers in `lib/party.ts`/`components/Party.tsx`), `packages/client/src/lib/partyRules.test.ts`
- Test: `packages/client/src/egyptian/roomData.test.ts`

**Interfaces:**
- Produces (`roomData.ts`): `interface EgwSeatData { color?: number; rules?: SlapRuleId[] }`; `parseEgwSeatData(raw)`, `mergeEgwSeatData(current, patch)`, `roomRules(players): SlapRuleId[]` (seat 0's valid rules, else `DEFAULT_RULES`).
- Produces (`lobby.ts`, mirrors `lib/lobby.ts` with `EGYPTIAN_GAME_NAME` and `egw.seat.<id>`): `createRoom(name, rules)`, `joinRoom(matchID, name, playerID?, data?)`, `roomInfo(matchID): Promise<{ seats; rules; nextMatchID? }>`, `setRoomRules(seat, rules)`, `setSeatColor(seat, color)`, `startGame(seat, players, rules): Promise<string>`, `enterGame(roomSeat, seats, nextID)`, `gameInfo(matchID): Promise<{ names; colors; nextMatchID? }>`, `openNextRoom(gameSeat, rules)`, `rejoinRoom(gameSeat, roomID, rules?)`, `savedSeat`, `leaveRoom`, `egwJoinUrl(matchID)`.
- Party: SPEC §5 table; Egyptian paths never carry an edition.

- [x] **Step 1: Write failing tests:** `roomData` parse/merge/roomRules; `partyRules` cases for every Egyptian path in SPEC §5 (seated / not seated / mid-hand-over).
- [x] **Step 2: Run** `npx vitest run packages/client/src/egyptian/roomData.test.ts packages/client/src/lib/partyRules.test.ts` — FAIL.
- [x] **Step 3: Implement** lobby, waiting room (seats, colours, host-only rule checklist shown read-only to others, invite link + QR, Start when 2+), play screen (SocketIO client, chat, reconnect notice, Leave confirm calling `leave`, Play again for the host -> next room, everyone follows), watch screen, party rules.
- [x] **Step 4: Run** tests + typecheck; play a 3-window online game on the dev server.
- [x] **Step 5: Commit** `feat(egyptian): waiting room, online play, spectators, chat and party`.

### Task 14: Sound and music

**Files:**
- Create: `packages/client/src/egyptian/sound.ts`, `sound.test.ts`, `packages/client/src/lib/songEgyptian.ts`, `songEgyptian.test.ts`
- Modify: `packages/client/src/lib/music.ts` (track `'egyptian'` for `/egyptian` paths, own bus, like Fleet), `EgwScreen.tsx`/anim components (play sounds on events)

**Interfaces:**
- Produces: `createEgwSfx(env: SfxEnv)` returning `{ flip; slap; validSlap; falseSlap; challenge; tryUsed; graceTick; collect; win }`; `egwSound` live instance; `buildSongEgyptian()`, `createEgyptianVoices(...)`, `BPM_EGYPTIAN`, `BEATS_PER_BAR_EGYPTIAN`, `SECTIONS_EGYPTIAN`, `VOLUME_EGYPTIAN` mirroring `songFleet.ts`.

- [x] **Step 1: Write failing tests** copied in shape from `fleet/sound.test.ts` (every sfx schedules nodes and respects volume 0) and `lib/songFleet.test.ts` (deterministic, sorted, fills bars; offline rms 0.022-0.033, peak < 0.5, even bars).
- [x] **Step 2: Run** — FAIL.
- [x] **Step 3: Implement**; tune `VOLUME_EGYPTIAN` until the render test passes.
- [x] **Step 4: Run** tests; listen in the dev server.
- [x] **Step 5: Commit** `feat(egyptian): sound effects and theme song`.

### Task 15: e2e

**Files:**
- Create: `e2e/egyptian.spec.ts`
- Modify: `e2e/helpers.ts` if a shared helper is needed

- [x] **Step 1: Write the spec** (every page sets `localStorage['egw.e2e'] = '1'`): picker `egyptian-card` -> `/egyptian`; local game with `?seed=` by keyboard: flip with Q and ], read `egw-pile[data-cards]`, press W on a double/sandwich (valid: `egw-seat-0[data-count]` grows) and W on a non-match (false: count drops by 1, lockout marker shown); rule checklist: enable only Slapjack, start, slap on a non-Jack double = false slap; 3 windows: host, two `/egyptian/join/:id`, colours, Start, all three see the same pile after flips with F, one slap with Space; a spectator page sees the pile and no Flip/Slap buttons; rebind P1 slap to `KeyE` in settings, then E slaps in game and W does nothing.
- [x] **Step 2: Run** `npm run build && npx playwright test e2e/egyptian.spec.ts` — PASS.
- [x] **Step 3: Commit** `test(egyptian): e2e`.

### Task 16: Docs and final verification

**Files:**
- Modify: `CLAUDE.md` (an **Egyptian War** section in the style of Frontline / Fleet: rules, hidden-information rule, routes, deck system, timings, tests); `docs/egyptian/PLAN.md` (ticks)

- [x] **Step 1:** Write the CLAUDE.md section.
- [x] **Step 2:** `npm run typecheck`, `npm test`, `npm run e2e` — all PASS (superpowers:verification-before-completion).
- [x] **Step 3:** Play one local and one online game in the built app; check `/egyptian/deck` shows 52 faces.
- [x] **Step 4: Commit** `docs(egyptian): CLAUDE.md section`.
