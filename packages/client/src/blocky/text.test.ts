import { describe, expect, it } from 'vitest';
import { statusLine } from './text';
import { fixture } from './fixtures';

const names = { 0: 'Ana', 1: 'Bo', 2: 'Kit', 3: 'Moss' };
describe('blocky status line', () => {
  it('statusLine covers every state', () => {
    const mid = fixture('mid'), duo = fixture('duo'), three = fixture('three'), end = fixture('end');
    const me = mid.actor, other = mid.order.find((p) => p !== me)!;
    const sharedTurn = (() => { const s = structuredClone(three); const g = s.guilds.find((x) => s.seats[x] === 'shared')!; s.current = g; return s; })();
    const two = fixture('classic2');
    const ui = (o: Partial<{ held: boolean; pending: boolean; pointer: string }>) => ({ held: false, pending: false, pointer: 'touch', names, ...o });
    const rows = {
      myTurnIdleTouch: statusLine(mid, me, ui({})),
      myTurnIdleMouse: statusLine(mid, me, ui({ pointer: 'mouse' })),
      heldTouch: statusLine(mid, me, ui({ held: true })),
      heldMouse: statusLine(mid, me, ui({ held: true, pointer: 'mouse' })),
      pendingTouch: statusLine(mid, me, ui({ held: true, pending: true })),
      pendingMouse: statusLine(mid, me, ui({ held: true, pending: true, pointer: 'mouse' })),
      offTurn: statusLine(mid, other, ui({})),
      offTurnHeld: statusLine(mid, other, ui({ held: true })),
      watching: statusLine(duo, null, ui({})),
      sharedMine: statusLine(sharedTurn, sharedTurn.actor, ui({})),
      twoPlayerClassic: statusLine(two, two.actor, ui({})),
      ended: statusLine(end, '0', ui({})),
    };
    for (const [k, r] of Object.entries(rows)) { expect(r.text, k).toBeTruthy(); expect(r.sub, k).toBeTruthy(); }
    expect(rows.myTurnIdleTouch.step).toBe(0);
    expect(rows.heldTouch.step).toBe(1);
    expect(rows.pendingTouch.step).toBe(2);
    expect(rows.pendingTouch.sub).toMatch(/^Tap ✓/);
    expect(rows.pendingMouse.sub).toMatch(/^Click ✓ or press Enter/);
    expect(rows.offTurn.text).toMatch(/is thinking…$/);
    expect(rows.sharedMine.text).toMatch(/shared guild/);
    expect(rows).toMatchSnapshot();
  });
});
