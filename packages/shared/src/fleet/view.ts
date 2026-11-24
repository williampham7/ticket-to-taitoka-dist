import { other, type PlayerID } from './board';
import { SHIP_CLASSES, type ShipClass } from './ships';
import {
  actionErrorFor, isOpen, seenShots, weaponReadyFor, type FleetAction, type FleetState, type Report, type SeenCell, type Side, type Stats,
} from './rules';
import type { WeaponId } from './weapons';

/** A ship as one player sees it: squares/hits/shield only for own ships, sunk ships they know of, and after the round. */
export interface ShipView { cls: ShipClass; sunk: boolean; squares?: number[]; hits?: number[]; shield?: boolean }

export interface SideView {
  deployed: boolean;
  ready: boolean;
  turns: number;
  fleet: ShipView[];
  /** this side's shots on the other grid (public) */
  shots: SeenCell[];
  // own side (or revealed) only:
  decoy?: number | null;
  decoyHit?: boolean;
  loadout?: WeaponId[];
  charge?: Partial<Record<WeaponId, number>>;
  spent?: WeaponId[];
  mineLive?: boolean;
  // revealed only:
  mine?: number | null;
  stats?: Stats;
}

export type ViewReport = Omit<Report, 'cells'> & { cells: { sq: number; r: SeenCell }[] };

export interface FleetView extends Omit<FleetState, 'sides' | 'log'> {
  sides: Record<PlayerID, SideView>;
  log: ViewReport[];
  /** the round (or match) is over: everything is shown */
  revealed: boolean;
}

const classOrder = (c: ShipClass) => SHIP_CLASSES.indexOf(c);

function fullSide(side: Side, shots: SeenCell[], revealed: boolean): SideView {
  const v: SideView = {
    deployed: side.deployed, ready: side.ready, turns: side.turns,
    fleet: side.ships.map((s) => ({ cls: s.cls, sunk: s.sunk, squares: [...s.squares], hits: [...s.hits], shield: s.shield })),
    shots,
    decoy: side.decoy, decoyHit: side.decoyHit, loadout: [...side.loadout], charge: { ...side.charge }, spent: [...side.spent],
    mineLive: side.mine !== null,
  };
  if (revealed) {
    v.mine = side.mine;
    v.stats = { ...side.stats };
  }
  return v;
}

function publicSide(side: Side, shots: SeenCell[], battleStarted: boolean): SideView {
  const fleet: ShipView[] = !battleStarted ? [] : side.ships
    .map((s): ShipView => (s.sunk ? { cls: s.cls, sunk: true, squares: [...s.squares] } : { cls: s.cls, sunk: false }))
    .sort((a, b) => classOrder(a.cls) - classOrder(b.cls));
  return { deployed: side.deployed, ready: side.ready, turns: side.turns, fleet, shots };
}

/**
 * What `viewer` may see of the full state. This is the only place hidden information is filtered:
 * - placement: the other side is only `deployed`;
 * - battle: enemy ships show their class, and their squares only once sunk;
 *   enemy decoy, loadout, charge and mine never appear; my own live mine shows only as `mineLive`;
 *   a Sea Mine drop square reaches only the player who dropped it;
 * - roundEnd / over: everything is shown to everyone.
 * A spectator (`viewer` null) is nobody's side.
 */
export function viewFor(G: FleetState, viewer: string | null | undefined): FleetView {
  const revealed = G.stage === 'roundEnd' || G.stage === 'over';
  const started = G.stage !== 'placement';
  const sides = {} as Record<PlayerID, SideView>;
  for (const p of ['0', '1'] as PlayerID[]) {
    const side = G.sides[p];
    const shots: SeenCell[] = seenShots(G, p);
    sides[p] = revealed || viewer === p ? fullSide(side, shots, revealed) : publicSide(side, shots, started);
  }
  const log: ViewReport[] = G.log.map((r) => {
    const out: ViewReport = { ...r, cells: r.cells.map((c) => ({ ...c })), sunk: [...r.sunk] };
    if (revealed) return out;
    if (r.kind === 'weapon' && r.weapon === 'seaMine' && viewer !== r.by && r.cells.length === 0) delete out.anchor;
    return out;
  });
  return { ...G, sides, log, revealed };
}

/* ---------- legal actions from a view (bots, UI) ---------- */

export const viewAfloat = (side: SideView): number => side.fleet.filter((s) => !s.sunk).length;

export function viewWeaponReady(V: FleetView, me: PlayerID, id: WeaponId): boolean {
  const side = V.sides[me];
  if (V.mode !== 'super' || !side.loadout || !side.charge || !side.spent) return false;
  return weaponReadyFor({ loadout: side.loadout, charge: side.charge, spent: side.spent, mineLive: !!side.mineLive }, id);
}

export function viewSalvoSize(V: FleetView, me: PlayerID): number {
  return Math.min(viewAfloat(V.sides[me]), V.sides[me].shots.filter(isOpen).length);
}

/** The same legality check as the rules, from what `me` can see. */
export function viewActionError(V: FleetView, me: PlayerID, a: FleetAction): string | undefined {
  if (V.stage !== 'battle') return 'not in battle';
  if (V.turn !== me) return 'not your turn';
  return actionErrorFor(V.mode, V.sides[me].shots, (id) => viewWeaponReady(V, me, id), viewSalvoSize(V, me), a);
}

/** Enemy ship classes still afloat as `me` knows them. */
export const enemyAfloat = (V: FleetView, me: PlayerID): ShipClass[] =>
  V.sides[other(me)].fleet.filter((s) => !s.sunk).map((s) => s.cls);
