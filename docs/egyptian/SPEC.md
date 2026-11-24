# Egyptian War: design spec

The build prompt (`docs/egyptian/PROMPT.md`) is the owner's confirmed brief. This spec makes it precise and records every call the prompt left open (section **Decisions**). The build checklist is `docs/egyptian/PLAN.md`.

Egyptian War is a real-time card-slapping game for 2 to 5 players. It is a separate game on the same server, lobby, party, chat relay and audio system, like Frontline and Fleet. It is not an edition.

## 1. Names and layout

| Thing | Value |
|---|---|
| In-game name | Egyptian War |
| boardgame.io game name | `egyptian` (`EGYPTIAN_GAME_NAME`) |
| Shared rules | `packages/shared/src/egyptian/` (`cards.ts`, `slapRules.ts`, `timing.ts`, `rules.ts`, `view.ts`, `game.ts`, `index.ts`) |
| Client | `packages/client/src/egyptian/` |
| CSS prefix | `egw-` (never the class name `hidden`) |
| Storage keys | `egw.keys`, `egw.fx`, `egw.local`, `egw.seat.<matchID>`, `egw.e2e` (test flag) |
| Picker card | `egyptian-card` on `/`, next to `frontline-card` and `fleet-card`; art = a fanned hand of four court cards drawn by the Egyptian deck |

Routes:

| Route | Screen |
|---|---|
| `/egyptian` | menu (pass-and-play setup, host online, how to play, settings) |
| `/egyptian/local` | pass and play, 2 players on one keyboard |
| `/egyptian/host` | creates a 5-seat waiting room, then goes to `/egyptian/wait/:id` |
| `/egyptian/wait/:id` | the waiting room |
| `/egyptian/join/:id` | takes the first free waiting-room seat, then goes to `/egyptian/wait/:id` |
| `/egyptian/play/:id` | a seated player in a running game |
| `/egyptian/watch/:id` | a spectator (no playerID) |
| `/egyptian/deck` | QA gallery: all 52 faces plus the back |

`EgyptianGame` is registered in `packages/server/src/serve.ts` next to Fleet, with `SEED` honoured the same way. `App.tsx` gets `case 'egyptian': return <EgyptianApp />`.

## 2. Rules

### Cards
- One 52-card deck, no jokers. A card is a number `0..51`: suit = `SUITS[floor(c / 13)]` with `SUITS = ['S','H','D','C']`, rank = `c % 13 + 1` (A = 1, J = 11, Q = 12, K = 13).
- Challenge cards: J = 1 try, Q = 2, K = 3, A = 4.

### Deal and seating
- `setup` (boardgame.io seeded random): 1) shuffle the deck, 2) shuffle the seat ids into the **deal order** `G.players`, 3) pick the **starting player** with a separate die roll. Deal order and starting player are independent.
- Deal one card at a time around the deal order. Uneven splits give the extra cards to the first seats in deal order (3 players 18/17/17; 5 players 11/11/10/10/10).
- Nobody sees any stack, including their own.
- `G.players` is also the clockwise order of play. On every screen the viewer sits at the bottom and the next player in `G.players` sits to their left (clockwise on screen: bottom, left, top, right). Spectators see `G.players[0]` at the bottom. Pass and play is the exception: seat `0` (Player 1) sits on the left of the screen and seat `1` (Player 2) on the right, to match their keys.

### Flipping and rounds
- On your turn, flip the top card of your stack face up onto the pile. The turn passes clockwise to the next player who has cards (you again if you are the only one).
- A **round** runs from an empty pile until someone collects it. `G.round` counts rounds from 1.
- **Minimum flip gap:** a flip is refused until `minFlipGapMs` (400) after the previous flip by anyone.

### Face-card challenge
- Playing J/Q/K/A starts a challenge against the next player clockwise who has cards (never the challenger). They get that card's tries.
- Each non-face card they flip uses one try. A J/Q/K/A within their tries starts a new challenge from them.
- Tries used up: the challenger wins the pile after the grace window.
- The challenged player runs out of cards mid-challenge (by flipping or by a false-slap burn): their remaining tries pass to the next player clockwise who has cards. If that is the challenger, or nobody, the challenger wins the pile after the grace window.
- If the face-card player is the only one with cards, nobody can answer: they win after the grace window.
- **Grace window:** `graceMs` (1000) after the card that decides it, before the challenge winner collects. Nobody flips during it. Slaps still count, and a valid slap wins the pile instead.

### Slapping
- Anyone with a seat can slap at any moment of play. A slap is judged on the pile the server holds when it arrives; the first valid slap wins (pass and play: the first keydown).
- A valid slap wins the whole pile (and the burned cards) and ends any challenge. The winner leads the next round.
- **Latency tolerance:** if the pile matches no active rule but the last flip happened at most `latencyMs` (200) ago, the slap is judged again on the pile without that last card.
- A slap carries the round number the slapper saw. A slap for an earlier round (the pile was already won) is ignored, with no penalty. Slaps that arrive while a won pile is being shown are also ignored, with no penalty.

### False slaps
- A slapper who holds cards burns 1 card: the top of their stack goes face down under the pile (`G.burned`). Burned cards go to whoever wins the pile. They never count toward a pattern and are never revealed, even after the game.
- **Lockout:** for `lockoutMs` (1000) after a false slap, that player's slaps are ignored (no further penalty), and their seat shows a draining cooldown ring. They can still flip.

### Out of cards
- A player with no cards leaves the turn order but is not eliminated.
- They get **one slap-in attempt per round**. A valid slap-in wins the pile, puts them back in the turn order, and they lead the next round. A false slap-in burns nothing and spends the attempt; their seat shows a spent marker until the round ends.

### Collecting and winning
- Collecting puts the cards under the winner's stack: first the burned cards, then the pile in the order played.
- A player wins when they hold all 52 cards after collecting.

### Timed events
boardgame.io has no server timers. Each timed event is resolved by the `tick` move, which any seated client may call. The server checks its own clock and applies whatever is due; an early or duplicate tick is refused. Clients call `tick` when their local countdown ends and retry every 150 ms until the state changes. Timed events:
1. **Start:** the game starts (stage `dealing`) when every seat has called `ready`, or `readyWaitMs` (8000) after the first `ready`.
2. **Deal over:** play begins `dealMs` after the deal starts.
3. **Grace over:** the challenge winner's pile goes on show (`G.won`) for `challengePauseMs`.
4. **Collect:** after a valid slap (`slapPauseMs`) or a won challenge (`challengePauseMs`), the pile goes to the winner.
5. **Idle auto-flip:** if the player to flip has not flipped for `idleFlipMs` (15000), the server flips for them.

### Leaving
- `leave` (in-page confirm): the player's cards go under the pile as burned cards, they are out for good (no slap-ins, skipped in all turn passing), and their seat shows "Left".
- If only one player who has not left remains, they win.
- If the pile's winner leaves before collecting, the pile goes to the next player clockwise who has not left.

### No soft-locks
In play, either `G.turn` names a player who holds cards, or `G.timer` holds a pending event. If nobody holds cards and no event is pending, the pile goes, after the grace window, to: the challenger if a challenge is on, else whoever played the top card, else the round's leader.

## 3. Timing table (`packages/shared/src/egyptian/timing.ts`)

| Key | Normal | Quick (e2e) | Kind |
|---|---|---|---|
| `minFlipGapMs` | 400 | 400 | rule |
| `latencyMs` | 200 | 200 | rule |
| `graceMs` | 1000 | 1000 | rule |
| `lockoutMs` | 1000 | 1000 | rule |
| `idleFlipMs` | 15000 | 15000 | rule |
| `readyWaitMs` | 8000 | 8000 | start |
| `dealMs` | 2600 | 200 | pause (deal animation) |
| `slapPauseMs` | 2400 | 300 | pause (slap reveal + sweep) |
| `challengePauseMs` | 1800 | 300 | pause (challenge ribbon + sweep) |

`G.timing` is set in `setup`: `QUICK_TIMING` when setupData has `quick: true`, else `TIMING`. The client's animation table (`packages/client/src/egyptian/fx.ts`) must fit inside the pauses; a test checks it.

## 4. Slap rule catalogue (`slapRules.ts`)

Each entry: `{ id, name, description, example: Card[], detect(pile): number[] | null }`. `detect` takes the round's played cards (burns are never in it, top = last) and returns the indices of the matching cards, or null. `matchSlap(pile, rules)` returns every match among the active rules in catalogue order; the first is the headline.

| id | Name | Matches when | Indices | Default |
|---|---|---|---|---|
| `double` | Double | top two have the same rank | n-2, n-1 | on |
| `sandwich` | Sandwich | top and third-from-top have the same rank | n-3, n-1 | on |
| `staircase` | Staircase | top three run consecutively up or down; Ace low (A-2-3) or high (Q-K-A); no wrap (K-A-2 fails) | n-3..n-1 | off |
| `marriage` | King & Queen | top two are a K and a Q, either order | n-2, n-1 | off |
| `divorce` | Divorce | a K and a Q with one card between them | n-3, n-1 | off |
| `topBottom` | Top & Bottom | top has the same rank as the round's first card, pile of 3+ | 0, n-1 | off |
| `tens` | Tens | top two are both A-10 (A = 1) and add up to 10 | n-2, n-1 | off |
| `tenSandwich` | Ten Sandwich | top and third-from-top, both A-10, add up to 10 | n-3, n-1 | off |
| `sixNine` | Six-Nine | top two are a 6 and a 9, either order | n-2, n-1 | off |
| `thirteen` | Thirteen | top two add up to 13 (A = 1 ... K = 13) | n-2, n-1 | off |
| `slapjack` | Slapjack | top is a Jack | n-1 | off |
| `lucky7` | Lucky Seven | top is a 7 | n-1 | off |
| `suitRun` | Three of a Suit | top three share a suit | n-3..n-1 | off |
| `court` | Royal Court | top three are all J/Q/K | n-3..n-1 | off |

The rule set is chosen by the host in the waiting room (seat 0's `data.rules`, polled live by every screen) and by the players in pass-and-play setup. It is a checklist with a mini card example per rule; at least one rule stays selected. It goes into `setupData.rules` and `G.rules`; rematches keep it. During play, the active rules are always listed in a compact legend.

## 5. Modes and controls

| Mode | Players | Keys (default) | Notes |
|---|---|---|---|
| Pass and play (`/egyptian/local`) | exactly 2 | P1 (left): **Q** flip, **W** slap. P2 (right): **]** flip, **[** slap | no curtain; big touch buttons at each player's end; `?seed=` makes the deal deterministic |
| Online / LAN | 2-5 | **F** flip, **Space** slap | 5-seat waiting room; on-screen Flip and Slap buttons; spectators via `/egyptian/watch/:id` |

- No computer opponent. The fuzz test has a scripted random player.
- **Waiting room:** a 5-seat `egyptian` match created with setupData `{ waiting: true }` (its G has stage `waiting` and accepts no moves). Joiners pick a colour (seat `data.color`). The host picks the rules (seat 0 `data.rules`). Start (at least 2 joined) calls `playAgain` with the joined count and `setupData: { rules }`; every room screen sees `nextMatchID` and joins the new match at `gameSeatOf` (shared `lobbyRules.ts`). After a game, the host's Play again opens the next waiting room (`playAgain` with 5 seats and `{ waiting: true }`); everyone rejoins it with their game seat number, and the host carries the rules over.
- **Party:** members follow the host into the waiting room and take free seats (party max 5 = seat count). `partyRules.ts`: `/egyptian` -> `/egyptian`; `/egyptian/local` -> hold; `/egyptian/wait/:id` -> `/egyptian/wait/:id` if seated, else `/egyptian/join/:id` (stay put while already in that game); `/egyptian/play/:id` -> play if seated, else watch (stay put while still in the waiting room); `/egyptian/watch/:id` -> watch; `/egyptian/host`, `/egyptian/join`, `/egyptian/deck` -> stay. Egyptian War has no edition.
- **Chat:** online only, boardgame.io's relay through `readChat()`, as in Fleet.
- **Key bindings** (`egyptian/keys.ts`): bound by `KeyboardEvent.code`. Settings panel from the menu and in game: click a binding, press a key (Escape cancels); conflicting bindings in the same mode are flagged; Reset to defaults. Saved per device in `egw.keys` through `lib/storage.ts`. Ignore `e.repeat`; `preventDefault` on bound keys (Space never scrolls); never capture while focus is in an input, textarea, select or contenteditable (the chat box). Every on-screen button shows its key.

## 6. Hidden information

`G` holds every card. `playerView` (`viewFor`) is the only filter, and gives everyone (players and spectators, during and after the game) the same view:
- stack **counts** only (`counts`), never stack contents or order, even the owner's;
- the face-up pile, the won-pile snapshot (`won.pile`), and a burned-card **count** only;
- timers, lockouts, slap-in markers, stats, log.
Log events never carry a burned card. All moves are `client: false` and `ignoreStaleStateID: true` (real time: a slap must not be refused because another update landed first; every move re-checks its own preconditions). No move takes secret arguments, so none needs `redact`. The seeded random's state never reaches a client (tested as in Fleet).

## 7. Deck system and look

### DeckSkin (`packages/client/src/egyptian/decks/`)
```ts
interface DeckSkin {
  id: string; name: string;
  Face: (p: { card: Card }) => JSX.Element;   // full face, viewBox 0 0 250 350
  Back: () => JSX.Element;                    // same viewBox
  Defs?: () => JSX.Element;                   // shared <defs>, mounted once by EgyptianApp
  accent: Record<`--deck-${string}`, string>; // tokens the table picks up lightly
  music?: 'egyptian';                         // music.ts track id
  sfx?: Partial<SfxAccents>;
}
```
`decks/index.ts` exports `DECKS` and `DECK` (the active skin, `egyptian`). Table and game code only use `<CardView card | back>` from `egyptian/CardView.tsx`, which reads `DECK`. A second deck is a new folder plus one line in `DECKS`.

### Neutral table
Dark, rich felt-like surface with a soft vignette and an oval table edge (deck-neutral; picks up `--deck-accent` lightly). Seats around the oval: name, colour, face-down stack with a live count, turn glow, lockout ring, spent marker, Out / Left badges. The viewer's seat is at the bottom. Dark only, like Frontline and Fleet. Fonts: **Cinzel** (new `@fontsource/cinzel`) for headings; **Barlow Condensed** 700 for card indices; **Inter** for UI text.

### The Egyptian deck (inline SVG only)
- **Readability first:** large high-contrast corner indices (rank + suit, top-left, rotated bottom-right); red hearts and diamonds, black spades and clubs; standard suit shapes; real pip layouts for 2-10.
- **Card stock:** papyrus tone with a fine fibre texture (SVG turbulence filter on a pattern), gold double border, a narrow lotus / papyrus frieze band at the top and bottom.
- **Four houses:** motifs run through each house's court cards and Ace; pips carry a thin gold inlay.

| Suit | House | Motifs | Accent |
|---|---|---|---|
| ♠ | House of Night | jackal, stars | lapis / night blue |
| ♥ | House of the Nile | lotus, ibis | Nile turquoise, lotus pink |
| ♦ | House of the Sun | sun disc, falcon | carnelian, gold |
| ♣ | House of the Delta | papyrus, scarab | malachite green, ochre |

**The 12 court cards** (Egyptian profile style, double-ended: the top half is mirrored by 180° rotation, split by a diagonal frieze):

| Card | Figure | Crown / headdress | Regalia | Held object |
|---|---|---|---|---|
| K♠ | Pharaoh of Night | blue war crown (khepresh) with a gold star band | broad collar of lapis and star beads | was-sceptre topped with a jackal head |
| Q♠ | Queen of the Night Sky | star circlet with two tall plumes | star-studded shawl | sistrum |
| J♠ | Jackal Guardian | jackal mask helmet | leather cuirass, star-marked shield | khopesh sword |
| K♥ | Pharaoh of the Nile | white crown (hedjet) with uraeus | lotus-pattern collar | crook and flail, crossed |
| Q♥ | Queen of the Nile | circlet of rising blue lotus flowers | wave-pattern pleated gown | open lotus on a long stem |
| J♥ | Ibis Scribe | headband with an ibis feather crest | scribe's kilt, palette on a cord | reed pen and papyrus scroll |
| K♦ | Pharaoh of the Sun | red-and-white double crown (pschent) | falcon pectoral with spread wings | ankh and a sun-disc staff |
| Q♦ | Queen of the Sun | vulture cap with cow horns cradling a sun disc | menat necklace | ankh fan |
| J♦ | Falcon Guardian | falcon-feather helmet | scale armour, round sun shield | spear with a sun pennant |
| K♣ | Pharaoh of the Delta | red crown (deshret) | scarab pectoral, papyrus-striped collar | papyrus sceptre (wadj) topped with a scarab |
| Q♣ | Queen of the Delta | modius crown of papyrus umbels | green bead collar | papyrus-stem sceptre |
| J♣ | Scarab Scribe | striped headcloth (khat) | scarab amulet, scribe's kilt | papyrus scroll and reed brush |

Each court card has its rank letter and suit in the corners, a small suit pip near the figure's shoulder, and its house colour in the crown and regalia.

**The 4 Aces** (the suit shape stays dominant and centred, wrapped by the house emblem):
- A♠: a large spade between two seated jackals under an arc of stars.
- A♥: a large heart rising from an open lotus, flanked by ibis wings.
- A♦: a large diamond at the centre of a winged sun disc (falcon wings).
- A♣: a large club held up by a scarab's forelegs, with papyrus fans behind.

**Card back:** lapis field with a fine gold diaper pattern, gold border, and a central cartouche holding two gold Eyes of Horus rotated 180° from each other, so the back is the same either way up.

`/egyptian/deck` shows all 52 faces (by suit, A to K) and the back.

## 8. Animation and sound

All client timings live in `egyptian/fx.ts`. Animations setting: Full / Fast / Off (`egw.fx`); `prefers-reduced-motion` turns Full into Fast; `egw.e2e` = `1` forces Off and sends `quick: true` in setupData.

| Event | What plays |
|---|---|
| Deal | cards fly round the table in deal order, then the starting player's seat is highlighted |
| Flip | card leaves the stack, turns over mid-flight (3D), lands on the pile slightly rotated, briefly enlarged |
| Pile | top 4 cards fanned; with `topBottom` on, the round's first card peeks out underneath |
| Turn | arrow and glow on the player to act; `aria-live` line, e.g. "Ana plays 7 of hearts" |
| Challenge | banner "Ace: Bo has 4 tries", one ankh pip per try going out as used, challenged seat pulses |
| Grace | a 1-second ring drains around the pile |
| Valid slap | hand slams from the slapper's seat; matching cards lift out and line up enlarged with a ribbon ("Sandwich · 7 · 2 · 7", every match listed, headline first); the pile sweeps to the winner |
| Challenge win | ribbon "Challenge won by Ana · Ace", pile sweeps to her |
| False slap | hand slams with a red crack, a face-down card flies from the slapper's stack under the pile, lockout ring starts |
| Slap-in | gold flash on a winning slap-in; spent marker after a failed one |
| Game end | winner's stack grows to 52, victory scene, stats: slaps won, false slaps, challenges won, longest stack |

Sounds (`egyptian/sound.ts`, synthesized like `fleet/sound.ts`): flip, slap, valid slap, false slap, challenge start, each try, grace tick, collect, win. Music: `lib/songEgyptian.ts` (original tune in the Hijaz mode with frame-drum percussion, a plucked lute line and a reed flute), its own track and bus in `lib/music.ts` for `/egyptian` paths, levelled by an offline-render test. Volume and mute through `lib/music.ts` and `AudioButtons`.

## 9. Tests

- `packages/shared/test/egyptian.slapRules.test.ts`: positive and negative cases per rule; staircase Q-K-A and A-2-3 valid, K-A-2 invalid; tens ignores J/Q/K; multiple matches in catalogue order.
- `egyptian.rules.test.ts`: deal sizes 2-5; deal order independent of starting player; clockwise play skipping empty stacks; challenge tries and passing on; running out mid-challenge; 1 s grace and a slap inside it; burns never count; false-slap burn and 1 s lockout; one slap-in per round, reset at round end; min flip gap; latency tolerance; stale-round slaps ignored; idle auto-flip; leave; nobody-holds-cards rule; win at 52.
- `egyptian.game.test.ts`: setupData validation; Local() flow with fake `Date`; no leaks through `playerView` (stack order, burned cards, random state) including a reconnecting client.
- `fuzz.egyptian.test.ts`: 500 games for each of 2-5 players with scripted random players on a simulated clock; 52 cards in every state; the no-soft-lock invariant after every step; a move cap per game, with capped games reported, not failed.
- Client: `keys.test.ts` (rebind, conflicts, persistence, capture rules), `roomData.test.ts`, `fx.test.ts` (animations fit the pauses), `seating.test.ts`, `sound.test.ts`, `songEgyptian.test.ts`, `partyRules.test.ts` additions.
- e2e `e2e/egyptian.spec.ts` (after `npm run build`): picker card -> menu; a local keyboard game with a valid and a false slap; the rule checklist changes behaviour; a 3-window online game through the waiting room; a spectator; rebinding a key.

## Decisions (points the prompt leaves open)

1. **Ace counts as a face card** for challenges (4 tries), as the prompt's J/Q/K/A list says.
2. **Collect order:** burned cards first, then the pile in played order, all under the winner's stack.
3. **Stale slaps are free:** a slap stamped with an earlier round, or arriving while a won pile is on show, is ignored with no penalty. A slap on an empty pile is a false slap.
4. **Locked-out slaps** are ignored without a second penalty.
5. **Real-time transport:** every move has `ignoreStaleStateID: true`; boardgame.io otherwise refuses any move sent against an older state, which would drop most slaps in a busy game.
6. **Disconnects:** an idle auto-flip after 15 s stops an absent player from freezing the table; `leave` puts their cards under the pile and takes them out for good.
7. **Nobody holds cards:** the pile goes, after the grace window, to the challenger, else the top card's player, else the round's leader (needed for the no-soft-lock invariant).
8. **Start sync:** the deal waits for every seat's `ready` (8 s cap), so late-loading players still see the deal.
9. **Pauses are rules, not cosmetics:** the server pauses for the Full animation length whatever each device's Animations setting; Fast/Off only shorten what that device draws. e2e uses `quick` setupData for short pauses.
10. **Min flip gap is global** (between any two flips), in pass and play too.
11. **Pass-and-play names** default to Player 1 / Player 2 and can be edited in setup (saved in `egw.local`); local colours are fixed (seat colours 0 and 1).
12. **Colours online:** a 5-colour palette for the neutral table; joiners pick in the waiting room (seat `data.color`), clashes resolved by `seatColors`.
13. **Display font:** Cinzel is added as a dependency (`@fontsource/cinzel`); indices use Barlow Condensed, already installed.
14. **Spectators** cannot call `tick` (they have no seat); timed events are driven by the seated clients.
15. **Theme:** dark only, like Frontline and Fleet.
