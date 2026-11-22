import { describe, expect, it } from 'vitest';
import { createHsrSfx } from './soundHsr';
import { createRailSfx } from './soundRail';

/**
 * A recording stand-in for the bits of Web Audio the sound sets use (Node has no AudioContext), so the test can
 * check every scheduled value: finite numbers, positive exponential-ramp targets, and nothing left playing for long.
 */
function fakeContext() {
  const problems: string[] = [];
  let lastStop = 0;
  let voices = 0;
  const check = (what: string, v: number) => { if (!Number.isFinite(v)) problems.push(`${what} = ${v}`); };
  const param = (name: string) => {
    let value = 0;
    return {
      get value() { return value; },
      set value(v: number) { check(`${name}.value`, v); value = v; },
      setValueAtTime: (v: number, t: number) => { check(`${name} set`, v); check(`${name} t`, t); },
      linearRampToValueAtTime: (v: number, t: number) => { check(`${name} lin`, v); check(`${name} t`, t); },
      exponentialRampToValueAtTime: (v: number, t: number) => {
        check(`${name} exp`, v);
        check(`${name} t`, t);
        if (!(v > 0)) problems.push(`${name} exp ramp to ${v}`);
      },
      setTargetAtTime: (v: number, t: number) => { check(`${name} target`, v); check(`${name} t`, t); },
    };
  };
  const node = () => ({ connect: (n: unknown) => n });
  const source = () => ({
    ...node(),
    start: (t = 0) => { check('start', t); voices++; },
    stop: (t = 0) => { check('stop', t); lastStop = Math.max(lastStop, t); },
  });
  const ctx = {
    currentTime: 0,
    sampleRate: 48000,
    destination: node(),
    createOscillator: () => ({ ...source(), type: 'sine', frequency: param('frequency'), detune: param('detune') }),
    createGain: () => ({ ...node(), gain: param('gain') }),
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param('filter.frequency'), Q: param('Q'), gain: param('filter.gain') }),
    createBufferSource: () => ({ ...source(), buffer: null }),
    createBuffer: (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, problems, lastStop: () => lastStop, voices: () => voices };
}

const play = (sfx: ReturnType<typeof createRailSfx>, name: keyof ReturnType<typeof createRailSfx>) => {
  if (name === 'claim') sfx.claim([0.5, 0.7, 0.9], 1.2, 0.2);
  else if (name === 'count') sfx.count(10);
  else (sfx[name] as () => void)();
};

describe('European rail sound set', () => {
  it('has exactly the same API as the other sets', () => {
    const env = { audio: () => null, volume: () => 1 };
    expect(Object.keys(createRailSfx(env)).sort()).toEqual(Object.keys(createHsrSfx(env)).sort());
  });

  it('every sound schedules only finite values and positive exponential ramps, and is short', () => {
    for (const name of Object.keys(createRailSfx({ audio: () => null, volume: () => 1 })) as (keyof ReturnType<typeof createRailSfx>)[]) {
      for (const vol of [1, 0.3, 0]) {
        const f = fakeContext();
        play(createRailSfx({ audio: () => f.ctx, volume: () => vol }), name);
        expect(f.problems, `${name} at volume ${vol}`).toEqual([]);
        expect(f.voices(), name).toBeGreaterThan(0);
        expect(f.lastStop(), name).toBeLessThanOrEqual(name === 'endGame' ? 5 : 2.5);
      }
    }
  });

  it('stays silent when there is no audio (muted)', () => {
    const sfx = createRailSfx({ audio: () => null, volume: () => 1 });
    expect(() => { for (const k of Object.keys(sfx) as (keyof typeof sfx)[]) play(sfx, k); }).not.toThrow();
  });
});
