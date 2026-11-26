/** Outline geometry for a piece moulded from its cells (cell units, y down). Pure, so it is unit-tested. */
export type Cell = [number, number]; // [row, col]
type Pt = [number, number]; // [x, y]

/** The boundary of a cell union as clockwise vertex loops (interior on the right, y down); collinear points dropped. */
export function loops(cells: Cell[]): Pt[][] {
  const edges = new Map<string, Pt[]>();
  const k = (a: Pt, b: Pt) => `${a[0]},${a[1]}>${b[0]},${b[1]}`;
  const all: [Pt, Pt][] = [];
  for (const [r, c] of cells) {
    const tl: Pt = [c, r], tr: Pt = [c + 1, r], br: Pt = [c + 1, r + 1], bl: Pt = [c, r + 1];
    all.push([tl, tr], [tr, br], [br, bl], [bl, tl]);
  }
  const keys = new Set(all.map(([a, b]) => k(a, b)));
  const out = all.filter(([a, b]) => !keys.has(k(b, a)));
  for (const e of out) { const s = `${e[0][0]},${e[0][1]}`; (edges.get(s) ?? edges.set(s, []).get(s)!).push(e[1]); }
  const res: Pt[][] = [];
  while (edges.size) {
    const [startKey, nexts] = edges.entries().next().value as [string, Pt[]];
    const start = startKey.split(',').map(Number) as Pt;
    const loop: Pt[] = [start];
    let cur = start, nxt = nexts.shift()!;
    if (!nexts.length) edges.delete(startKey);
    while (!(nxt[0] === start[0] && nxt[1] === start[1])) {
      loop.push(nxt);
      cur = nxt;
      const key = `${cur[0]},${cur[1]}`;
      const list = edges.get(key)!;
      nxt = list.shift()!;
      if (!list.length) edges.delete(key);
    }
    // drop collinear vertices
    res.push(loop.filter((p, i) => {
      const a = loop[(i - 1 + loop.length) % loop.length], b = loop[(i + 1) % loop.length];
      return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0;
    }));
  }
  return res;
}

/** Move every vertex of an orthogonal clockwise loop inward by d. */
export function inset(loop: Pt[], d: number): Pt[] {
  const n = loop.length;
  return loop.map((p, i) => {
    const a = loop[(i - 1 + n) % n], b = loop[(i + 1) % n];
    const d1 = [Math.sign(p[0] - a[0]), Math.sign(p[1] - a[1])], d2 = [Math.sign(b[0] - p[0]), Math.sign(b[1] - p[1])];
    // inward normal of a clockwise (y down) edge is (-dy, dx)
    return [p[0] + d * (-d1[1] - d2[1]), p[1] + d * (d1[0] + d2[0])] as Pt;
  });
}

const f = (x: number) => +x.toFixed(3);
/** A closed path with every corner rounded by r (convex and concave alike), shifted by (dx, dy). */
export function roundedPath(loop: Pt[], r: number, dx = 0, dy = 0): string {
  const n = loop.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = loop[(i - 1 + n) % n], p = loop[i], b = loop[(i + 1) % n];
    const la = Math.hypot(p[0] - a[0], p[1] - a[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
    const p1: Pt = [p[0] + ((a[0] - p[0]) / la) * ra, p[1] + ((a[1] - p[1]) / la) * ra];
    const p2: Pt = [p[0] + ((b[0] - p[0]) / lb) * rb, p[1] + ((b[1] - p[1]) / lb) * rb];
    d += `${i ? 'L' : 'M'}${f(p1[0] + dx)},${f(p1[1] + dy)}Q${f(p[0] + dx)},${f(p[1] + dy)} ${f(p2[0] + dx)},${f(p2[1] + dy)}`;
  }
  return `${d}Z`;
}

/** The moulded outline of a set of cells: one rounded, inset path per loop. */
export const outline = (cells: Cell[], r = 0.2, ins = 0.035, dx = 0, dy = 0) => loops(cells).map((l) => roundedPath(inset(l, ins), r, dx, dy)).join('');

/** Deterministic 0..1 noise from integers (seeded micro-details, stone variation). */
export function hash(...n: number[]): number {
  let h = 2166136261;
  for (const x of n) { h ^= x + 0x9e3779b9 + (h << 6) + (h >>> 2); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
