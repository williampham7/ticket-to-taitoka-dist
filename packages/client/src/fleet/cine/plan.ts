/**
 * Which cinematic a report plays, from what the viewer may know: the report as filtered for them and their own fleet. The attacker never learns which ship a hit struck; the
 * defender knows their own ship. Pure, unit-tested.
 */
import { other, type PlayerID, type ShipClass, type ShipView, type ViewReport, type WeaponId } from '@boboland/shared/src/fleet';

export type Delivery = 'shell' | 'salvo' | 'mineBlast' | WeaponId;
export type Impact = 'splash' | 'hit' | 'deflect' | 'none';

export interface ScenePlan {
  delivery: Delivery | null;
  impact: Impact;
  /** the struck ship's class, only for its owner */
  hitClass: ShipClass | null;
  sinks: ShipClass[];
  /** the viewer is the one being shot at */
  incoming: boolean;
}

export function planScenes(r: ViewReport, viewer: PlayerID | null, ownFleet: readonly ShipView[] | null): ScenePlan {
  const incoming = viewer !== null && viewer === other(r.by);
  const delivery: Delivery = r.kind === 'mine' ? 'mineBlast' : r.kind === 'salvo' ? 'salvo' : r.kind === 'weapon' && r.weapon ? r.weapon : 'shell';
  const rs = r.cells.map((c) => c.r);
  const impact: Impact = rs.includes('hit') || rs.includes('sunk') ? 'hit' : rs.includes('deflect') ? 'deflect'
    : rs.includes('miss') ? 'splash' : 'none';
  let hitClass: ShipClass | null = null;
  if (incoming && ownFleet && (impact === 'hit' || impact === 'deflect')) {
    const cell = r.cells.find((c) => c.r === (impact === 'hit' ? 'hit' : 'deflect') || (impact === 'hit' && c.r === 'sunk'));
    hitClass = ownFleet.find((s) => cell && s.squares?.includes(cell.sq))?.cls ?? null;
  }
  return { delivery, impact, hitClass, sinks: [...r.sunk], incoming };
}
