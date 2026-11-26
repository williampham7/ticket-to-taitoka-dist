# Blocky art bible: "Sky Isles"

Soft clay-and-vinyl toy blocks on a pale floating plateau, high above a sea of cloud. Airy, bright, rounded, tactile. Nothing pixelated, nothing translucent, no grey grid, no primary-colour plastic.

## Palette (hex)
**Sky ramps** (top, middle, horizon), interpolated by progress 0 → 1:
| time | top | mid | horizon |
|---|---|---|---|
| dawn (0) | `#8fb5e0` | `#f4c6c0` | `#fde3c0` |
| noon (0.3) | `#5fb0ea` | `#9fd6f3` | `#e8f6fb` |
| golden (0.6) | `#6c9fd6` | `#f2b878` | `#fde2b0` |
| dusk (0.82) | `#2f3d7a` | `#9a6496` | `#f29e77` |
| night (1) | `#0d1636` | `#1b2a5c` | `#3a4c86` |

**Materials:** stone `#f2ead9` / `#ddd0b5` / `#b9aa8d` / `#8c7e66`; moss `#a9cd78` / `#7fa858` / `#557f3c`; wood `#d9a46a` / `#b47f4b` / `#8a5a31` / `#5e3b1f`; iron `#4a4f5c`; brass `#f6e09a` / `#dcb459` / `#b08732` / `#6f5320`; cloth `#fbf6ec` stitched `#c9b89a`; cloud `#ffffff` / `#eef5fb` / `#cfe0ee`.

**Guilds**: clay, not plastic: muted, with strong top-to-south contrast, and four separate grey levels (Tide darkest, then Ember, Grove, Sun) so they also part in grayscale (top / top-light / south face / east bevel / rim highlight / ink):
| guild | top | light | south | east | rim | ink |
|---|---|---|---|---|---|---|
| Tide (sea glass) | `#3a8aa0` | `#7cc3d2` | `#1d5466` | `#2b7286` | `#d6f0f2` | `#123c48` |
| Sun (sandstone) | `#ecba5a` | `#f6d692` | `#99631f` | `#c48836` | `#fff2d2` | `#5e3a12` |
| Ember (coral clay) | `#db7357` | `#efa48b` | `#8a3727` | `#b35140` | `#ffdccf` | `#5c2218` |
| Grove (leaf) | `#74ad4f` | `#a6d27f` | `#3a6a28` | `#5a963c` | `#e6f5d0` | `#234a18` |

**UI ink** `#2b3550` (blue-black, never pure black); ink-soft `#5b6782`; success `#3f9f62`; warn `#e8a42c`; error `#d9455b`.

## Light, outline, shadow
- **One light**, from the top-left. Highlights sit on top-left edges, south faces and east bevels are the shaded sides.
- **One outline**: 1.5 px (`vector-effect: non-scaling-stroke`), in the guild's ink (UI: `#2b3550` at 70%). Never black.
- **One shadow recipe**: a contact shadow (the piece's silhouette offset down-right 0.06/0.12 cell, ink at 22%) plus soft ambient occlusion (offset 0.12/0.22, ink at 10%). UI surfaces use the same two-layer shadow in CSS (`--bly-shadow`).

## Type
Baloo 2 (display: titles, scores, banners, keys) and Nunito Sans (UI text). Five sizes only: `--t1` 12 px, `--t2` 14 px, `--t3` 18 px, `--t4` 26 px, `--t5` 44 px (scaled by `clamp` on big screens). Numbers use Baloo 2 with tabular figures.

## Block render recipe (per piece, never per cell)
`art/Defs.tsx` builds one `<symbol id="bly-o-<gid>">` per fixed orientation (91) in cell units, from the cell union:
1. **Contact shadow + AO**: the union outline offset (0.06, 0.12) and (0.12, 0.22), ink alpha.
2. **Body** = the union outline (rounded corners r 0.24, inset 0.04 so neighbouring pieces read apart), filled `var(--g-south)` with a neutral vertical gradient (white 12% → ink 18%).
3. **East bevel**: the outline shifted up by the depth (0.21), clipped to the body, `var(--g-east)`: what is left of the body below it is the south face, on exposed south edges only.
4. **Top face**: the outline shifted up 0.21 and left 0.12, clipped to the body, `var(--g-top)`; then a neutral radial gradient (white 35% at the top-left → 0) over it.
5. **Guild pattern**: one alpha `<pattern>` per guild over the top face (white/ink at 14-24%).
6. **Rim highlight**: the top-face outline stroked with a white → transparent gradient running top-left to bottom-right.
7. **Specular glint**: a small white lozenge on the top-left-most cell.
Colour arrives as CSS variables (`--g-top`, `--g-light`, `--g-south`, `--g-east`, `--g-rim`, `--g-ink`) on the `<use>` via a `bly-g-<guild>` class. Gradients are neutral (white/ink alpha) because stops don't inherit through `<use>`. A placed piece is one `<use>` plus a details `<g>`. Same-guild pieces meeting at a corner get a **joint stud** (`#bly-stud`) at the shared corner. About 30% of cells get a seeded micro-detail from the guild's stage set; details sit below the pattern's contrast.

## Guild growth (stage 1 / 2 / 3)
- Tide: ripple → tiny pool → fountain with a glint.
- Sun: carved sun → sundial → obelisk catching light.
- Ember: spark → forge chimney with a wisp → glowing lantern.
- Grove: sprout → flower → round tree that sways.

## Plateau (minimum counts)
Pale carved stone slab; 14+ rim stones in 3 variants (square, long, chipped), 8+ moss clumps, 6+ hanging roots with leaves, 4+ embedded crystals, 1 bird's nest, 2 waterfalls (animated foam, mist into the cloud), 4 corner lanterns (lit from dusk), carved stone sockets (one rounded recess per cell, ambient occlusion on its top-left lip, light on its bottom-right), a weathered compass rose at the centre, a glowing guild sigil on each uncovered start square.

## Sky (5 depth layers)
Gradient → high cirrus → distant islets with thread waterfalls → the mid cloud sea → near wisps. Life: an airship crossing now and then, birds in V formations, sun rays by day, moon and stars at night. Time of day tints the background only.

## Materials (UI surfaces; each has idle, hover/focus, pressed, disabled)
- **Carved pale stone** (`.bly-stone`): stone gradient, inner bevel (light top-left, dark bottom-right), chiselled 2 px border. Hover: lifts 1 px, brighter bevel. Pressed: inset bevel, 1 px down. Disabled: flatter, 55% saturation, no lift.
- **Oiled wood plank** (`.bly-plank`): wood gradient with grain stripes (repeating-linear-gradient), iron brackets at the ends, rope loops above. States as stone.
- **Brass plate** (`.bly-brass`): brass gradient, engraved inner line, four rivets. Hover: warmer sheen sweeps. Pressed: darker, inset.
- **Stitched cloth pennant** (`.bly-pennant`): cream cloth, dashed stitch line inset 5 px, swallow-tail or notch bottom, guild-coloured band. Hover: sways 1°. Active: lifted, glowing edge in the guild colour.
- **Cloud** (`.bly-cloud`): white with bumpy edge (radial-gradient scallops), soft blue underside. Used for bubbles, the curtain and toasts.
- **Carved key** (buttons, `.bly-key`): a stone or brass keycap with 4 px press depth (box-shadow under), icon + label. Pressed: depth 1 px. Focus: a 3 px honey ring (`#ffd25e`) offset 2 px plus the ink outline, never the browser default.

## Motion
Every action plays anticipation → action → impact → settle → residue. Curves: `out-back` `cubic-bezier(.34,1.56,.64,1)` (pops, landings), `out-quint` `cubic-bezier(.22,1,.36,1)` (travel, slides), `in-out-sine` `cubic-bezier(.37,0,.63,1)` (ambient sway, bob). Ambient effects are CSS/SMIL, paused when the tab is hidden, calmed by reduced motion.
