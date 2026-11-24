import { describe, expect, it } from 'vitest';
import { WEAPON_IDS, WEAPONS } from '@boboland/shared/src/fleet';
import { createFleetSfx, type FleetSfx } from './sound';
import { fakeAudioContext } from '../lib/fakeAudio.testutil';

const names = Object.keys(createFleetSfx({ audio: () => null, volume: () => 1 })) as (keyof FleetSfx)[];
const play = (sfx: FleetSfx, name: keyof FleetSfx) => {
  if (name === 'weapon') for (const w of WEAPON_IDS) sfx.weapon(w);
  else (sfx[name] as () => void)();
};

describe('Fleet sound set', () => {
  it('has fire, whistle, splash, hit, sink, alarm, deflect, per-weapon sounds and stingers', () => {
    for (const n of ['fire', 'whistle', 'splash', 'hit', 'sink', 'alarm', 'deflect', 'weapon', 'select', 'win', 'lose'] as const) expect(names).toContain(n);
  });

  it('every sound schedules only finite values and positive exponential ramps, and is short', () => {
    for (const name of names) {
      for (const vol of [1, 0.3, 0]) {
        const f = fakeAudioContext();
        play(createFleetSfx({ audio: () => f.ctx, volume: () => vol }), name);
        expect(f.problems, `${name} at volume ${vol}`).toEqual([]);
        expect(f.voices(), name).toBeGreaterThan(0);
        expect(f.lastStop(), name).toBeLessThanOrEqual(3);
      }
    }
  });

  it('gives every active weapon its own sound', () => {
    for (const w of WEAPON_IDS.filter((x) => !WEAPONS[x].passive)) {
      const f = fakeAudioContext();
      createFleetSfx({ audio: () => f.ctx, volume: () => 1 }).weapon(w);
      expect(f.voices(), w).toBeGreaterThan(0);
    }
  });

  it('stays silent when there is no audio (muted)', () => {
    const sfx = createFleetSfx({ audio: () => null, volume: () => 1 });
    expect(() => { for (const k of names) play(sfx, k); }).not.toThrow();
  });
});
