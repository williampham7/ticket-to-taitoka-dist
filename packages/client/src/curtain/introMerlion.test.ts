import { describe, expect, it } from 'vitest';
import { fakeAudioContext } from '../lib/fakeAudio.testutil';
import { playMerlionIntro, playMerlionWaiting } from './introMerlion';

/** the shared fake plus the delay node the cue rig's echo uses */
function fake() {
  const f = fakeAudioContext();
  Object.assign(f.ctx, { createDelay: () => ({ connect: (n: unknown) => n, delayTime: { value: 0 } }) });
  return f;
}

describe('merlion intro cues', () => {
  for (const [name, play, maxEnd] of [['waiting', playMerlionWaiting, 3.3], ['opening', playMerlionIntro, 6]] as const) {
    it(`${name}: schedules only valid values and stops every voice in time`, () => {
      const f = fake();
      play({ audio: () => f.ctx as AudioContext, volume: () => 0.8 });
      expect(f.problems).toEqual([]);
      expect(f.voices()).toBeGreaterThan(10);
      expect(f.lastStop()).toBeLessThan(maxEnd);
    });
    it(`${name}: silent when muted or at zero volume`, () => {
      const f = fake();
      play({ audio: () => null, volume: () => 1 });
      play({ audio: () => f.ctx as AudioContext, volume: () => 0 });
      expect(f.voices()).toBe(0);
    });
  }
});
