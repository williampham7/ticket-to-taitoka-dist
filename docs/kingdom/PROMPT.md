# Build brief: Shifting Kingdom

Owner's confirmed brief (2026-11-25). Build **Shifting Kingdom**, a standalone game in this repo. It plays like the classic shifting-maze board game: push a spare tile into the maze, then walk your hero to your secret treasures. The setting is our own: a hand-painted **storybook kingdom**. It sits alongside Frontline, Fleet, Egyptian War and Warfront in the same format: a card on the `/` picker, its own menu, online rooms, party support, bots and pass-and-play.

**Who it's for:** the owner playing **online** with their younger brothers and their girlfriend. The draw is adventure and nostalgia. Quality bar: stunning visuals, painted background art, lots of small details, an animation for every action, easy to pick up for mixed ages, and immersive. The owner usually needs 4-5 follow-up prompts to reach a solid product. This brief is written so that one pass gets there. Follow the quality gates in section 9; they are the difference.

Everything here is decided. Don't reopen it. Ask the owner only about something this brief leaves open whose answer would change what gets built. Settle everything else yourself and record each call in `docs/kingdom/SPEC.md` under **Decisions**.

---

## 0. First actions (in this order)
1. **Branch:** create `feat/kingdom` from the latest `main`. Push only to that branch. Commit this brief on it as the first commit.
2. **Read** `CLAUDE.md` (the Frontline, Fleet, Egyptian War and Warfront sections). Then read only what you need to copy Warfront's integration pattern: `packages/server/src/serve.ts`, `packages/server/src/warfrontBots.ts`, `packages/shared/src/index.ts`, `packages/shared/src/warfront/{game,view,bot}.ts`, `packages/client/src/App.tsx`, `screens/EditionPicker.tsx`, `lib/partyRules.ts`, `lib/music.ts`, `lib/chat.ts`, and `packages/client/src/warfront/` (`WarfrontApp`, `Lan`, `lobby`, `Local`, `PickerCard`, `actionFx`, `fx`). Also read `fleet/cine/` and the `/fleet/scenes` route for the scene-gallery pattern, and `egyptian/` `/egyptian/deck` for the art-gallery pattern. Skim, don't study.
3. **Write** `docs/kingdom/SPEC.md` (this brief made precise, plus your calls) and `docs/kingdom/PLAN.md` (a checklist of the milestones in section 10). Use superpowers:writing-plans for PLAN.md. After **every** milestone, update PLAN.md, commit and push, so a resumed session loses nothing.

## 1. Token efficiency (absolute priority alongside quality)
- No subagents. No exploratory reading beyond step 0. Never re-read a file you just wrote or edited.
- Copy Warfront's plumbing (game registration, view filter, waiting room, server bots, Local(), party, tests) instead of designing new plumbing. **Copy its structure, never its look.**
- Write whole files in one pass. Batch independent tool calls. Keep chat output to one line per milestone.
- TDD for the rules (superpowers:test-driven-development). While building, run only the targeted Vitest files. Run `npm run typecheck`, `npm test` and `npm run e2e` in full only at the end.
- Visual checks: Playwright screenshots at `deviceScaleFactor: 1`, only at the quality gates in section 9. At most 2 fix rounds per gate.
- All animation timings go in `kingdom/fx.ts`, and all bot and tuning numbers in one file each.

## 2. Merge safety and repo conventions
- **Never write the trademarked name of the original game** anywhere in the repo or the UI. In docs, say "the classic shifting-maze board game". Don't copy its look, treasure list, piece shapes or box art. The rules are fine.
- **Names:** game name `kingdom`. Rules in `packages/shared/src/kingdom/`, client in `packages/client/src/kingdom/`. CSS prefix `kg-` (grep first to confirm it's unused). `.kingdom` is `isolation: isolate`. Never use the class `hidden`. No blanket child selectors such as `.kingdom > *` (CSS bundle order differs in production). Storage keys `kg.*`.
- **Tests:** `packages/shared/test/kingdom*.test.ts`, `fuzz.kingdom.test.ts`, `e2e/kingdom.spec.ts`. Docs go in `docs/kingdom/`.
- **Shared files stay additive and minimal:** `serve.ts`, `shared/src/index.ts`, `App.tsx`, `EditionPicker.tsx`, `partyRules.ts` (+ test), `lib/party.ts`, `lib/music.ts`, `CLAUDE.md`. Party: `partyRules.followTarget` treats any path that is not listed as a Ticket path. Exclude `/kingdom` from the edition logic in **both** `partyRules.ts` and `lib/party.ts` (seat lookup and edition exclusion), exactly as `/warfront` is, or members get edition reloads. Add one small self-contained block per file, marked `// Kingdom`. Never reorder, rename, reformat or tidy existing lines.
- **No new npm dependencies.** Inline SVG, CSS, Web Audio and Google Fonts `@import` in a `kingdom/*.css` file are enough.
- Don't fix unrelated things you notice. List them in the final summary.

### Known traps from earlier games (avoid them up front)
- Online clients must be created with the real `numPlayers`; read it from the match first, as Warfront's `useMatch` does.
- `Local()` keeps one master per game object, so each local match needs a fresh `{ ...KingdomGame }`.
- Every move is `client: false`. The only place hidden info is filtered is `view.ts`.
- Bots decide only from their own view. Test it the way `test/botRunner.ts` and the Warfront bot tests do.
- Animations must never decide state. **Don't diff boards** to work out what happened (it's fragile for a sliding maze, and a bot's shift and move can arrive together). Animations play from the public event log described in section 7.
- Reduced motion means **Fast** here, not Off (Warfront's `effectiveFx` maps it to Off). Don't copy `fx.ts` unchanged.
- CSS 3D: any ancestor with `filter`, `opacity < 1` or `overflow: hidden` flattens `preserve-3d`, and Safari then hides heroes behind the frame. Section 4 avoids this by design.
- Input is locked while an animation plays. The banner and result wait until it ends. With fx Off, everything is instant.
- The board must fit unscrolled at 1280x720, 1440x900, 1920x1080, iPad 1180x820 and 820x1180, and phone 390x844.

## 3. Rules (faithful to the classic shifting-maze game)
- **Board:** a 7x7 grid. Tiles have openings on N/E/S/W, stored as a 4-bit mask. Types: straight (I), corner (L), T-junction (T).
- **Fixed tiles (16):** every tile where both row and column are even (0-indexed). The 4 corners are L tiles and are the players' **home** squares. The other 12 are T tiles carrying the 12 **object treasures** in a fixed layout. The edge T tiles keep their closed side toward the board edge. Pick the centre four's orientations so the centre stays open (your call; pin it in a test).
- **Movable tiles (34):** 12 I (no treasure), 16 L (6 with a **creature treasure**), 6 T (6 with a creature treasure), so 24 treasures in all. Setup shuffles them, with boardgame.io's seeded random, into the 33 free squares at random rotations. The 34th is the **spare tile**.
- **Players:** 2-4. Each picks a hero (section 6). Turn order is a seeded shuffle. **Home corners go by turn order**, clockwise from the top-left (the first player gets top-left, the second top-right, and so on).
- **Treasure deal:** the 24 treasures are shuffled and dealt evenly (2p 12, 3p 8, 4p 6), or fewer with the room's **Game length** setting: **Full** (all 24), **Medium** (5 each) or **Short** (3 each). Your **current target** is the top of your stack.
- **A turn has two steps:**
  1. **Shift (mandatory).** Rotate the spare as you like, then insert it at one of the **12 insertion points** (each end of rows 1, 3, 5 and columns 1, 3, 5). The line slides one square and the tile pushed out becomes the new spare, treasure included. **No undoing:** you may not insert at the point where the last push came out (the exact reverse of the previous shift). Heroes on a pushed-out tile **wrap** onto the newly inserted tile at the opposite end of the same line.
  2. **Move (optional).** Walk to any square connected to yours by open paths, through any distance. A path connects when both neighbours have facing openings. Heroes may share squares and pass through each other. Staying put is allowed.
- **Collecting:** if you **end** your move on the square holding your current target (including by staying, or after the shift carried that square under you), you collect it. It is revealed to everyone and your next target becomes current. A treasure on the spare tile can't be reached until someone pushes it in.
- **Going home:** with your stack empty, your target is your home corner. The first hero to end a move there **wins** at once.
- **Leaving and dropping:**
  - **Leave** is a `resign` move that works at any time. Your hero bows out (with a little wave animation) and is removed. If it was your turn, the turn passes. The last hero left wins.
  - **A closed tab** never resigns. If a seat's `matchData.isConnected` has been false for 30 s, seat 0 sees "Send <name> home", which calls a host-only `dismiss(seat)` with the same effect as `resign`.
  - **If seat 0 itself leaves or drops,** the lowest remaining human seat takes over the host's buttons (dismiss, rematch).
- **Room options** (seat 0 sets them in the waiting room): **Game length**, and **Hints** (on by default; they enable "Where is it?" and "Suggest a push", section 7).
- **Young Adventurer is per player, not per room.** It's off by default; each player toggles it on their own seat in the waiting room or local setup (seat data `young`, setupData `young: boolean[]`). That player sees all their remaining treasures and any of them counts (the classic younger-player variant). The adults keep the normal rules. Their banner shows a small star so everyone knows.
- **Hidden info (`view.ts`):** `G` holds every stack. Each player sees only their own current target (their whole remaining stack in Young Adventurer mode), plus everyone's collected treasures and remaining counts. Opponents never see your target. Not in a move, the log or a caption. The deck order is never sent. After the game, everything is shown.
- **Engine (copy Warfront's move model, so `warfrontBots.ts` copies over almost unchanged):**
  - Pure functions in `rules.ts`: `newGame`, `applyShift`, `reachable` (BFS), `pathTo` (BFS shortest path with tie-break N, E, S, W, shared by the engine, bots and client), `legalShifts`, `act`.
  - `game.ts` is `KingdomGame`, with setupData `{ length, hints, young, heroes }`.
  - There is a single `act(action)` move, where `action` is `{ k: 'shift', at, rot } | { k: 'move', to }`, plus `resign` and `dismiss`. All of them are `client: false` with `ActivePlayers.ALL`. The engine checks `G.current` and `G.step` (`'shift' | 'move'`).
  - Rotating the spare stays client-local until the shift is sent.

## 4. Approaches (recorded)
- **Chosen: DOM + inline SVG with a tilted tray and a flat overlay.** It's consistent with every other game in the repo, needs no dependencies, the DOM does the hit-testing, Playwright can click it, and it looks like a real diorama.
  - **The tray:** only the tray rotates (`perspective` + `rotateX` about 25-30°). It holds the 7x7 grid of tile elements, each an inline SVG generated from its opening mask, and the banners.
  - **No SVG filters on tiles.** The paper grain is baked once into one shared overlay or background image, and there's no `feTurbulence` per tile. This keeps sliding lines smooth on iPads and phones.
  - **Everything upright goes in a flat overlay** above the tray: heroes, ghost arcs, footprints, sparkles and the treasure flights. They're positioned at the projected centres of the tiles, from one `project(row, col)` helper that uses the same tilt numbers as the CSS. Heroes are then never sorted behind hedges or the frame.
  - **Flat view:** a toggle that drops the tilt. It's the default on phones and with reduced motion.
- **Rejected: WebGL/Three.js.** A new dependency (not allowed), slower to build and test, and a heavy download.
- **Rejected: a single canvas.** It loses DOM hit-testing and accessibility, e2e gets much harder, and text is blurry.

## 5. Modes, lobby and online (online is primary)
- **Routes:** `/kingdom` (menu), `/kingdom/host`, `/kingdom/wait/:id`, `/kingdom/join/:id`, `/kingdom/play/:id`, `/kingdom/watch/:id`, `/kingdom/local?s=` (pass and play), `/kingdom/bot?s=` (solo vs computers), `/kingdom/gallery` (QA art gallery), `/kingdom/scenes` (QA animation gallery).
- **Waiting room** (the Warfront war-room pattern): a 4-seat match with the invite link and QR from the existing helpers. Each seat picks a **unique hero**, stored in seat data. Seat 0's settings are shown live to everyone. The host can add Easy / Medium / Hard **server bots** to open seats; copy `warfrontBots.ts` into `kingdomBots.ts` and register it in `serve.ts`. **Bots wait for the animations:** base Full-speed timings live in `shared/src/kingdom/timing.ts` (shared by the server and `kingdom/fx.ts`), and a bot acts only once the previous event's animation would have finished, plus the usual turn lead. `TTB_BOT_DELAY` still overrides this for tests. Start needs 2+ seats filled and calls `playAgain` with the joined count and setupData. Register a seeded `kingdom` game in `serve.ts` the same way as the others (e2e runs with `SEED`).
- **Local / vs-computer setup page** (`/kingdom/local` and `/kingdom/bot` open it first; `?s=` encodes it, as in Warfront's `setup.ts`): a storybook page with 2-4 seats. Each seat is set to human or computer (with a level), a hero and Young Adventurer, plus the room options.
- **Rematch:** the host opens the next waiting room and everyone follows (the Warfront pattern). **Party:** `partyRules.ts` `kingdom()`: members take free seats, the rest watch. **Spectators:** `/kingdom/watch/:id` (no target shown). **Reconnect:** a reload lands you back in your seat with the board and your target intact.
- **Chat:** the boardgame.io relay, read through `readChat()`, with emotes. Shown as speech-bubble scrolls. Online only.
- **Pass and play:** a **closing storybook** curtain between turns that names the next hero. Only the current player's target is visible behind it.

## 6. Look: "The Storybook Kingdom"
A picture book come to life: hand-painted, warm, cosy, detailed. It must not look like any other game in the repo (Warfront's walnut, Fleet's dark CIC, Frontline's olive, Egyptian's papyrus, SF's Fredoka).
- **Type:** Fraunces (display: titles, banners, drop caps) and Alegreya Sans (UI).
- **Palette:** meadow greens, honey gold, rose, sky blue, cream parchment, and ink brown for outlines. Everything is drawn in one illustration style: a soft ink outline (1.5-2px, round joins), watercolour-style fills (layered gradients defined once in a `KingdomArtDefs` mounted at the app root; the paper grain is one baked overlay, never a per-element filter), and soft shadows.
- **Background scene** (layered SVG with parallax, behind the board): rolling hills, a castle on a hill with waving pennants, a village with smoking chimneys, a winding river with shimmer, a forest edge, and drifting clouds. Birds cross now and then, and butterflies flutter over the board edge. **The time of day follows the game:** morning at the start, golden afternoon at mid-game, sunset when the first hero heads home, starry night with lit windows and fireflies at the finish. This is driven by the share of treasures collected and done with gradient and colour transitions on the background layers, not new art. **Time of day tints only the background.** The board and HUD keep full daylight contrast, with lanterns on the frame glowing at night.
- **The board is a diorama tray:** a carved wooden frame with brass corners on a grassy plinth. The 12 insertion points are **little cloth banners on poles** around the frame. A banner lifts on hover. The one blocked by the no-undo rule is furled, with a small padlock.
- **Tiles are generated from the opening mask**, so the art always matches the rules: a cobblestone path from the centre out to each open edge, at the same width and offset on every edge so paths join seamlessly between tiles. Closed sides get **rounded hedges** with a lighter top and a darker front band to fake height. Hedge corners join cleanly. Grass areas carry seeded decorations (flowers, mushrooms, pebbles, clover, the odd lantern or signpost), stable per tile id and never on the path. Fixed tiles have a mossy stone border so players can tell them apart. Home corners show a small hero-coloured tent and banner.
- **Treasures (24 original pieces of art):** each sits on a little round plinth in the tile centre and also appears large on cards. Every one must read at 32px.
  - **Objects (fixed tiles):** Golden Harp, Glass Slipper, Crystal Ball, Music Box, Royal Sceptre, Pocket Watch, Star Lantern, Silver Teapot, Golden Apple, Spinning Wheel, Wishing Coin, Magic Beans.
  - **Creatures (movable tiles):** Unicorn, Golden Goose, Frog Prince, Snow Fox, Griffin Chick, Fairy, Garden Gnome, Wise Tortoise, Sleepy Bear, Enchanted Rose, Phoenix Feather, Mermaid's Comb.
- **Heroes (4):** Knight (scarlet), Ranger (forest green), Sorceress (violet-blue), Bard (honey gold). Each is a small illustrated standee with a coloured base ring. Idle animation: a gentle breathe or bob. They face the walking direction. Heroes sharing a square spread into a 2x2 cluster.
- **Cards:** target cards look like illustrated storybook cards with a deckled edge, a gold frame, the treasure art and its name. The back is a wax-sealed parchment.
- **HUD:** player banners along the top (portrait, name, collected treasures as small icons, a remaining count, whose turn it is). Your target card sits bottom-left. The spare tile sits bottom-right on a pedestal with rotate arrows. A step ribbon reads "1 Shift the maze" / "2 Walk", and a narrated log scroll reads "The Knight found the Music Box!".
- **Picker card on `/`:** a closed storybook cover with a gilt maze inlay and the castle, plus one line in `EditionPicker.tsx` (`kingdom-card`) via `kingdom/PickerCard.tsx`.
- **Menu:** the storybook opens on a painted title page. Options: Host online, Join, Play vs computer, Pass and play, How to play, Settings.
- **Result:** the last page, "The End", with the winner's hero at the castle gate, fireworks over the castle and every player's collected treasures laid out.

## 7. Animation and ease of play: always clear what is happening
Every action animates for **every** viewer, the mover and everyone watching alike.
- **How the animations are driven (copy Warfront's log pattern):**
  - `G` keeps a public, append-only `log` plus a `logTotal`.
  - The events are `shift { p, at, rot, out, wraps[] }`, `move { p, path, collected? }` (with `path` from `pathTo`), `collect`, `home`, `resign` and `win`. A `collect` event reveals the treasure, since a found treasure is public; it never reveals the next target.
  - The client (`useKingdomFx`) keeps a **display state** and steps it through the queued events one by one, so a bot's shift and move that arrive together still play in order. Input stays locked until the queue is empty.
  - When you mount or reconnect, the backlog is skipped and you jump straight to the current state.
- **Rotate spare:** a 90° spin with a slight overshoot and a wooden click. Use the arrows, a tap on the spare, or R / Shift+R.
- **Aiming a push:** hovering or focusing a banner shows a **ghost preview**. The line slides half a tile in translucency, the tile about to be pushed out lifts and glows, and any hero who would wrap shows a dotted arc to the far end. On touch, the first tap previews and the second commits. With a mouse, a click commits.
- **The push:** the spare flies from its pedestal to the banner and slides in. The whole line moves with weight (ease-out, a small settle), heroes ride along, and the pushed-out tile arcs up to the pedestal as the new spare. Leaf and dust puffs at both ends. A wrapping hero hops off the edge with a sparkle poof and drops onto the new tile.
- **Reachable squares:** after the shift, a golden glow ripples outward from the hero in BFS distance order. It looks good and also shows what is reachable. Hovering a square draws footprint dots along the shortest path. "Stay here" is a button, or Enter.
- **The walk:** the hero hops square to square along the path (about 140 ms a square, set in `fx.ts`), turning to face each step, with soft footprints that fade.
- **Collecting:** the treasure rises from its plinth in a sparkle burst and flies into the player's banner. For the owner only, the next target card flips over. Opponents see the found treasure revealed and the narrated line.
- **Heading home:** when the stack is empty, the hero's home banner unfurls and glows, and the card reads "Return home".
- **Turn change:** a ribbon banner unrolls with the hero's portrait and name, and the HUD shifts to that hero's colour. Your own turn adds a chime and a soft glow around your target card.
- **Win:** fireworks over the castle, rose-petal confetti, the hero hops to the castle gate, then the page turns to the result.
- **Intro:** a book opens and the pages turn to reveal the board (skippable).
- **Ambient:** clouds, birds, butterflies, swaying grass tufts, pennants, river shimmer, chimney smoke, fireflies at night. All of it is cheap CSS/SMIL, paused when the tab is hidden, and calmed by reduced motion.
- **Settings:** fx Full / Fast / Off (`kg.fx`; reduced motion = Fast), Flat view, music and sound volume.
- **Ease of play for younger players:**
  - **First-game coach marks:** three bubbles ("Turn the tile", "Pick a banner to push", "Walk to a glowing square"), shown once and saved in `kg.coach`.
  - With Hints on: **"Where is it?"** pulses your target's square (or the spare, if it's there). **"Suggest a push"** asks the Easy bot logic, from your own view, for a shift that makes your target reachable and pre-aims it.
  - Illegal actions simply aren't offered (the furled banner, unreachable squares).
  - Keyboard: arrow keys move a focus ring around the banners and squares, Enter acts, R rotates.
  - **How to play:** a five-page illustrated storybook with a small looping demo on each page.

## 8. Audio
- **Sounds** (Web Audio, `kingdom/sound.ts`): page turn, wooden rotate click, stone-scrape slide plus a thunk, leaf rustle, footsteps on cobbles, a sparkle chime when collecting, a home-banner horn, a turn chime, and a win fanfare.
- **Ambience:** birdsong by day, crickets at night, following the time of day.
- **Music:** `lib/songKingdom.ts`, a lilting folk-medieval tune (lute, harp, recorder, soft tabor), played by `kingdom/music.ts` on **its own AudioContext**, exactly like `warfront/music.ts`. In `lib/music.ts`, the only change is adding `/kingdom` to the two places that keep it silent on `/warfront`. Level the tune with an offline-render test like the others (`lib/offlineAudio.testutil.ts`).

## 9. Quality gates (this is how one pass reaches high quality)
At each gate, take the listed screenshots, write a short self-critique against the checklist in the commit message body, fix what fails (at most 2 rounds), then move on.
- **Gate A: art** (`/kingdom/gallery`): every tile type at 4 rotations, the 24 treasures at 32px and 120px, the 4 heroes (idle and walking), cards front and back, home tents. Check that paths join across neighbouring tiles (render a 3x3 sample patch), hedges join at corners, every treasure is recognisable at 32px, and the style is consistent (one outline weight, one grain).
- **Gate B: board** (mid-game, from a fixture `/kingdom/scenes?board=mid` with 4 heroes, two of them on the same square, collected treasures and one hero heading home; at 1440x900, 1180x820 and 390x844, both tilted and flat): fits unscrolled, no text overlap, heroes never hidden behind hedges or the frame, banners clickable, HUD readable, background visible around the board without crowding it.
- **Gate C: motion** (`/kingdom/scenes`, which plays each animation from section 7 on demand): screenshot each one mid-flight. Check no layout jumps, nothing flying to the wrong place, and the end state matching the server state exactly.
- **Gate D: full online game:** host plus 2 joiners in 3 Playwright windows, plus 1 Easy bot, played to the end on Short. Check that every window shows every action, no window ever shows another player's target, reconnect works mid-game, and rematch works.
- **Correctness checklist** (tests pin each one):
  - the no-undo push
  - heroes wrap
  - a treasure on the spare can't be collected
  - collecting by staying
  - collecting when the shift carries the target square under you
  - Young Adventurer per seat: any order, and only for that seat
  - the home win only with an empty stack
  - resign on your own turn and off turn
  - `dismiss` is host-only, and the host role passes on
  - `pathTo` agrees with `reachable`

## 10. Milestones (PLAN.md)
The order keeps the game **playable online as early as possible**, so a session that runs short still leaves a working game. The polish comes after.
1. **Rules and tests (TDD):** tiles, setup, shift, wrap, no-undo, BFS, `pathTo`, collect, home, resign/dismiss, options, the log, `view.ts`, and a `Local()` no-leak test including reconnect.
2. **Bots (`bot.ts`):**
   - **Easy:** a shift that makes its target reachable if one exists, else a random legal one.
   - **Medium:** the same, else the shift and square that bring it closest to the target by path distance.
   - **Hard:** the same, but if it can't reach the target this turn, it picks the shift and square that leave the most next-turn shifts reaching it (lookahead only over its top 8 shifts). It also prefers squares on fixed tiles, which can't be pushed away.
   - All of them decide only from their own view and always play legally.
   - **Strength test:** 200 seeded 2-player games; Hard beats Medium in at least 55% and Medium beats Easy in at least 60%.
   - **Fuzz:** 500 games **in total** across 2-4 players on pure rules (like `warfrontSim.ts`), mostly Short and Medium length with mixed levels and options, within a 120 s budget. Check no soft-lock, treasures conserved, and every game ending within a cap.
3. **Playable online, plain:** register `KingdomGame` and `kingdomBots.ts`; `partyRules`/`party.ts` changes; the waiting room, host/join/play/watch, the local and bot setup page, and a plain functional board (flat, simple tiles) wired to `act`. Play one bot game end to end before going on.
4. **Art:** `KingdomArtDefs`, the tile generator, treasures, heroes, cards, background scene and gallery → **Gate A**.
5. **Board and HUD:** tray tilt, overlay, flat view, banners, spare pedestal, step ribbon, panels, log scroll, and the `?board=mid` fixture → **Gate B**.
6. **Animation layer:** `timing.ts`, `fx.ts`, the log-queue `useKingdomFx`, every section 7 animation, the scenes gallery, and the bot pacing → **Gate C**.
7. **Menu and polish:** menu, picker card, curtain, coach marks, How to play, result page, chat bubbles, the time-of-day cycle.
8. **Audio and music.**
9. **`e2e/kingdom.spec.ts`:**
   - Every spec sets `kg.fx` = off, `kg.coach` = done, `kg.intro` = seen and `kg.botMs` = 30, plus `test.setTimeout(180_000)`.
   - Humans play by pressing "Suggest a push", then walking to the target if it's reachable, else pressing Stay.
   - Cover: picker → menu, a local turn, a bot game to the end on Short, 2-window online with hero picks and settings, a spectator, and reconnect.
   - Then **Gate D**.
10. **Wrap-up:** the CLAUDE.md section (after Warfront, same style), then a full `npm run typecheck && npm test && npm run e2e`, all green.

**If you're running short of context, cut in this order** (and list what was cut in the summary):
1. The How-to-play demos become static pictures.
2. Birds, butterflies and parallax.
3. Ambient sound.
4. Keyboard focus on squares (banners stay keyboard-reachable).

Never cut a gate, the rules tests, online play or the core push, walk and collect animations.

## 11. Done means
Picker card → menu → every mode playable start to finish → bots and fuzz pass → all four gates passed → typecheck, unit and e2e all green → CLAUDE.md updated → PLAN.md fully checked → committed and pushed to `feat/kingdom` only (no merge; the owner merges). Verify before claiming done (superpowers:verification-before-completion). End with a 5-line summary: what's in, the shared files touched, anything deferred, and the unrelated issues you noticed.

## Out of scope
Ranking/XP, replays, turn timers, more than 4 players, alternate board sizes, a second art theme (but keep the art in `kingdom/art/` so one could be added).
