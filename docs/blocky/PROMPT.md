# Build brief: Blocky

Owner's brief (2026-11-25). Build **Blocky**, a standalone game in this repo. It plays like the classic corner-touching polyomino territory game: each colour places its 21 pieces on a shared grid, and every new piece must touch its own colour **only at the corners**. The setting is our own: **Sky Isles**. Four elemental builder guilds raise chunky toy-block land across a floating plateau above the clouds. Blocky joins Frontline, Fleet, Egyptian War, Warfront and Runeshift in the same format: a card on the `/` picker (the Taitoka library), its own menu, online rooms, party support, bots and pass-and-play.

**Who it's for:** the owner, playing online and around one iPad with friends and family. Quality bar: the polish of the Ticket series, Frontline and Egyptian War, on every screen from iPad (1024x768) up.

**Lessons from the last build (Runeshift).** The rules and plumbing came out right in one pass. The visuals and animations did not: not enough detail and not enough thematic immersion. Self-review at the gates was too lenient. This brief fixes that in three ways:
1. A **measurable detail bar** (section 6).
2. A **full-fidelity mock-up of the main screen, built before any components** (milestone 4).
3. **Independent reviewers** at every visual gate (section 9).

The owner also wants the game to be **very easy to play**, with the player never unsure what is happening. Section 7's **Clarity contract** is as important as the rules.

Everything here is decided. Don't reopen it. Ask the owner only about something this brief leaves open whose answer would change what gets built. Settle everything else yourself and record each call in `docs/blocky/SPEC.md` under **Decisions**.

---

## 0. First actions (in this order)
1. **Branch:** create `feat/blocky` from the latest `main`. Commit `docs/blocky/PROMPT.md`, `docs/blocky/PLAN.md` and `docs/blocky/REVIEW.md` on it as the first commit. **PLAN.md is already written and reviewed. Follow it; don't re-plan, and don't load superpowers:writing-plans or brainstorming.**
2. **Read** `CLAUDE.md` (the Runeshift, Warfront and Egyptian War sections). Then read only what PLAN.md lists for the current milestone. Skim, don't study.
3. **Skills, once each, only where named:** superpowers:test-driven-development (milestone 1 subagent), frontend-design:frontend-design (main session, start of milestone 4), superpowers:verification-before-completion (milestone 10).
4. Write `docs/blocky/SPEC.md` lazily: only the Decisions you make, appended as you go. After **every** milestone, tick PLAN.md, commit and push `feat/blocky`.

## 1. Token efficiency and model routing
Quality comes first, then tokens. Use the strongest model only where taste matters. Use the Agent tool's `model` and `effort` parameters as below. Every subagent brief names exact files, the brief sections to follow, and what to return (a short report, never file dumps), so it doesn't re-explore.

| Work | Who |
|---|---|
| Art direction, the mock-up, art, board, HUD, animation, juice, menu, integration | **Main session** (top model). Never delegate these. |
| Milestones 1-2: rules, tests, bots, fuzz (pure TS in `shared/src/blocky/`, section 3) | One subagent, `model: "sonnet"`, `effort: "high"`, which uses TDD |
| Milestone 8 (music and sound synthesis) and milestone 9 (`e2e/blocky.spec.ts`) | One subagent each, `model: "sonnet"`, `effort: "medium"` |
| Gate reviews (section 9) | A fresh subagent per gate round, `model: "sonnet"`, `effort: "high"`. Exception: **Gates A0 and E use `model: "opus"`, `effort: "medium"`**, because judging taste and clarity is the hardest call. It gets the screenshot paths and the gate checklist, and returns PASS/FAIL per item plus a ranked defect list. It has no stake in the work, so it judges harshly. |

- **Main session habits:**
  - Don't explore beyond PLAN.md's file list, and never re-read a file you just wrote.
  - Write whole files in one pass and batch independent tool calls.
  - Keep chat output to one line per milestone.
- **Testing while building:** run only the targeted Vitest files. Run the full `npm run typecheck`, `npm test` and `npm run e2e` only at the end.
- **Screenshots:** take them with Playwright at `deviceScaleFactor: 1`, only at gates. A gate allows at most **3 fix rounds** for A0 and E, and 2 for the others.
- **Where numbers live:** every animation timing and easing goes in `blocky/fx.ts` (full-speed bases in `shared/src/blocky/timing.ts`). Every bot and tuning number goes in `shared/src/blocky/tuning.ts`.

## 2. Merge safety and repo conventions
- **Never write the trademarked name of the original game** anywhere in the repo or the UI. In docs, say "the classic corner-touching polyomino game". Don't copy its look: no translucent plastic pieces, no primary blue/yellow/red/green on a grey grid, no box art. The rules are fine.
- **Names:** game name `blocky`. Rules go in `packages/shared/src/blocky/`, the client in `packages/client/src/blocky/`.
- **CSS:** prefix `bly-`. It's verified unused; `bk-` is taken by the SF kid. `.blocky` gets `isolation: isolate`. Never use the class `hidden`, and never a blanket child selector such as `.blocky > *`. Storage keys are `bly.*`.
- **Tests and docs:** `packages/shared/test/blocky*.test.ts`, `fuzz.blocky.test.ts`, `e2e/blocky.spec.ts`. Docs go in `docs/blocky/`.
- **Shared files stay additive and minimal:** `serve.ts`, `shared/src/index.ts`, `App.tsx`, `EditionPicker.tsx`, `partyRules.ts` (+ test), `lib/party.ts`, `lib/music.ts`, `CLAUDE.md`.
  - Exclude `/blocky` from the edition logic in **both** `partyRules.ts` and `lib/party.ts`, exactly as `/kingdom` is.
  - Add one small block per file, marked `// Blocky`. Never reorder, rename, reformat or tidy existing lines.
- **No new npm dependencies.** Inline SVG, CSS, Web Audio and a Google Fonts `@import` in a `blocky/*.css` file are enough.
- Don't fix unrelated things you notice. List them in the final summary.

### Known traps from earlier games (avoid them up front)
- **Online clients** must be created with the real `numPlayers`; read it from the match first (Runeshift's `useMatch`).
- **Local():** `Local()` keeps one master per game object, so each local match needs a fresh `{ ...BlockyGame }`.
- **Moves and the view:** every move is `client: false`. The game has perfect information, so `viewFor` in `view.ts` returns G as is; boardgame.io keeps the rng in `ctx`. It exists as the one place to filter.
- **Plumbing touch points** (the parts a one-pass build gets wrong):
  - `App.tsx`: `case 'blocky': return <BlockyApp />`.
  - `partyRules.ts`: `hasBlockySeat?` in `FollowInput`, `case 'blocky'` in `targetPath`, and `/blocky` added to the `ttr` exclusion line.
  - `lib/party.ts`: the `savedSeat` import, the `at` edition exclusion, and `hasBlockySeat` in the input.
  - `lib/music.ts`: **both** the silent check and `onPicker`.
  - `serve.ts`: the `SEED` line plus `installBlockyBots(server, { port: PORT })`.
  - `shared/src/index.ts`: the export.
  - `useMatch` is private to `kingdom/Lan.tsx`: copy it.
  - The sim helper `packages/shared/test/blockySim.ts` follows `kingdomSim.ts`.
- **The room host** is the lowest joined human seat (`roomHost`, as in Runeshift), not seat 0. Room settings live in that seat's data.
- **Animations never decide state and never diff boards.** They play from the public append-only `log` (section 7), so a bot move and an auto-pass that arrive together still play in order.
- **Motion settings:** reduced motion means **Fast**, not Off. Input is locked while an animation plays; banners and results wait until it ends. With fx Off, everything is instant.
- **iPad Safari performance:**
  - No per-cell SVG `filter`, no `feTurbulence`, no `backdrop-filter` on anything that animates.
  - Bake texture into a few shared `<pattern>`/`<symbol>` defs. Placed blocks go in one `<g>` of `<use>` elements.
  - The drag ghost moves with `transform` inside `requestAnimationFrame`, never by re-rendering React state per pointer move.
  - Ambient effects are CSS/SMIL, paused when `document.hidden`.
- **Touch:** use Pointer Events with `touch-action: none` on the board and shelf, and `setPointerCapture` on drag. Nothing may depend on hover alone. Tap targets are at least 44 px.
- **Screens (gate sizes):** the board must fit unscrolled at 1024x768, 1180x820, 820x1180 (portrait), 1366x1024, 1440x900, 1920x1080 and 2560x1440. Phones are out of scope: they must not crash and may scroll.

## 3. Rules (faithful to the classic game)
- **Pieces:** each colour has the 21 free polyominoes of size 1-5:
  - 1 monomino, 1 domino, 2 trominoes, 5 tetrominoes and 12 pentominoes, which is 89 squares.
  - Ids: `I1 I2 I3 V3 I4 L4 T4 S4 O4 F I5 L5 N P T5 U V W X Y Z`.
  - Each piece also has a **themed name**, the same for every guild, for example `X` = Crossroads, `I5` = Causeway, `U` = Harbour, `T5` = Watchtower, `O4` = Plaza, `I1` = Keystone. Pick the rest in the same spirit.
  - Orientations are generated by rotating and flipping, then de-duplicated. A test pins the total at **91 fixed orientations**.
- **Boards and seats:**
  - **Classic** is a 20x20 grid with four guilds, **Tide, Sun, Ember and Grove**, always played in that order. Their start squares are the four corners, clockwise from the top-left.
    - **4 players:** one guild each. A seeded shuffle assigns seats to guilds.
    - **3 players:** the fourth guild is **shared**. The three players take turns placing it in rotation, and its score is not counted.
    - **2 players:** each player has two opposite guilds (Tide+Ember, Sun+Grove). The two scores are added together.
  - **Duo** is for 2 players only: a 14x14 grid, Tide vs Ember. Tide's start square is (4,4) and Ember's is (9,9), 0-indexed. This fixed assignment is a house rule; record it in SPEC.md. Duo is the default for 2 players. The room setting **Board** offers Duo or Classic when exactly 2 are seated.
    - If a 3rd seat joins, Board is forced to Classic, and `validateSetupData` rejects `duo` unless there are exactly 2 players.
    - In 2-player Classic, the shuffle decides which seat gets Tide+Ember.
    - In 3 players, the shuffle gives Tide, Sun and Ember to seats, and Grove is the shared guild.
- **Placement:**
  - A guild's first piece must cover its start square.
  - Every later piece must touch at least one piece of the **same guild corner to corner**, and must **never share an edge** with the same guild.
  - Touching other guilds along an edge is fine. No overlap, and nothing may go off the board.
- **Passing:** a guild with no legal placement passes automatically, which is logged as `stuck`, and is out for the rest of the game. Never skip a guild that can still move. A player may also choose **"Done building"** (with a confirmation), which grounds all their guilds.
- **End:** when every guild is stuck or has placed all 21 pieces, **or** when only one player who hasn't resigned is left; that player wins. Resigned and dismissed players rank last, ordered by score among themselves.
- **Scoring (advanced rule):** each guild loses 1 point per square left on its shelf. A guild that placed all 21 pieces gets **+15**, or **+20** if its last piece was the monomino. The best total wins; tied players share the win.
- **Leaving and dropping (as in Runeshift):**
  - `resign` works at any time. The player's own guilds are grounded and they rank last; the shared guild skips them.
  - A closed tab never resigns. After 30 s offline, the host sees "Send <name> home", which calls a host-only `dismiss(seat)`. The host role passes to the lowest human seat still in.
- **Engine:**
  - Pure functions in `rules.ts`: `newGame`, `orientations`, `canPlace` (returns a **reason code** when illegal: `offBoard | overlap | ownEdge | noCorner | notStart`), `legalMoves(state, guild)`, `anchors(state, guild)`, `fits(state, guild, piece)` (the anchors and orientations where this piece fits), `hasMove`, `act`, `score`.
  - **`legalMoves` is corner-anchored and must be fast:** under 5 ms for a mid-game Classic position. A test cross-checks it against brute force on 200 random positions.
  - `game.ts` is `BlockyGame`, with setupData `{ board: 'classic' | 'duo', hints, bots }`. There is a single `act(action)` move, where the action is `{ k: 'place', piece, orient, at } | { k: 'done' }`, plus `resign` and `dismiss`. All of them are `client: false` with `ActivePlayers.ALL`.
  - **Who acts:** `G.current` is the guild to place, and `G.actor` is the seat that must act. `seatOf(G, guild)` is the one source for both.
    - The shared guild's k-th turn (k = 0, 1, …) is played by `G.order[k % 3]`, skipping seats that resigned or were dismissed.
    - A seat whose own guilds are all grounded still plays its shared turns. `done` grounds only the seat's own guilds, never the shared one.
    - Clients, bots and the status line compare `actor`, **never** `current`.
  - **Board truth lives in `G.placed`:** a list of `{ guild, piece, orient, at, n }`, with `G.board` cells holding an index into it. It never lives in the log.
    - `LOG_KEEP = 120`. A log line whose piece has left that window is no longer tappable.
    - **Growth is per piece:** stage 2 once its guild has placed 2 more pieces, stage 3 after 6 more. So no round events are needed.
  - Rotating, flipping, dragging and the pending placement stay client-local until the placement is sent.

## 4. Approach (recorded)
- **Chosen: DOM and inline SVG, top-down and orthographic.** The board is one SVG. Each cell is a chunky toy block: a top face, plus a visible south face and an east bevel for depth. There's no camera tilt, because a strategy grid has to stay perfectly readable.
  - Pointer position is turned into a cell with hit-testing maths.
  - The board also renders invisible `rect[data-cell="r,c"]` targets for e2e and keyboard focus.
- **Rejected: WebGL or Three.js.** A new dependency, a heavy download, and harder testing.
- **Rejected: a single canvas.** It loses DOM hit-testing and accessibility, and makes e2e hard.

## 5. Modes, lobby and online (online is primary)
- **Routes:**
  - `/blocky`: menu
  - `/blocky/host`, `/blocky/wait/:id`, `/blocky/join/:id`, `/blocky/play/:id`, `/blocky/watch/:id`: online rooms
  - `/blocky/local?s=`: pass and play
  - `/blocky/bot?s=`: solo against computers
  - `/blocky/mock`: the static full-fidelity mock-up, kept as a reference
  - `/blocky/gallery`: QA art gallery
  - `/blocky/scenes`: QA animation gallery, with `?board=mid`, `?board=duo` and `?board=end` fixtures
- **Waiting room ("the Guild Hall"):**
  - A floating hall with 4 **neutral seat pennants** (guilds are dealt at the start, never chosen), plus the invite link and QR from the existing helpers.
  - Each seat picks a builder avatar and name. The host's settings (Board, Hints) show live to everyone.
  - The host adds Easy, Medium or Hard **server bots**: copy `kingdomBots.ts` into `blockyBots.ts` and register it in `serve.ts`. Bots wait for the previous event's animation plus a turn lead, using the timings in `timing.ts`. `TTB_BOT_DELAY` overrides this for tests.
  - Start needs 2+ seats and calls `playAgain` with the joined count and setupData. Register the game in `serve.ts` with a seed, like the others.
- **Local and vs-computer setup page** (`?s=` encodes it, as Runeshift's `setup.ts` does): 2-4 seats, each human or computer (with a level), an avatar for each, plus Board and Hints.
- **Rematch:** the host opens the next waiting room and everyone follows.
- **Party:** in `partyRules.ts` `blocky()`, members take free seats and the rest watch.
- **Spectators:** `/blocky/watch/:id`.
- **Reconnect:** a reload lands you back in your seat.
- **Chat:** online only, through the boardgame.io relay, always read through `readChat()`. Emotes are shown as cloud bubbles from the speaker's banner.
- **Pass and play:** a cloud bank rolls across with the next builder's avatar and guild crest; tap to part the clouds. It falls **only between two different humans**, so a player taking two turns in a row (the shared guild) doesn't get one. A computer seat never gets a curtain.

## 6. Look: "Sky Isles". Art direction and the detail bar
A bright, airy toy diorama floating in the sky. It must look like nothing else in the repo (not the Ticket series' paper, Fleet's CIC, Frontline's olive, Egyptian's papyrus, Warfront's walnut, Runeshift's storybook, or the Bay and Merlion brights). It must not look like the original game, or like a pixel/voxel mining game. Blocks are **soft, rounded clay-and-vinyl toys**, never pixel textures or grass-on-dirt.

### 6.1 Art bible first (`docs/blocky/ART.md`, about 1 page, written before any art)
- **Palette tokens (hex):**
  - The sky ramps for each time of day.
  - Stone, moss and wood.
  - For each guild, 5 shades: top, top-light, south face, east bevel and rim highlight.
  - UI ink, plus success, warn and error colours.
- **One light source**, from the top-left. One outline weight (1.5 px, ink-tinted, never black).
- **One shadow recipe:** a contact shadow plus soft ambient occlusion.
- **Type:** **Baloo 2** for display (titles, scores, banners) and **Nunito Sans** for UI. Use a type scale of 5 sizes only.
- **Materials** (each UI surface is one of these, with a recipe for each): carved pale stone, oiled wood plank, brass plate, stitched cloth pennant, cloud. Every material has idle, hover/focus, pressed and disabled states.
- **Motion principles:** anticipation, action, impact, settle, residue. Name the easing curves (`out-back`, `out-quint`, `in-out-sine`).

### 6.2 The detail bar (measurable; gate reviewers check every line)
- **Block** (the most-seen object, so it gets the most care). A piece is **one moulded shape** with 7 layers: contact shadow, south face with a vertical gradient (exposed edges only), east bevel (exposed edges only), top face with a radial gradient, the guild pattern, a top-left rim highlight, and a small specular glint.
  - No inner seams; the outline runs only around the piece. Different pieces of the same guild meet corner to corner with a visible joint stud.
  - About 30% of cells get a seeded micro-detail.
  - **How it's rendered (per piece, not per cell):**
    - `art/blocks.tsx` builds one `<symbol>` per fixed orientation (91 in all) from the cell union.
    - Colour arrives as `color`/CSS variables on the `<use>`, via `fill="currentColor"`. Gradient stops don't reliably inherit through a `<use>`, so shading is shared neutral white/ink alpha gradients, and each guild pattern is one alpha `<pattern>`.
    - A placed piece is one `<use>`, plus a details `<g>`.
    - `BlockyArtDefs` is mounted once, in `blocky/BlockyApp.tsx`.
- **Guilds.** Each has a palette, a top-face pattern and micro-details that **grow as the game goes on** (stage 1 when placed, stage 2 after 2 rounds, stage 3 after 6 rounds). Details stay below the pattern's contrast. The **pattern is required, so guilds read in grayscale too.**
  - **Tide** (sea-glass teal-blue): wave-line pattern. Grows from ripples, to tiny pools, to a little fountain with a glint.
  - **Sun** (warm amber sandstone): dot-glyph pattern. Grows from carved suns, to sundials, to a tiny obelisk catching light.
  - **Ember** (coral-terracotta): crack pattern with warm seams that pulse slowly. Grows from a spark, to a little forge chimney with a wisp, to a glowing lantern.
  - **Grove** (leaf green): leaf pattern. Grows from sprouts, to flowers, to a tiny round tree that sways.
  - **Shared guild** (3 players): the guild's look with a striped rim and a "Shared" crest.
- **Plateau (board):**
  - A floating slab of pale stone: a carved rim with stone-block variation and weathering, and moss clumps on the rim.
  - **Underside:** hanging roots and vines with leaves, embedded crystals, and a bird's nest.
  - **Two waterfalls** with animated foam and mist spilling into the clouds.
  - **Four corner lanterns** that light at dusk.
  - Sockets with a faint, low-contrast grid, and a weathered compass rose engraved faintly at the centre.
  - Start squares hold a glowing **guild sigil** until they are covered.
  - **Minimum counts:** at least 14 rim stones in 3 variants, at least 8 moss clumps, at least 6 roots, at least 4 crystals, and 1 nest.
- **Sky:** at least 5 depth layers: the gradient, high clouds, distant islets with waterfalls, the mid cloud sea, and near wisps. Life in it: an airship that crosses now and then, birds in V formations, and sun or moon rays.
  - **The time of day follows the game's progress:** dawn, then noon, then golden hour, then dusk with the first stars and lit lanterns, ending at starry night.
    - Progress = (placed squares + the squares left on grounded guilds' shelves) / (89 × number of guilds). This way night always falls at the end, even on a board that ends 70% full.
  - The time of day tints the background only. The board and HUD stay at full daylight contrast.
- **No generic UI.** Every panel, button and badge is one of the 6.1 materials: the shelf is a wood plank with iron brackets and rope, banners are stitched cloth pennants, scores sit on engraved brass plates, and buttons are carved keys with press depth. No flat rectangles, no system fonts, no default focus rings (custom, but clearly visible). Every icon is custom-drawn: rotate, flip, confirm, cancel, suggest, clean view, chat, settings, sound and leave.
- **Avatars (6 original builders):** portraits in one style: an aviator with goggles, a gardener, a stonemason, a lantern-keeper, a kite-maker and a cloud-shepherd.
  - Each has 3-tone shading and a prop, with a silhouette that stays distinct in grayscale at 40 px.
  - Each has an idle blink, and a "thinking" pose while it's their turn.
- **Guild crests (4):** a wave, a sun, a flame and a leaf, drawn as heraldic badges and used on banners, the curtain and the result.
- **Picker card on `/`:** a small floating isle with a tetromino-shaped hill, a waterfall and drifting clouds, titled "Blocky". Add one line in `EditionPicker.tsx` (`blocky-card`) via `blocky/PickerCard.tsx`, styled to sit beside the other cards.
- **Menu:** the title builds itself from falling blocks onto an isle. Options: Host online, Join, Play vs computer, Pass and play, How to play, Settings.
- **Result:** the isles at night with lanterns. The tally counts each guild's leftover squares off one by one, with "+15" or "+20" bursts. The winner's avatar stands on a podium isle under fireworks.

## 7. Clarity, animation and ease of play

### 7.1 Clarity contract: the player always knows (gate E tests every line)
0. **Which guilds are mine.** The first log event is `start { seats: Record<Guild, string | 'shared'> }`, and it plays a guild reveal ("You lead Sun and Grove"). Your own banners carry a "You" tag for the whole game.
1. **Whose turn, and which guild.**
   - The current builder's banner floats up and glows.
   - A **status line** at a fixed spot above the shelf says it in plain words: "Your turn · place a Grove piece", or "Ana is thinking…" with their avatar's thinking pose.
   - The cursor, the ghost and the shelf tab all wear the guild's colour.
2. **What to do next.** The status line always gives the exact next step: "Pick a piece" → "Drag it onto a glowing corner" → "Tap ✓ to build". On a first game, coach marks point at the same things.
3. **Where you can play.**
   - On your turn, your **open corners** (anchors) show as small pulsing diamonds in your guild colour.
   - While you hold a piece, the anchors where it fits in **some** orientation glow, and those where it fits **as currently turned** glow brightest.
   - Pieces with no fit anywhere dim on the shelf with a "No room" tag.
4. **Why not.** An illegal ghost turns grey, the offending cells flash red, and a one-line reason appears from the reason code ("Can't touch your own guild along an edge").
5. **What just happened.**
   - Each guild's **last piece keeps a soft outline** until that guild moves again. The newest move also gets a ring.
   - A log line is narrated in theme ("Ana raised a Watchtower for Sun · +5").
   - Tapping a log line flashes that piece on the board.
6. **The standing.**
   - Each banner shows **squares placed** as the big number (0-89, summed per player in 2-player Classic), the official score small beneath it, and a rank badge. `place.points` is the piece size.
   - The shared guild shows "Not scored". Grounded guilds get a "Grounded" stamp.
   - The result page shows the official formula line by line.
   - Each banner holds a **mini-shelf**. Hover or tap expands it to show that guild's remaining pieces. Only the active guild's shelf is full size; in 2-player Classic, your idle guild's shelf sits lowered beside it.
7. **Danger.** "Open corners" counts only **live** anchors, the ones where some remaining piece fits. When a guild has 3 or fewer, its banner shows "2 corners left". For your own guild, a hint gently suggests protecting a corner.
8. **Endgame.** When only one guild can still build, a banner reads "Last builder standing".
9. **Clean view.** Hold V or press the eye key to hide every decoration and see pure blocks and patterns.
10. **Inspect.** Hovering or long-pressing a placed piece shows its owner, its themed name and its size.

### 7.2 Making it easy to play
- **Pick up:**
  - Tap or press a piece on the shelf and it lifts with a shadow and a little wobble.
  - Drag it with a mouse, pen or finger. On touch, the ghost floats about 1.5 cells **above the finger**.
  - Tap-to-select then tap-a-cell also works.
- **Magnetic snap:** within half a cell of a legal placement, the ghost snaps onto it with a soft click.
- **Fit cycle:** with the ghost over an anchor, Space (or the ↻ key) cycles through **only the orientations that fit there**.
- **Rotate and flip:** R or the rotate key gives a 90° spin with an overshoot. F or the flip key gives a card-flip done with a scaleX squash (never `preserve-3d`).
- **Pending and confirm:**
  - A legal drop becomes **pending**, with ✓ and ✕ buttons beside it. You can drag it again to adjust.
  - ✓, Enter or a second tap commits. A double-click also commits for mice.
  - Confirm placements is on by default for touch and off for mouse (then the drop commits). Pending is local only.
- **Suggest a move:** the Medium bot logic, from your seat, sets up a pending ghost, whatever the Confirm placements setting says.
- **What Hints controls:** the room's Hints setting controls only Suggest and the danger nudge. Anchors, fit glows, "No room" tags and reason lines are **always on**. The personal Show open corners setting hides only the idle anchor diamonds.
- **Input edge cases:**
  - `pointercancel` sends a dragged piece back to the hand.
  - Snap and legality use the **ghost** position, never the finger.
  - Confirm or commit follows the `pointerType` of that drop, so an iPad with a trackpad behaves like a mouse.
  - Tapping a glowing anchor while holding a piece makes a pending placement covering that anchor: the current orientation if it fits there, otherwise the first one that fits.
  - The pending ghost is re-checked on every display-state change. It's dropped with a short notice if it becomes illegal, the turn stops being yours, or a reconnect jump happens.
  - Off-turn, you may pick up, rotate and flip a piece, but not drop it.
  - Buttons get `touch-action: manipulation`, so a double tap never zooms.
  - The shelf uses a roving tabindex. Space and the arrow keys act on the ghost only while the board has focus.
  - Status-line verbs follow the last pointer type ("Tap ✓" vs "Click ✓ or press Enter").
- **Keyboard:** Tab cycles through the pieces, the arrow keys move the ghost, R/F/Space turn it, Enter places and Esc puts it back.
- **Never wrong-footed:** illegal moves are never sent. A guild with no moves left is grounded automatically, with an explanation.
- **First-game coach marks** (saved in `bly.coach`): "Start in your corner", "Touch your guild only at the corners", "Big pieces first!".
- **How to play:** four illustrated pages, each with a small looping demo of first move, corner touch, edge rule and scoring.

### 7.3 Animation: every action, for every viewer
The animations are driven by the log, exactly like Runeshift:
- `G.log` is public and append-only, with a `logTotal`. Its events are `start`, `place { p, guild, piece, orient, at, points }`, `stuck { guild }`, `done { p }`, `resign`, `dismiss` and `end { scores }`.
- `useBlockyFx` steps a display state through the queue. Input stays locked until the queue drains. A reconnect skips the backlog.
- **Pace budget, so games never crawl:** each event has a **blocking** length (the queue waits for it) and a **residue** that overlaps whatever comes next.
  - At full speed, `place` blocks for at most 1100 ms, `stuck` for 600 ms and a turn change for 500 ms.
  - The flourish, sprite, growth pop and "+N" are residue.
  - `eventMs()` in `timing.ts` returns the blocking length only, and both the bots and `useBlockyFx` use it.
  - The cloud ribbon plays only when the turn passes to you, or to a different human on this device. Bot-to-bot turns only move the banner glow.
  - Every particle count and beat duration goes in a beat table in `fx.ts`, which the Gate C reviewer receives.

Every action has all five beats: **anticipation → action → impact → settle → residue**.
- **Placing:**
  - The ghost dips (anticipation).
  - Blocks **drop in from above one by one** with a staggered bounce and squash (action).
  - Dust puffs and a camera-free "thump" ripples outward through the sockets (impact).
  - The corner joints flash (settle).
  - "+N" floats up, and the guild's stage-1 detail pops in (residue).
  - **A guild-specific flourish** follows: a Tide splash ring, Sun light rays, an Ember spark burst, or Grove leaves and a sprout.
- **Opponent placement:** a brief glow marks where the piece will land, the piece travels from that guild's shelf, then the same drop plays.
- **Growth:** when a piece reaches its next stage (see section 3), its details grow with a small pop.
- **Stuck:** the guild's shelf greys out under a cloud puff, a "Grounded" stamp lands, and a log line is added.
- **Turn change:**
  - A ribbon of cloud unrolls with the builder's avatar and crest.
  - On your turn, a chime plays, your shelf rises, and your anchors pulse once.
- **Big moments:** the first piece of a guild plants a guild flag on its start sigil. A 5-square piece gets a small extra flourish. The last piece placed (+15/+20) sets off a burst of guild confetti.
- **Guild sprites (delight):** after a placement, a tiny builder of that guild pops onto the piece, plants a pennant, waves, and hops off.
- **Endgame:** the tally and celebration from 6.2, with the leftover squares flying off the shelves into the score.
- **Ambient:** clouds, birds, the airship, waterfall foam and mist, swaying trees, ember wisps, and lanterns at night. All of it is cheap CSS/SMIL, paused when the tab is hidden, and calmed by reduced motion.
- **Settings:** fx Full / Fast / Off (`bly.fx`), music and sound volume, Show open corners (default on with Hints), Confirm placements, and Clean view.

## 8. Audio
- **Sounds** (Web Audio, `blocky/sound.ts`):
  - A pick-up pop, a rotate tick, a flip whoosh, a snap click, a corner chime and a soft invalid thud.
  - **Guild-specific landings:** a Tide splash, a Sun chime, an Ember crackle and a Grove rustle, each layered over clacks pitched per block.
  - A stuck cloud puff, a turn chime, tally ticks and a win fanfare.
- **Ambience:** wind, distant birds, the waterfalls, and night crickets that follow the time of day.
- **Music:** `lib/songBlocky.ts` is a breezy, bouncy tune (kalimba, marimba, soft pads, light hand percussion). `blocky/music.ts` plays it on **its own AudioContext**, exactly like `kingdom/music.ts`. In `lib/music.ts`, add `/blocky` wherever `/kingdom` is kept silent. Level it with an offline-render test (`lib/offlineAudio.testutil.ts`).

## 9. Quality gates (independent review)
At each gate:
1. The main session takes the listed screenshots into `docs/blocky/gates/<gate>/`.
2. A **fresh reviewer subagent** (the model from section 1) gets the screenshot paths, this gate's checklist and the detail bar in 6.2. From Gate B on, it also gets the A0 mock screenshot as the reference.
   - It returns PASS/FAIL per item plus a ranked list of defects, with **at least 5 defects even on a PASS**.
   - Its instruction: "Be a harsh art director. A reasonable-looking result is a FAIL if it misses a detail-bar line."
3. The main session fixes the FAILs and re-shoots. A new reviewer is used each round.
4. The final verdict is recorded in the commit message body. Commit only each gate's final-round screenshots, and keep earlier rounds out of git.

- **Gate A0: the mock-up** (`/blocky/mock`, 1180x820 and 1920x1080)
  - **What it is:** a static, full-fidelity mid-game screen built straight from ART.md, before any components exist. Every 6.2 item and every 7.1 cue appears in it: the sky, plateau, merged blocks of all four guilds at mixed growth stages, the shelf, banners, the status line, anchors, a held piece with a ghost, the log and controls.
  - **Check:** every detail-bar line, theme immersion ("could this be any other game?") and the clarity cues. Up to 3 rounds.
  - **After it passes,** every component must match the mock.
- **Gate A: art** (`/blocky/gallery`)
  - **Show:** all 21 pieces in each guild, blocks at 16, 28 and 48 px, all 3 growth stages, a grayscale render of the 4 patterns, sigils, crests, the 6 avatars, the plateau corners and underside, every material in every state, every icon, and the picker card.
  - **Check:** one light direction and one outline weight, clear at 16 px, merged shapes without seams, details below the pattern.
- **Gate B: board** (`/blocky/scenes?board=mid` and `?board=duo`, at every section 2 size)
  - **Check:** fits unscrolled, the shelf never overlaps the board, no text overlap, a readable HUD, the background visible around the plateau without crowding it, a crisp grid and patterns, and the result matching the mock.
- **Gate C: motion** (`/blocky/scenes`, which plays each 7.3 animation on demand)
  - **Scrub mode:** `/blocky/scenes?play=<anim>&scrub=<0..1>` freezes any animation at that fraction. CSS uses paused animations with a negative delay, and JS effects read one shared clock.
  - **Show:** an 8-frame filmstrip per animation, plus the `fx.ts` beat table.
  - **Check:** all five beats present, good easing, no layout jumps, landing exactly on the server state, the touch ghost above the finger, and the blocking lengths within the pace budget.
  - **Ghost performance:** the drag loop pushes frame times into `window.__blyFrames`. During a scripted 3 s drag, the 95th percentile must be under 20 ms.
- **Gate E: clarity** (1180x820, from deterministic fixtures)
  - **Fixtures:** `blocky/fixtures.ts` (built with the shared rules) drives `/blocky/scenes?screen=mid|duo|grounded|last|end&as=<seat>`, plus scripted pointer moves for legal, illegal and pending.
  - **Show:** 9 screenshots: the guild reveal, my turn idle, holding a piece over a legal spot, over an illegal spot, pending, an opponent thinking, just after the opponent's move, a grounded guild, and the endgame banner.
  - **Check:** the reviewer must answer the 7.1 questions from **each screenshot alone**: whose turn, what to do, where I can play, why not, what just happened, and who's winning. Any wrong or unsure answer is a FAIL. Up to 3 rounds.
- **Gate F: screens** (1180x820 and 1920x1080)
  - **Show:** `/` with the picker card in place, the `/blocky` menu (mid-build and settled), the Guild Hall with 2 humans and 1 bot, the setup page, the curtain, How to play page 2, the result (mid-tally and final), and a coach mark.
  - **Check:** every surface is a 6.1 material, the type scale is followed, every icon is custom, there's no generic UI, and the art matches the mock. Up to 2 rounds.
- **Gate D: full online game:** a host plus a joiner in 2 Playwright windows, plus 2 server bots, on Classic, played to the end, with one window at 1180x820. It runs as its own script with a 600 s timeout, not inside the e2e suite.
  - **Check:** every window shows every action, reconnect works mid-game, scores match `score()`, and rematch works.
- **Correctness checklist** (a test pins each one):
  - 91 orientations
  - the first move covers the start square
  - each `canPlace` reason code
  - `fits` and `anchors` agree with `legalMoves`
  - fast `legalMoves` equals brute force
  - auto-pass only when there is really no move
  - the shared guild's rotation in 3 players and its unscored total
  - 2-player Classic: summed scores
  - Duo start squares
  - the +15 and +20 bonuses
  - the game ends when everyone is stuck
  - `done`, `resign` and `dismiss`, plus the host handover
  - Local() reconnect

## 10. Milestones
These follow `docs/blocky/PLAN.md`, which has the task-level detail. The order keeps the game **playable online early**; polish follows.
1. **Rules and tests (TDD)** (Sonnet subagent).
2. **Bots** (the same subagent):
   - **Easy:** a random legal move, weighted toward bigger pieces.
   - **Medium:** greedy. It scores piece size, the new open corners it gains, and the opponents' corners it blocks, with a pull toward the centre in the first 4 moves.
   - **Hard:** Medium's evaluation over its top 12 candidates, plus a 1-ply look at the next opponent's best reply (mobility). It saves the monomino for last.
    - **Strength test** in its own file, `blocky.strength.test.ts`: 100 seeded Duo games per pairing, with seats alternating, a tie counting half, and a 300 s timeout. Hard must beat Medium in at least 60% and Medium beat Easy in at least 70%. If Hard can't reach 60% with a 1-ply lookahead, add a 2-ply option over its top 6, then fall back to 55% and record it in SPEC.md. Spend at most 2 tuning rounds.
   - **Fuzz:** 500 games across Duo and 2/3/4-player Classic, with 2% of actions a random done, resign or dismiss, and a 180 s timeout. Every game ends, the board is legal at every step, and scores equal a recount.
   - **Timing tests:** take the median of 30 runs and assert 3x the budget (`legalMoves` under 15 ms, Hard under 300 ms). Log the real medians; they must meet the actual budgets (5 ms and 100 ms) in the milestone 2 report.
3. **Playable online, plain:** registration, `blockyBots.ts`, party, the Guild Hall, host/join/play/watch, the setup page, and a plain board and shelf wired to `act`. Play one bot game end to end before going on.
4. **Art direction:** load frontend-design, write ART.md, build `/blocky/mock`, then **Gate A0**. Then the art components and the gallery, then **Gate A**.
5. **Board, shelf, HUD and the clarity contract:** the responsive layout, input (drag, tap, keyboard, snap, fit cycle), the ghost, anchors, the status line, last-move outlines, the fixtures. Then **Gate B**.
6. **Animation layer:** `timing.ts`, `fx.ts`, `useBlockyFx`, every 7.3 animation, growth stages, the scenes gallery and the bot pacing. Then **Gate C**, then **Gate E**.
7. **Menu and polish:** the menu, picker card, the Guild Hall and setup page (restyled to the mock's materials), cloud curtain, coach marks, How to play, result page, chat bubbles, the time-of-day cycle and guild sprites. Then **Gate F**.
8. **Audio and music** (Sonnet subagent).
9. **`e2e/blocky.spec.ts`** (Sonnet subagent):
   - Every spec sets `bly.fx` = off, `bly.coach` = done and `bly.botMs` = 30, plus `test.setTimeout(180_000)`.
   - Humans play by pressing "Suggest a move" and then ✓.
   - Cover: picker → menu, a local turn with an illegal drop rejected (and its reason shown), a bot game on Duo to the end, a 2-window online game with settings, a spectator, and a reconnect.
   - Then **Gate D**.
10. **Wrap-up and integration:**
    - Add a CLAUDE.md section after Runeshift, in the same style.
    - Confirm the `/` picker card opens `/blocky` and that party follow works.
    - Run `npm run typecheck && npm test && npm run e2e` in full. Everything must pass.
    - Commit and push `feat/blocky`. Then merge it into `main` with `--no-ff` and push `main`, so Blocky is live in the Taitoka library.

**If you're running short of context, cut in this order** (and list what was cut in the summary):
1. The How-to-play demos become static pictures.
2. Guild sprites.
3. The airship and parallax.
4. Growth stage 3.
5. Ambience sounds.

Never cut a gate, the mock-up, the clarity contract, the rules tests, online play, the ghost, or the drop and turn animations.

## 11. Done means
Picker card → menu → every mode playable from start to finish → bots and fuzz pass → gates A0, A, B, C, E, F and D passed by independent reviewers → typecheck, unit and e2e all green → CLAUDE.md updated → PLAN.md fully checked → `feat/blocky` pushed and merged into `main`, and `main` pushed.

Verify before claiming done (superpowers:verification-before-completion). End with a 5-line summary: what's in, the shared files touched, anything deferred, and the unrelated issues you noticed.

## Out of scope
- Ranking or XP, replays, turn timers, and an undo after commit.
- Board sizes other than Classic and Duo, more than 4 players, and a second art theme. Keep the art in `blocky/art/` so one could be added later.
