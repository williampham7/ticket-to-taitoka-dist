# Warfront: spec

A modern-warfare game of territory conquest for 2-6 players. It follows the classic territory-conquest board game's rules. The trademarked name never appears.

## Rules (engine: `packages/shared/src/warfront/rules.ts`)
- **Starting armies:** 3p 35, 4p 30, 5p 25, 6p 20.
- **Two players:** 40 each plus a neutral army. Territories are always dealt (14 each, 1 army). Each setup turn is 2 own armies plus 1 neutral army. The neutral army defends but never attacks. Two-player games are World Domination only.
- **Setup:** "Auto-deploy" (the default) deals territories at random. Otherwise players claim one at a time in turn order. Then armies are placed one at a time in turn order, with an "Auto-place the rest" convenience. Turn order is a seeded shuffle.
- **Turn:**
  - Reinforce: `max(3, floor(territories/3))` plus continent bonuses plus sets.
  - Attack: 1-3 dice against 1-2 dice. Pairs are compared highest first and ties go to the defender. A conquest moves in at least the dice rolled. Blitz rolls until the territory falls or 1 army is left.
  - Fortify: one move through connected own territories. Ending the turn without fortifying is fine.
- **Cards:**
  - 42 territory cards (Infantry, Armor and Artillery, 14 each) plus 2 wilds.
  - A set is 3 alike, one of each, or any 2 plus a wild. Global escalation: 4 6 8 10 12 15, then +5.
  - +2 on one pictured territory you own.
  - Trading is mandatory at 5+ cards. One card per turn with a conquest. Reshuffle the discards when the deck runs out.
- **Elimination:** the attacker takes the defeated player's cards. At 6+ the attacker trades down to 4 at once (a mid-turn reinforce), then keeps attacking.
- **Missions** (3+ players): the classic set adapted to these continents, plus "destroy player X". That one becomes 24 territories if X is you, or if someone else destroys X. A mission is won during your own turn.
- **Resign:** your territories turn neutral; the last player standing wins.

## Map (`mapData.ts`, `geometry.ts`)
- An original division of real geography: 42 territories in 6 continents. Bonuses: NA 5, SA 2, EU 5, AF 3, AS 7, OC 2.
- Miller projection, 1600 x 752. Territory shapes are Voronoi cells of the label points, clipped to hand-drawn coastlines. Land borders come from the shared cell edges on land. Straits, sea lanes and land bridges are listed (`SEA_LINKS`). The Bering lane wraps off the board edges.

## Look: "The General's War Table"
- A walnut and brass map table under lamp light, with a satellite-coloured world.
- Owners are shown with acetate overlays (faction colour plus hatch pattern) and die-cast miniature stacks.
- Grease-pencil arrows, brass and steel dice, push-pin flags, a "NEUTRALISED" stamp, laminated intel cards.
- The menu is a general's desk; the result screen is a newspaper front page.
- Fonts: Saira Stencil One, Sora, Manrope. CSS prefix `wf-`.
- Nothing taken from Fleet's look (dark CIC, Barlow) or Frontline's (olive, contours, monospace).
