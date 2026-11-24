import { describe, expect, it } from 'vitest';
import { BOT_LEVELS, WEAPONS, WEAPON_IDS, other, viewFor, type BestOf, type FleetState, type Mode, type PlayerID } from '../src/fleet';
import { simulate } from './fleetSim';

const GAMES = 500;

/** Neither player's view may hold the other's unsunk ship squares, decoy, loadout or mine, nor its own mine square. */
function assertViewsHide(S: FleetState) {
  if (S.stage !== 'battle') return;
  for (const viewer of ['0', '1'] as PlayerID[]) {
    const v = viewFor(S, viewer);
    const enemy = v.sides[other(viewer)];
    for (const k of ['decoy', 'loadout', 'charge', 'mine', 'mineLive', 'stats']) if (k in enemy) throw new Error(`leak of ${k} to ${viewer}`);
    for (const s of enemy.fleet) if (!s.sunk && s.squares) throw new Error(`ship squares leaked to ${viewer}`);
    if ('mine' in v.sides[viewer]) throw new Error(`own mine square shown to ${viewer}`);
  }
}

function fuzz(mode: Mode) {
  const reasons: Record<string, number> = {};
  const pairs = BOT_LEVELS.flatMap((a) => BOT_LEVELS.map((b) => [a, b] as const));
  const seen = new Set<string>();
  const events = new Set<string>();
  for (let g = 0; g < GAMES; g++) {
    const [l0, l1] = pairs[g % pairs.length];
    const bestOf = ([1, 1, 3, 1, 5] as BestOf[])[g % 5];
    let turn = 0;
    const S = simulate({
      mode, bestOf, levels: { 0: l0, 1: l1 }, seed: g * 7919 + mode.length,
      onTurn: (st) => {
        if (++turn % 9 === 0) assertViewsHide(st);
        for (const r of st.log.slice(-3)) {
          events.add(r.weapon ?? r.kind);
          if (r.cells.some((c) => c.r === 'deflect')) events.add('deflect');
        }
      },
    });
    expect(S.result).not.toBeNull();
    expect(S.stage).toBe('over');
    expect(S.wins[S.result!.winner]).toBe((bestOf + 1) / 2);
    reasons[S.result!.reason] = (reasons[S.result!.reason] ?? 0) + 1;
    seen.add(`${l0}-${l1}`);
  }
  expect(reasons.fleet).toBe(GAMES);
  expect(seen.size).toBe(9);
  if (mode === 'super') {
    // every active weapon was fired, a drifting mine went off, a Shield deflected
    for (const e of [...WEAPON_IDS.filter((w) => !WEAPONS[w].passive), 'mine', 'deflect']) expect(events.has(e), e).toBe(true);
  }
}

describe('fuzz: Fleet bot games', () => {
  for (const mode of ['classic', 'salvo', 'super'] as Mode[]) {
    it(`${mode}: ${GAMES} games, every difficulty pairing, all end with a winner and never leak`, () => fuzz(mode), 120_000);
  }
});
