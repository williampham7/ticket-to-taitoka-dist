import { describe, expect, it } from 'vitest';
import { act, chooseKingdomAction, newGame, viewFor, type KView } from '@boboland/shared/src/kingdom';
import { applyEvent, newEvents } from './fxQueue';

const seeded = (seed: number) => { let a = seed; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; };

describe('Kingdom display queue', () => {
  it('replaying the public log step by step reaches exactly the server view (bot shift + move arriving together)', () => {
    const rng = seeded(4);
    const G = newGame(3, rng, { length: 'short' });
    let shown: KView = viewFor(G, '0');
    let seen = shown.logTotal;
    for (let k = 0; k < 400 && !G.result; k++) {
      // a bot plays its whole turn (shift and move) before the client hears about it
      for (let s = 0; s < 2 && !G.result; s++) act(G, G.current, chooseKingdomAction(viewFor(G, G.current), G.current, 'medium', rng));
      const view = viewFor(G, '0');
      const fresh = newEvents(view, seen)!;
      expect(fresh).not.toBeNull();
      for (const e of fresh) shown = applyEvent(shown, e);
      seen = view.logTotal;
      expect(shown.board).toEqual(view.board);
      expect(shown.spare).toEqual(view.spare);
      expect(shown.pos).toEqual(view.pos);
      expect(shown.found).toEqual(view.found);
      expect(shown.left).toEqual(view.left);
      expect(shown.current).toBe(view.current);
      expect(shown.step).toBe(view.step);
      expect(!!shown.result).toBe(!!view.result);
    }
  });

  it('reports a gap (reconnect or a long absence) so the client jumps instead of replaying', () => {
    const G = newGame(2, seeded(2));
    act(G, G.current, { k: 'shift', at: 0, rot: 0 });
    act(G, G.current, { k: 'move', to: G.pos[G.current] });
    const v = viewFor(G, '0');
    expect(newEvents(v, 0)!.map((e) => e.k)).toEqual(['shift', 'move', 'turn']);
    expect(newEvents(v, v.logTotal)).toEqual([]);
    v.log = v.log.slice(1);
    expect(newEvents(v, 0)).toBeNull();
  });
});
