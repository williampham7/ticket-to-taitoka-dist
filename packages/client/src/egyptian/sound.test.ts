import { describe, expect, it } from 'vitest';
import { createEgwSfx, egwSoundFor, type EgwSfx } from './sound';
import { fakeAudioContext } from '../lib/fakeAudio.testutil';
import type { EgwEvent } from '@boboland/shared/src/egyptian';

const names = Object.keys(createEgwSfx({ audio: () => null, volume: () => 1 })) as (keyof EgwSfx)[];

describe('Egyptian War sounds', () => {
  it('has every sound the game needs', () => {
    for (const n of ['flip', 'slap', 'validSlap', 'falseSlap', 'challenge', 'tryUsed', 'graceTick', 'collect', 'win'] as const) expect(names).toContain(n);
  });
  it('schedules only finite values, positive ramps and short sounds', () => {
    for (const name of names) {
      for (const vol of [1, 0.3, 0]) {
        const f = fakeAudioContext();
        createEgwSfx({ audio: () => f.ctx, volume: () => vol })[name]();
        expect(f.problems, `${name} at ${vol}`).toEqual([]);
        expect(f.voices(), name).toBeGreaterThan(0);
        expect(f.lastStop(), name).toBeLessThanOrEqual(2);
      }
    }
  });
  it('maps events to sounds and stays silent when muted', () => {
    const played: string[] = [];
    const spy = Object.fromEntries(names.map((n) => [n, () => played.push(n)])) as unknown as EgwSfx;
    const e = (kind: string) => ({ seq: 1, at: 0, kind, by: '0', card: 0, penalty: true, how: 'slap' }) as unknown as EgwEvent;
    ['flip', 'slap', 'falseSlap', 'challenge', 'collect', 'win'].forEach((k) => egwSoundFor(e(k), '0', spy));
    expect(played).toEqual(['flip', 'validSlap', 'falseSlap', 'challenge', 'collect', 'win']);
    const silent = createEgwSfx({ audio: () => null, volume: () => 1 });
    expect(() => names.forEach((n) => silent[n]())).not.toThrow();
  });
});
