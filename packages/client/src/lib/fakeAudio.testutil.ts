/**
 * A recording stand-in for the bits of Web Audio the sound sets use (Node has no AudioContext), so a test can
 * check every scheduled value: finite numbers, positive exponential-ramp targets, and nothing left playing for long.
 * Test helper only (the same checks as soundRail.test.ts).
 */
export function fakeAudioContext() {
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
    createBufferSource: () => ({ ...source(), buffer: null, loop: false }),
    createBuffer: (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  };
  return { ctx: ctx as unknown as BaseAudioContext, problems, lastStop: () => lastStop, voices: () => voices };
}
