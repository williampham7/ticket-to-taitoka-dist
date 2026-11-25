import { armyKinds, boardRows, randomPlacement, type ArmyId, type Placement, type PlayerID, type Rank } from '@boboland/shared/src/frontline';
import { placementFromLayout } from './helpers';

/**
 * Ready-made deployments. Each is 4 rows of 10 (3 for the Spotter army) as the owner sees them, front row first;
 * 'F' = command post, 'B' = mine, 'P' = Spotter, numbers = ranks (1 = Operative). Lakes sit in front of columns 3-4 and 7-8 (1-based),
 * so pieces there are shielded and the lanes are columns 1-2, 5-6 and 9-10.
 */
export interface Preset { id: string; name: string; blurb: string; ranks: Rank[] }

const parse = (rows: string[]): Rank[] =>
  rows.flatMap((r) => r.trim().split(/\s+/).map((t) => (t === 'F' || t === 'B' || t === 'P' ? t : (Number(t) as Rank))));

export const PRESETS: readonly Preset[] = [
  {
    id: 'fortress', name: 'Fortress', blurb: 'Command post in the back-left corner, sealed by mines.',
    ranks: parse([
      '6 2 4 2 8 7 2 4 2 6',
      '5 10 3 2 5 9 2 3 7 5',
      'B 4 6 1 8 3 B 2 4 3',
      'F B 7 3 B 5 2 B 6 B',
    ]),
  },
  {
    id: 'blitz', name: 'Blitz', blurb: 'Scouts and heavy officers up front for a fast opening.',
    ranks: parse([
      '2 10 2 5 2 2 6 9 2 2',
      '7 4 3 6 8 7 4 5 3 8',
      '3 6 1 4 B 5 2 4 B 3',
      'B 3 7 5 6 2 B B F B',
    ]),
  },
  {
    id: 'keep', name: 'Center Keep', blurb: 'Command post mid back row with a mine cap; mines also plug the lake lanes.',
    ranks: parse([
      '2 6 B 2 7 2 9 B 4 2',
      '5 3 4 2 8 10 2 5 3 6',
      '4 7 3 5 B B 1 6 8 2',
      '3 2 5 B F B 7 6 4 3',
    ]),
  },
  {
    id: 'bluff', name: 'Bluff', blurb: 'A mined decoy corner on the left; the real command post hides on the right.',
    ranks: parse([
      '2 5 B 2 6 2 7 B 2 4',
      '6 9 2 3 10 8 3 2 5 7',
      'B 3 4 5 1 6 4 8 3 B',
      'B 7 B 2 5 6 2 3 4 F',
    ]),
  },
];

/** Spotter army: 3 rows of 10 on the 8-row board, the front row right on the lakes. */
export const SPOTTER_PRESETS: readonly Preset[] = [
  {
    id: 'watch', name: 'Watchtower', blurb: 'Spotters lead the outer lanes; the command post sits in a corner beside a mine.',
    ranks: parse([
      '2 P 5 6 2 3 6 7 P 2',
      '4 10 3 5 8 9 4 3 8 2',
      'F B 1 3 B 7 5 4 6 B',
    ]),
  },
  {
    id: 'bastion', name: 'Bastion', blurb: 'Command post capped by three mines; Spotters on both flanks.',
    ranks: parse([
      'P 2 6 2 7 2 5 2 6 P',
      '4 3 B 8 10 9 8 3 5 4',
      '3 B F B 1 7 6 5 4 3',
    ]),
  },
  {
    id: 'ambush', name: 'Ambush', blurb: 'Mines build a decoy on the right; the real command post hides unmined on the left.',
    ranks: parse([
      '5 2 7 P 3 3 P 6 2 4',
      '2 8 4 10 6 5 9 8 B 2',
      'F 3 1 6 5 7 4 B 3 B',
    ]),
  },
];

export const presetsFor = (army: ArmyId = 'classic'): readonly Preset[] => (army === 'spotter' ? SPOTTER_PRESETS : PRESETS);

export const presetPlacement = (me: PlayerID, p: Preset, army: ArmyId = 'classic'): Placement => placementFromLayout(me, p.ranks, boardRows(army));

/** How many of each rank are still to be placed. */
export function remaining(placement: Placement, army: ArmyId = 'classic'): Map<Rank, number> {
  const left = new Map<Rank, number>(armyKinds(army).map((k) => [k.rank, k.count]));
  for (const p of placement) left.set(p.rank, (left.get(p.rank) ?? 0) - 1);
  return left;
}

/** Put a piece of `rank` on `pos` (an own-zone square); a piece already there goes back to the tray. */
export function placeAt(placement: Placement, pos: number, rank: Rank, army: ArmyId = 'classic'): Placement {
  if ((remaining(placement, army).get(rank) ?? 0) <= 0) return placement;
  return [...placement.filter((p) => p.pos !== pos), { pos, rank }];
}

export const removeAt = (placement: Placement, pos: number): Placement => placement.filter((p) => p.pos !== pos);

/** Move the piece on `from` to `to`; if `to` is taken the two swap. */
export function moveTo(placement: Placement, from: number, to: number): Placement {
  const a = placement.find((p) => p.pos === from);
  if (!a || from === to) return placement;
  const b = placement.find((p) => p.pos === to);
  return placement.map((p) => (p === a ? { pos: to, rank: a.rank } : p === b ? { pos: from, rank: b.rank } : p));
}

/** Fill every empty square of my zone with the pieces still in the tray, at random. */
export function fillRest(me: PlayerID, placement: Placement, rnd: () => number, army: ArmyId = 'classic'): Placement {
  const taken = new Set(placement.map((p) => p.pos));
  const empty = randomPlacement(me, rnd, army).map((p) => p.pos).filter((pos) => !taken.has(pos));
  const bag: Rank[] = [];
  for (const [rank, n] of remaining(placement, army)) for (let i = 0; i < n; i++) bag.push(rank);
  for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  return [...placement, ...bag.map((rank, i) => ({ pos: empty[i], rank }))];
}
