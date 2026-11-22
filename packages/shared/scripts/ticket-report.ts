/*
 * How balanced are the destination tickets? Prints coverage per city, the point mix, the fewest track
 * segments each ticket needs, the busiest track and near-duplicate trips.
 * Run: npx tsx packages/shared/scripts/ticket-report.ts
 */
import { CITIES, ROUTES, TICKETS } from '../src/map';

const adj = new Map<string, { to: string; len: number; key: string }[]>(CITIES.map((c) => [c.id, []]));
for (const r of ROUTES) {
  if (r.lane === 1) continue; // second track of a double: same cities
  const key = [r.a, r.b].sort().join('-');
  adj.get(r.a)!.push({ to: r.b, len: r.length, key });
  adj.get(r.b)!.push({ to: r.a, len: r.length, key });
}

/** One shortest route (in cars) and the track it uses. */
function shortest(a: string, b: string) {
  const dist = new Map([[a, 0]]), prev = new Map<string, { from: string; key: string }>(), open = new Set([a]);
  while (open.size) {
    let u = '';
    for (const n of open) if (!u || dist.get(n)! < dist.get(u)!) u = n;
    open.delete(u);
    if (u === b) break;
    for (const e of adj.get(u)!) {
      const d = dist.get(u)! + e.len;
      if (d < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, d); prev.set(e.to, { from: u, key: e.key }); open.add(e.to); }
    }
  }
  const edges: string[] = [];
  for (let n = b; n !== a; n = prev.get(n)!.from) edges.unshift(prev.get(n)!.key);
  return edges;
}

/** Fewest track segments between two cities. */
function hops(a: string, b: string) {
  const d = new Map([[a, 0]]), q = [a];
  while (q.length) { const u = q.shift()!; if (u === b) break; for (const e of adj.get(u)!) if (!d.has(e.to)) { d.set(e.to, d.get(u)! + 1); q.push(e.to); } }
  return d.get(b)!;
}

const rows = TICKETS.map((t) => ({ ...t, edges: shortest(t.a, t.b), hops: hops(t.a, t.b) }));
const ends = new Map<string, number>(CITIES.map((c) => [c.id, 0]));
for (const t of rows) for (const c of [t.a, t.b]) ends.set(c, ends.get(c)! + 1);
const use = new Map<string, number>();
for (const t of rows) for (const e of t.edges) use.set(e, (use.get(e) ?? 0) + 1);
const dups: string[] = [];
for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
  const A = new Set(rows[i].edges), B = new Set(rows[j].edges);
  const shared = [...A].filter((e) => B.has(e)).length / new Set([...A, ...B]).size;
  if (shared >= 0.5) dups.push(`${rows[i].id} ~ ${rows[j].id} (${Math.round(shared * 100)}%)`);
}

console.log(`${rows.length} tickets, ${Math.min(...rows.map((t) => t.points))}-${Math.max(...rows.map((t) => t.points))} points`);
console.log(`short (<=9) ${rows.filter((t) => t.points <= 9).length} · medium ${rows.filter((t) => t.points >= 10 && t.points <= 15).length} · long (16+) ${rows.filter((t) => t.points >= 16).length}`);
console.log(`fewest segments: ${[1, 2, 3, 4, 5, 6, 7, 8].map((h) => `${h}:${rows.filter((t) => t.hops === h).length}`).join(' ')}`);
console.log('cities with no ticket:', [...ends].filter(([, n]) => !n).map(([id]) => id).join(', ') || 'none');
console.log('tickets per city:', [...ends].sort((x, y) => y[1] - x[1]).map(([id, n]) => `${id} ${n}`).join(', '));
console.log('busiest track:', [...use].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([e, n]) => `${e} ${n}`).join(', '));
console.log(`trips sharing half their track or more (${dups.length}):`, dups.join(', ') || 'none');
