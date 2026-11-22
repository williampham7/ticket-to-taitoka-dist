# Archived: the original Europe intro ("art-deco doors")

The Europe (`rail` theme) enter-the-game curtain as it was before commit `e826ba0`
(the sleeping-car platform rebuild). Kept here so it can be brought back.

**What it looks like:** two lacquered art-deco carriage doors filling the screen, with brass
inlay, green-enamel sunbursts and an enamel title plaque split across the seam. Opening: the brass
catch turns, the doors swing inward, golden light floods through, steam billows, and everything
fades to the board.

Nothing imports these files, so they are not part of the app. They still typecheck.

## How to switch back

1. Copy `RailCurtain.tsx` and `rail.css` from this folder over the live ones in
   `packages/client/src/curtain/`.
2. In the copied `RailCurtain.tsx`, change the import back to `from './EnterCurtain'`.
3. Optional: the new waiting sound (`playRailWaiting` in `introRail.ts`) was written for the platform
   scene. To drop it, remove `rail: playRailWaiting` from `WAITING_CUES` in `EnterCurtain.tsx`.
   The opening sound (`playRailIntro`) is the same one this version used, so it needs no change.

Alternatively, from git: `git checkout 2fd3e18 -- packages/client/src/curtain/RailCurtain.tsx packages/client/src/curtain/rail.css`
(the tag `europe-intro-doors` points at the same commit).
