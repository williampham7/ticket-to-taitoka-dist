import type { FleetView, PlayerID } from '@boboland/shared/src/fleet';

/** Whose screen pass-and-play shows: the placer still to deploy, the player to move, or whoever still has to confirm the next round. */
export function seatToShow(v: FleetView): PlayerID {
  if (v.stage === 'placement') return v.sides['0'].deployed ? '1' : '0';
  if (v.stage === 'roundEnd') return v.sides['0'].ready ? '1' : '0';
  return v.turn;
}
