/**
 * Runeshift: tiles, the fixed layout, treasures and heroes (data only).
 * An opening mask has N=1, E=2, S=4, W=8. Cells are `r * 7 + c`, row 0 at the top.
 */
export const N = 1, E = 2, S = 4, W = 8;
export const SIZE = 7;
export const CELLS = SIZE * SIZE;
export const DIRS = [
  { bit: N, opp: S, dr: -1, dc: 0 },
  { bit: E, opp: W, dr: 0, dc: 1 },
  { bit: S, opp: N, dr: 1, dc: 0 },
  { bit: W, opp: E, dr: 0, dc: -1 },
] as const;

/** Rotate an opening mask a quarter turn clockwise, `times` times. */
export function rotMask(m: number, times = 1): number {
  let x = m;
  for (let i = 0; i < ((times % 4) + 4) % 4; i++) x = ((x << 1) | (x >> 3)) & 15;
  return x;
}
export const I_MASK = N | S;
export const L_MASK = N | E;
export const T_MASK = E | S | W;
export type Shape = 'I' | 'L' | 'T';
export const shapeOf = (m: number): Shape => {
  const bits = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
  return bits === 3 ? 'T' : m === 5 || m === 10 ? 'I' : 'L';
};

export const cell = (r: number, c: number) => r * SIZE + c;
export const rc = (i: number): [number, number] => [Math.floor(i / SIZE), i % SIZE];
export const isFixed = (i: number) => { const [r, c] = rc(i); return r % 2 === 0 && c % 2 === 0; };

export const OBJECTS = ['harp', 'slipper', 'crystal', 'musicbox', 'sceptre', 'watch', 'lantern', 'teapot', 'apple', 'wheel', 'coin', 'beans'] as const;
export const CREATURES = ['unicorn', 'goose', 'frog', 'fox', 'griffin', 'fairy', 'gnome', 'tortoise', 'bear', 'rose', 'phoenix', 'comb'] as const;
export type TreasureId = (typeof OBJECTS)[number] | (typeof CREATURES)[number];
export const TREASURE_IDS: TreasureId[] = [...OBJECTS, ...CREATURES];
export const TREASURE_NAME: Record<TreasureId, string> = {
  harp: 'Golden Harp', slipper: 'Glass Slipper', crystal: 'Crystal Ball', musicbox: 'Music Box', sceptre: 'Royal Sceptre',
  watch: 'Pocket Watch', lantern: 'Star Lantern', teapot: 'Silver Teapot', apple: 'Golden Apple', wheel: 'Spinning Wheel',
  coin: 'Wishing Coin', beans: 'Magic Beans',
  unicorn: 'Unicorn', goose: 'Golden Goose', frog: 'Frog Prince', fox: 'Snow Fox', griffin: 'Griffin Chick', fairy: 'Fairy',
  gnome: 'Garden Gnome', tortoise: 'Wise Tortoise', bear: 'Sleepy Bear', rose: 'Enchanted Rose', phoenix: 'Phoenix Feather', comb: "Mermaid's Comb",
};

export interface Tile { id: number; m: number; t?: TreasureId }

/** The 16 fixed tiles: corners are homes (L), edge T tiles closed toward the edge, the centre four a pinwheel. */
export const FIXED: Record<number, { m: number; t?: TreasureId }> = {
  [cell(0, 0)]: { m: E | S }, [cell(0, 6)]: { m: S | W }, [cell(6, 6)]: { m: N | W }, [cell(6, 0)]: { m: N | E },
  [cell(0, 2)]: { m: E | S | W, t: 'harp' }, [cell(0, 4)]: { m: E | S | W, t: 'slipper' },
  [cell(2, 0)]: { m: N | E | S, t: 'crystal' }, [cell(2, 2)]: { m: E | S | W, t: 'musicbox' },
  [cell(2, 4)]: { m: N | S | W, t: 'sceptre' }, [cell(2, 6)]: { m: N | S | W, t: 'watch' },
  [cell(4, 0)]: { m: N | E | S, t: 'lantern' }, [cell(4, 2)]: { m: N | E | S, t: 'teapot' },
  [cell(4, 4)]: { m: N | E | W, t: 'apple' }, [cell(4, 6)]: { m: N | S | W, t: 'wheel' },
  [cell(6, 2)]: { m: N | E | W, t: 'coin' }, [cell(6, 4)]: { m: N | E | W, t: 'beans' },
};
/** Home corners in turn order: top-left, top-right, bottom-right, bottom-left. */
export const HOMES = [cell(0, 0), cell(0, 6), cell(6, 6), cell(6, 0)];

/** The 34 movable tiles (ids 16-49), before shuffling: 12 I, 16 L (6 with creatures), 6 T (6 with creatures). */
export function movableTiles(): Tile[] {
  const out: Tile[] = [];
  let id = 16;
  for (let k = 0; k < 12; k++) out.push({ id: id++, m: I_MASK });
  for (let k = 0; k < 16; k++) out.push({ id: id++, m: L_MASK, ...(k < 6 ? { t: CREATURES[k] } : {}) });
  for (let k = 0; k < 6; k++) out.push({ id: id++, m: T_MASK, t: CREATURES[6 + k] });
  return out;
}

/** Insertion points, clockwise from the top-left: N1 N3 N5, E1 E3 E5, S5 S3 S1, W5 W3 W1. */
export type Side = 'N' | 'E' | 'S' | 'W';
export const INSERTS: { side: Side; line: number }[] = [
  { side: 'N', line: 1 }, { side: 'N', line: 3 }, { side: 'N', line: 5 },
  { side: 'E', line: 1 }, { side: 'E', line: 3 }, { side: 'E', line: 5 },
  { side: 'S', line: 5 }, { side: 'S', line: 3 }, { side: 'S', line: 1 },
  { side: 'W', line: 5 }, { side: 'W', line: 3 }, { side: 'W', line: 1 },
];
const OPP: Record<Side, Side> = { N: 'S', S: 'N', E: 'W', W: 'E' };
export const opposite = (at: number) => INSERTS.findIndex((x) => x.side === OPP[INSERTS[at].side] && x.line === INSERTS[at].line);
/** The cells of an insertion's line, from the insertion end to the far end. */
export function lineCells(at: number): number[] {
  const { side, line } = INSERTS[at];
  const k = [0, 1, 2, 3, 4, 5, 6];
  if (side === 'N') return k.map((r) => cell(r, line));
  if (side === 'S') return k.map((r) => cell(6 - r, line));
  if (side === 'W') return k.map((c) => cell(line, c));
  return k.map((c) => cell(line, 6 - c));
}

/** The four heroes (seat data `hero` / setupData `heroes` hold the index). Colours live in the client. */
export const HEROES = ['knight', 'ranger', 'sorceress', 'bard'] as const;
export type HeroId = (typeof HEROES)[number];
export const HERO_NAME: Record<HeroId, string> = { knight: 'Knight', ranger: 'Ranger', sorceress: 'Sorceress', bard: 'Bard' };
