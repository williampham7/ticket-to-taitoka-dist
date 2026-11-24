# Build prompt: Egyptian War

Paste everything below the line into a new Claude Code chat opened in this repo.

---

Build **Egyptian War** in this repo: a real-time card-slapping game for 2–5 players. Like Frontline and Fleet, it is a separate game on the same server, lobby, party, chat relay and audio system. It is not an edition. The owner has already confirmed the rules, modes, controls and look below. Treat them as decided and don't reopen them. Ask the owner only about something this prompt leaves open whose answer would change what gets built. Settle everything else yourself and record your calls in the spec.

## 0. Read first

- `CLAUDE.md`, all of it, especially the Frontline and Fleet sections. They are the reference implementations for a separate game.
- `packages/shared/src/frontline/game.ts`: `claimTimeout` checks time on the server clock. Egyptian War's timers work the same way.
- `packages/shared/src/fleet/` (`game.ts`, `view.ts`) and `packages/client/src/fleet/` (`FleetApp`, `FleetMenu`, `FleetLocal`, `FleetLan`, `FleetWatch`, `fx.ts`, `controls.ts`, `sound.ts`, `lib/songFleet.ts`).
- The main game's 5-seat waiting room: `screens/Lan.tsx`, `lib/lobby.ts`, `lib/lobbyRules.ts`, `lib/seatData.ts`. Egyptian War needs a waiting room for 2–5 players, which Frontline and Fleet (fixed 2 seats) don't have.
- `screens/EditionPicker.tsx`: the `frontline-card` / `fleet-card` buttons. `lib/partyRules.ts` (`followTarget`, `twoSeat`). `packages/server/src/serve.ts` (game registration). `App.tsx` (routing).

Then write `docs/egyptian/SPEC.md` (this prompt made precise, plus your calls) and `docs/egyptian/PLAN.md` (build checklist), the same way `docs/fleet/` has them. Use superpowers:writing-plans, superpowers:test-driven-development and superpowers:subagent-driven-development. Work on a branch, not `main`.

## 1. Names and layout

- In-game name: **Egyptian War**. Game name `egyptian`. Shared rules: `packages/shared/src/egyptian/`. Client: `packages/client/src/egyptian/`. CSS prefix `egw-`. Never use the class name `hidden`.
- Routes:
  - `/egyptian` (menu)
  - `/egyptian/local` (pass and play)
  - `/egyptian/host`
  - `/egyptian/wait/:id`
  - `/egyptian/join/:id`
  - `/egyptian/play/:id`
  - `/egyptian/watch/:id`
- The `/` picker gets an `egyptian-card` next to the Frontline and Fleet cards. Its art comes from the Egyptian deck (a fanned hand of court cards).
- Register `EgyptianGame` in `serve.ts` (honour `SEED` the way the other games do). Add a `case 'egyptian'` to `App.tsx`.

## 2. Rules (confirmed)

### Deal and seating
- One 52-card deck with no jokers.
- `setup` uses boardgame.io's seeded random to shuffle the deck, then shuffles the seats into a **random deal order**, then picks a **random starting player** separately.
- Cards are dealt one at a time around the deal order, face down. With an uneven split, the first seats in deal order get one extra card (3 players: 18/17/17; 5 players: 11/11/10/10/10).
- **Nobody sees any stack, including their own.**
- Once the order is set, seat players around the table so that play goes **clockwise** in that order: on every screen, the next player sits to your left.

### Playing cards
- On your turn, flip the top card of your stack face up onto the centre pile. The turn then passes clockwise to the next player who has cards.
- A **round** runs from an empty pile until someone collects it.

### Face-card challenge
- Playing J, Q, K or A challenges the next player who has cards. They get J = 1, Q = 2, K = 3, A = 4 tries.
- If they flip a J/Q/K/A within their tries, the challenge passes on with that card's count.
- If their tries run out, the challenger wins the pile.
- If the challenged player runs out of cards mid-challenge, their remaining tries pass to the next player who has cards. If that player is the challenger, the challenger wins the pile.
- **1-second grace:** after the card that ends a challenge, wait **1000 ms** before the challenger collects, so players can still slap that last card. The same grace applies when a player who is the only one with cards plays a face card and nobody can answer.
- A valid slap during the grace window, or at any point in a challenge, wins the pile and ends the challenge.

### Slapping
- Anyone can slap at any moment, on any player's turn. The **first valid slap wins the whole pile** (in pass and play, the first keydown; online, the first slap to reach the server).
- The winner of a pile, by slap or by challenge, leads the next round.

### False slaps
- **Penalty:** burn **1 card** from the top of the slapper's stack, face down, under the pile. Burned cards go to whoever wins the pile. They never count toward a slap pattern and are never revealed to anyone.
- **Lockout:** for **1000 ms** after a false slap, that player's slaps are ignored, and their seat shows a cooldown ring.
  - The owner asked whether a delay after a false slap is a good idea. It is, for that player only. Without it, someone can spam the slap key and just pay burns. A pause for everyone would let one player stall the game.
  - The locked-out player can still flip if it's their turn.

### Out of cards
- A player with no cards leaves the turn order but is not eliminated.
- They get **one slap-in attempt per round**.
  - A valid slap-in wins the pile and puts them back in the turn order. They lead the next round.
  - A false slap-in burns nothing (they have no cards) and uses up their attempt for that round. Their seat shows a spent marker until the round ends.

### Game end
- A player wins when they hold all 52 cards after collecting a pile.

### Slap timing online
- A slap is judged on the server.
- **Minimum flip gap:** cards can't be flipped faster than a minimum gap (start around 400 ms). This stops a fast flipper from burying a slappable card before others have seen it.
- **Latency tolerance:** a slap also counts if the pattern was on the pile just before a flip that happened within the last ~200 ms.
- All tunable values go in one timing table (like Fleet's `fx.ts`).

## 3. Slap patterns: a selectable catalogue

Define the slap rules as **data**: one catalogue entry per rule with id, name, one-line description, an example and a pure detector. The detector takes the round's played cards (burns excluded, top = last) and returns the indices of the matching cards, which drive the win animation. Ranks: A = 1, J = 11, Q = 12, K = 13. "Top two" means the last two played.

| id | Name | Matches when | Default |
|---|---|---|---|
| `double` | Double | the top two cards have the same rank | **on** |
| `sandwich` | Sandwich | the top card and the third from top have the same rank | **on** |
| `staircase` | Staircase | the top three run consecutively up or down (5-6-7, 7-6-5). Ace is low (A-2-3) or high (Q-K-A). **No wrapping**: K-A-2 doesn't count | off |
| `marriage` | King & Queen | the top two are a K and a Q, either order | off |
| `divorce` | Divorce | a K and a Q with one card between them | off |
| `topBottom` | Top & Bottom | the top card has the same rank as the round's first card (pile of 3+) | off |
| `tens` | Tens | the top two number cards add up to 10 (Ace = 1; J/Q/K never count) | off |
| `tenSandwich` | Ten Sandwich | the top card and the third from top add up to 10 (same counting) | off |
| `sixNine` | Six-Nine | the top two are a 6 and a 9, either order | off |
| `thirteen` | Thirteen | the top two add up to 13 (A = 1 … K = 13) | off |
| `slapjack` | Slapjack | the top card is any Jack | off |
| `lucky7` | Lucky Seven | the top card is any 7 | off |
| `suitRun` | Three of a Suit | the top three are the same suit | off |
| `court` | Royal Court | the top three are all J/Q/K | off |

- **Who chooses:** the host picks rules in the waiting room, and the pass-and-play players pick them in local setup. The choice is a checklist with a mini card example for each rule. Everyone sees the host's choice live. At least one rule must stay selected. The chosen set goes into `setupData` and `G`, and rematches keep it.
- **During play:** the active rules are always shown in a compact legend next to the table.
- **Several matches at once:** if a slap matches more than one rule, show them all. The first one in catalogue order is the headline.

## 4. Modes and controls

- **Pass and play: exactly 2 players on one keyboard.** There's no privacy curtain, because nobody's cards are secret. Player 1 sits on the left of the screen, player 2 on the right, matching their keys.
  - Player 1: **Q** = flip, **W** = slap.
  - Player 2: **]** = flip, **[** = slap.
  - There are also big touch buttons at each player's end of the screen for tablets.
- **Online / LAN: 2–5 players**, through a 5-seat waiting room.
  - The host starts with however many have joined, at least 2. Start calls `playAgain` with that count and `setupData` holding the rules, the same way the main game does.
  - **F** = flip, **Space** = slap, plus on-screen Flip and Slap buttons (phones on the LAN).
  - Spectators use `/egyptian/watch/:id`.
- **No computer opponent** in any mode. You still need a scripted random player for the fuzz tests.
- **Party:** members follow the host into the waiting room and take seats in order (up to 5). Add `egyptian` to `partyRules.ts` with tests.
- **Chat:** the boardgame.io chat relay, read through `readChat()`, as in the other games.
- **Key bindings** are customisable in both modes:
  - The settings panel opens from the menu and from in game.
  - Click a binding, then press a new key. Conflicting bindings are flagged. There's a reset to defaults.
  - Bindings are saved per device through `lib/storage.ts`.
  - Ignore `e.repeat`. Stop Space from scrolling the page. Never capture keys while the chat input has focus.
  - Every on-screen button shows its current key.

## 5. Look: the cards carry the theme

**The cards are the most themed element.** The table, chrome and menus are a high-quality but **deck-neutral** setting, so other decks can be dropped in later.

- **Deck system.** Build a `DeckSkin` interface in `packages/client/src/egyptian/decks/`. A skin supplies:
  - a face renderer for all 52 cards (rank × suit)
  - the card back
  - accent tokens (`--deck-*` CSS variables) that the table picks up lightly
  - optionally its own song and sound accents

  The table and game code never reference Egyptian art directly. Ship one skin, `egyptian`, and keep the deck choice in the code so adding a second deck is a new folder, not a refactor.
- **Neutral table.**
  - A dark, rich surface with soft vignette lighting and an oval table edge.
  - Seats around the oval, each showing the player's name, colour, a face-down stack with a live card count, a turn glow, and lockout / spent / out markers.
  - Each client sees its own seat at the bottom.
- **The Egyptian deck: high detail, all inline SVG React components, no raster images.**
  - **Readability first.** It must be obvious at a glance which card was just played:
    - large, high-contrast corner indices (rank + suit, top-left and rotated bottom-right)
    - classic **red hearts and diamonds, black spades and clubs**, so suits read instantly
    - suit shapes kept clearly recognisable
    - real pip layouts on 2–10, so the count can be read
  - **Card stock:** papyrus-toned with a fine fibre texture (SVG pattern or filter), a gold double border and a narrow frieze band (lotus / papyrus).
  - **Four suits as four houses.** Each house has a motif that runs through its court cards and its Ace, with gold inlay on the pips:
    - ♠ House of Night (jackal, stars)
    - ♥ House of the Nile (lotus, ibis)
    - ♦ House of the Sun (sun disc, falcon)
    - ♣ House of the Delta (papyrus, scarab)
  - **12 distinct court cards:**
    - King = pharaoh, Queen = queen, Jack = guardian or scribe.
    - Each is drawn in Egyptian profile style, double-ended like real court cards.
    - Each house's figures differ by crown, regalia and held object.
    - List the 12 designs in the spec before drawing them.
  - **4 ornate Aces:** the suit shape stays dominant and is wrapped in the house emblem.
  - **Card back:** lapis field, a gold Eye of Horus in a cartouche, rotationally symmetric.
  - Every one of the 52 faces must render correctly. Add a QA gallery route, `/egyptian/deck`, that shows all 52 cards plus the back, like Fleet's `/fleet/scenes`.
- **Everything else** gets themed, polished styling to match (menu, waiting room, rule checklist, key settings, results screen): no placeholder or default-looking UI. Pick a display font for headings and a highly legible face for card indices.
- Light/dark: follow how the other separate games handle it.

## 6. Animation: always clear what is happening

Every action gets a distinct, readable animation. All timings go in one table (`fx.ts`), there's an Animations Full / Fast / Off setting, and `prefers-reduced-motion` is respected.

- **Deal** at game start: cards fly round the table in deal order, then the starting player is highlighted.
- **Flip:** the card leaves the player's stack, turns over mid-flight (3D), and lands on the pile slightly rotated. The new card briefly lands enlarged.
- **Pile view:** the top 3–4 cards are fanned so doubles, sandwiches and staircases are visible. When `topBottom` is on, the round's first card peeks out from underneath.
- **Turn:** a clear arrow / glow on the player to act. Use an `aria-live` line for screen readers: "Ana plays 7 of hearts".
- **Challenge:**
  - a banner names the challenge ("Ace: Bo has 4 tries")
  - one ankh pip per try, each going out as it's used
  - the challenged seat pulses
- **Grace window:** a 1-second ring drains around the pile before the challenger collects.
- **Valid slap: shows which rule won.**
  1. A hand slams the pile from the slapper's seat.
  2. The matching cards lift out and line up enlarged, with a ribbon naming the rule and the cards ("Sandwich · 7 · 2 · 7"). Multiple matches are all listed.
  3. The pile sweeps into the winner's stack.

  Input and flips pause on the server (`G.pauseUntil`) for the length of this.
- **Challenge win:** a ribbon ("Challenge won by Ana · Ace") and the pile sweeps to her.
- **False slap:** the hand slams with a red crack, a card flies face down from the slapper's stack under the pile, and the lockout ring starts.
- **Slap-in:** a distinct gold flash when an out player wins back in. A spent marker when a slap-in fails.
- **Game end:** the winner's stack grows to 52 and a victory scene plays. Show stats: slaps won, false slaps, challenges won, longest stack.

**Audio:** sounds for flip, slap, valid slap, false slap, challenge start, each try, grace tick, collect and win. Add a theme song in the `lib/song*.ts` pattern, levelled by an offline-render test (`lib/offlineAudio.testutil.ts`). Volume and mute through `lib/music.ts` / `AudioButtons`.

## 7. Engine rules (non-negotiable)

- **Pure rules** in `packages/shared/src/egyptian/`:
  - `cards.ts`
  - `slapRules.ts` (the catalogue)
  - `rules.ts`: pure functions that take an explicit `now` so tests control the clock
  - `view.ts`: the only filter for hidden information
  - `game.ts`
- **Real time in boardgame.io:** all seats can act at any moment (`activePlayers` for everyone). `flip` checks that it is the player's turn and that the minimum flip gap has passed.
- **Timed events:** boardgame.io has no server timers. Timed events (grace collect, end of a slap pause) are moves any client may call; the server checks its own clock (`Date.now()`, as in Frontline's `claimTimeout`) and accepts the first valid call. Clients call them when their local countdown ends.
- **Every move is `client: false`.**
- **Hidden information:** `G` holds every card. `playerView` shows only stack **counts**, the face-up pile, a burned-card count, and the timers / markers. It never shows any stack order, the burned cards, or the deck order, even to the stack's owner.
- **Invariants checked in tests:**
  - 52 cards in every state
  - there is always a legal action or a pending timed event, so no soft-locks

## 8. Tests

TDD for the rules: write failing tests first.

- **Slap catalogue:** positive and negative cases for every rule. Include:
  - staircase Q-K-A and A-2-3 valid, K-A-2 invalid
  - tens ignores face cards
  - burns never count
  - several rules matching at once
- **Rules:**
  - deal sizes for 2–5 players
  - deal order separate from starting player
  - clockwise play skipping empty stacks
  - challenge tries and passing on
  - challenged player running out of cards mid-challenge
  - 1 s grace, with a slap during the grace window
  - false-slap burn and 1 s lockout
  - one slap-in per round; it resets when the round ends
  - minimum flip gap and latency tolerance
  - win at 52 cards
- **View:** no leaks through `playerView`. Also run a `Local()` test like Fleet's no-leak test, including reconnect.
- **Fuzz:** 500 games for each player count 2–5. Scripted random players flip and slap at random times. Check no soft-lock and 52-card conservation. Cap moves per game and report games that hit the cap rather than failing on them (unforced ERS games can cycle).
- **Client logic:** key bindings (rebind, conflicts, persistence) and the party rules.
- **e2e:** `e2e/egyptian.spec.ts`, run after `npm run build`, with an e2e flag that shortens the fx timings:
  - picker card → menu
  - local game played by keyboard (both players' keys) with a valid and a false slap
  - rule checklist changes behaviour
  - a 3-window online game through the waiting room
  - a spectator
  - rebinding a key

## 9. Done means

- `npm run typecheck`, `npm test` and `npm run e2e` all pass.
- The deck gallery shows all 52 faces.
- You played a local game and an online game yourself (superpowers:verification-before-completion).
- `CLAUDE.md` has an **Egyptian War** section in the style of the Frontline / Fleet sections: rules, hidden-information rule, routes, deck system, timings, tests.
- Commits are small and on a branch.

## Out of scope

- Computer opponents
- More than 52 cards or jokers
- Ranking / XP
- Replays
- A second deck (but the `DeckSkin` design must make one easy)
