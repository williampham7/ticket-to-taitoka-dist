import { describe, expect, it } from 'vitest';
import { createHsrSfx } from './soundHsr';
import { createMerlionSfx } from './soundMerlion';
import { fakeAudioContext } from './fakeAudio.testutil';

type Sfx = ReturnType<typeof createMerlionSfx>;
const play = (sfx: Sfx, name: keyof Sfx) => {
  if (name === 'claim') sfx.claim([0.5, 0.7, 0.9], 1.2, 0.2);
  else if (name === 'count') sfx.count(10);
  else (sfx[name] as () => void)();
};

describe('Singapore sound set (merlion theme)', () => {
  const names = Object.keys(createMerlionSfx({ audio: () => null, volume: () => 1 })) as (keyof Sfx)[];

  it('has exactly the same API as the other sets', () => {
    const env = { audio: () => null, volume: () => 1 };
    expect(Object.keys(createMerlionSfx(env)).sort()).toEqual(Object.keys(createHsrSfx(env)).sort());
  });

  it('every sound schedules only finite values and positive exponential ramps, and is short', () => {
    for (const name of names) {
      for (const vol of [1, 0.3, 0]) {
        const f = fakeAudioContext();
        play(createMerlionSfx({ audio: () => f.ctx, volume: () => vol }), name);
        expect(f.problems, `${name} at volume ${vol}`).toEqual([]);
        expect(f.voices(), name).toBeGreaterThan(0);
        expect(f.lastStop(), name).toBeLessThanOrEqual(name === 'endGame' ? 5 : 2.5);
      }
    }
  });

  it('stays silent when there is no audio (muted)', () => {
    const sfx = createMerlionSfx({ audio: () => null, volume: () => 1 });
    expect(() => { for (const k of names) play(sfx, k); }).not.toThrow();
  });
});
