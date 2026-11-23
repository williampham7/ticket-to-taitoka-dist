// A tiny offline Web Audio renderer (Node has no AudioContext): just enough of the API the theme voices use
// (oscillators, gains, biquads, buffer sources, set/linear/exponential automation), rendered sample by sample.
// Each node only sums the inputs that are sounding, so the whole song renders in a few seconds.
// ---------------------------------------------------------------------------------------------

type Ev = { kind: 'set' | 'lin' | 'exp'; v: number; t: number };
class Param {
  events: Ev[] = [];
  private i = 0;
  private pv: number;
  private pt = 0;
  constructor(public value: number) { this.pv = value; }
  setValueAtTime(v: number, t: number) { this.events.push({ kind: 'set', v, t }); }
  linearRampToValueAtTime(v: number, t: number) { this.events.push({ kind: 'lin', v, t }); }
  exponentialRampToValueAtTime(v: number, t: number) {
    if (!(v > 0)) throw new Error(`exponential ramp to ${v}`);
    this.events.push({ kind: 'exp', v, t });
  }
  setTargetAtTime(v: number, t: number) { this.events.push({ kind: 'set', v, t }); }
  cancelScheduledValues() { this.events = []; }
  /** value at time t; t only moves forward */
  at(t: number): number {
    // a source starting at t is rounded to its nearest sample, which can be half a sample early: never read the default before the first event
    t += 6e-5;
    if (!this.events.length) return this.value;
    if (this.i === 0 && this.pt === 0) this.pv = this.value;
    while (this.i < this.events.length && this.events[this.i].t <= t) {
      this.pv = this.events[this.i].v;
      this.pt = this.events[this.i].t;
      this.i++;
    }
    const next = this.events[this.i];
    if (!next || next.kind === 'set') return this.pv;
    const k = (t - this.pt) / (next.t - this.pt);
    return next.kind === 'lin' ? this.pv + (next.v - this.pv) * k : this.pv * (next.v / this.pv) ** k;
  }
}

abstract class Node {
  inputs: Node[] = [];
  private sorted = false;
  private ptr = 0;
  private active: Node[] = [];
  private lastN = -1;
  private lastV = 0;
  private w?: [number, number];
  constructor(protected c: OfflineCtx) {}
  connect<T>(d: T): T { (d as unknown as Node).inputs.push(this); return d; }
  window(): [number, number] {
    if (!this.w) {
      let lo = Infinity, hi = -Infinity;
      for (const n of this.inputs) { const [a, b] = n.window(); lo = Math.min(lo, a); hi = Math.max(hi, b); }
      this.w = [lo, hi];
    }
    return this.w;
  }
  protected sumIn(n: number): number {
    if (!this.sorted) {
      this.inputs.sort((x, y) => x.window()[0] - y.window()[0]);
      this.sorted = true;
    }
    while (this.ptr < this.inputs.length && this.inputs[this.ptr].window()[0] <= n) this.active.push(this.inputs[this.ptr++]);
    let s = 0, keep = 0;
    for (const x of this.active) {
      if (x.window()[1] < n) continue;
      this.active[keep++] = x;
      s += x.out(n);
    }
    this.active.length = keep;
    return s;
  }
  out(n: number): number {
    if (n !== this.lastN) { this.lastN = n; this.lastV = this.compute(n); }
    return this.lastV;
  }
  protected abstract compute(n: number): number;
}

abstract class Source extends Node {
  start0 = Infinity;
  stop0 = Infinity;
  start(t = 0) { this.start0 = Math.round(t * this.c.sampleRate); }
  stop(t = 0) { this.stop0 = Math.round(t * this.c.sampleRate); }
  window(): [number, number] { return [this.start0, this.stop0]; }
}

class Osc extends Source {
  type: OscillatorType = 'sine';
  frequency = new Param(440);
  detune = new Param(0);
  private phase = 0;
  protected compute(n: number) {
    if (n < this.start0 || n >= this.stop0) return 0;
    const t = n / this.c.sampleRate;
    const p = this.phase;
    this.phase = (p + (this.frequency.at(t) * 2 ** (this.detune.at(t) / 1200)) / this.c.sampleRate) % 1;
    switch (this.type) {
      case 'triangle': return 1 - 4 * Math.abs(p - 0.5);
      case 'square': return p < 0.5 ? 1 : -1;
      case 'sawtooth': return 2 * p - 1;
      default: return Math.sin(2 * Math.PI * p);
    }
  }
}

class BufSrc extends Source {
  buffer: { data: Float32Array } | null = null;
  loop = false;
  protected compute(n: number) {
    if (n < this.start0 || n >= this.stop0 || !this.buffer) return 0;
    const d = this.buffer.data, i = n - this.start0;
    return this.loop ? d[i % d.length] : (d[i] ?? 0);
  }
}

class Gain extends Node {
  gain = new Param(1);
  protected compute(n: number) { return this.sumIn(n) * this.gain.at(n / this.c.sampleRate); }
}

class Biquad extends Node {
  type: BiquadFilterType = 'lowpass';
  frequency = new Param(350);
  Q = new Param(1);
  gain = new Param(0);
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  private key = '';
  private k = [1, 0, 0, 0, 0];
  protected compute(n: number) {
    const t = n / this.c.sampleRate, sr = this.c.sampleRate;
    const f = Math.min(sr * 0.45, this.frequency.at(t)), q = Math.max(0.05, this.Q.at(t)), gdb = this.gain.at(t);
    const key = `${f}|${q}|${gdb}`;
    if (key !== this.key) {
      this.key = key;
      const w = (2 * Math.PI * f) / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q), A = 10 ** (gdb / 40);
      let b: number[], a: number[];
      if (this.type === 'highpass') { b = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2]; a = [1 + al, -2 * cs, 1 - al]; }
      else if (this.type === 'bandpass') { b = [al, 0, -al]; a = [1 + al, -2 * cs, 1 - al]; }
      else if (this.type === 'peaking') { b = [1 + al * A, -2 * cs, 1 - al * A]; a = [1 + al / A, -2 * cs, 1 - al / A]; }
      else { b = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2]; a = [1 + al, -2 * cs, 1 - al]; }
      this.k = [b[0] / a[0], b[1] / a[0], b[2] / a[0], a[1] / a[0], a[2] / a[0]];
    }
    const x = this.sumIn(n), [b0, b1, b2, a1, a2] = this.k;
    const y = b0 * x + b1 * this.x1 + b2 * this.x2 - a1 * this.y1 - a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

class Dest extends Node {
  protected compute(n: number) { return this.sumIn(n); }
  window(): [number, number] { return [-Infinity, Infinity]; }
}

export class OfflineCtx {
  currentTime = 0;
  destination: Dest;
  constructor(public sampleRate: number) { this.destination = new Dest(this); }
  createOscillator() { return new Osc(this); }
  createGain() { return new Gain(this); }
  createBiquadFilter() { return new Biquad(this); }
  createBufferSource() { return new BufSrc(this); }
  createBuffer(_ch: number, length: number) {
    const data = new Float32Array(length);
    return { data, getChannelData: () => data };
  }
  render(seconds: number): Float32Array {
    const out = new Float32Array(Math.ceil(seconds * this.sampleRate));
    for (let n = 0; n < out.length; n++) out[n] = this.destination.out(n);
    return out;
  }
}

// ---------------------------------------------------------------------------------------------
