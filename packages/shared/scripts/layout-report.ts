/* Dev aid: prints layout problems + suggested lengths + colour totals. Run: npx tsx packages/shared/scripts/layout-report.ts */
import { CITIES, ROUTES, cityXY, routeSegment } from '../src/map';

const NODE_R = 14, GAP = 3.5, CAR = 46;
const out: string[] = [];
for (const r of ROUTES) {
  if (r.lane === 1) continue;
  const [[x1, y1], [x2, y2]] = routeSegment(r);
  const d = Math.hypot(x2 - x1, y2 - y1);
  const car = (d - 2 * NODE_R - GAP * (r.length - 1)) / r.length;
  const suggest = Math.max(1, Math.min(6, Math.round((d - 2 * NODE_R + GAP) / (CAR + GAP))));
  if (car < 24 || car > 72 || suggest !== r.length) out.push(`len ${r.id}: d=${d.toFixed(0)} len=${r.length} car=${car.toFixed(0)} suggest=${suggest}`);
}
const uniq = ROUTES.filter((r) => r.lane !== 1);
for (const r of ROUTES) {
  const [p, q] = routeSegment(r);
  for (const c of CITIES) {
    if (c.id === r.a || c.id === r.b) continue;
    const [px, py] = cityXY(c.id);
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const t = Math.max(0, Math.min(1, ((px - p[0]) * dx + (py - p[1]) * dy) / (dx * dx + dy * dy)));
    const dist = Math.hypot(px - (p[0] + t * dx), py - (p[1] + t * dy));
    if (dist < (c.hub ? 34 : 22)) out.push(`near ${r.id} passes ${c.id} at ${dist.toFixed(1)}`);
  }
}
const o = (a: number[], b: number[], c: number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
for (let i = 0; i < ROUTES.length; i++) for (let j = i + 1; j < ROUTES.length; j++) {
  const r = ROUTES[i], s = ROUTES[j];
  if (r.twin === s.id || [r.a, r.b].some((x) => x === s.a || x === s.b)) continue;
  const [p1, p2] = routeSegment(r), [p3, p4] = routeSegment(s);
  if (o(p1, p2, p3) !== o(p1, p2, p4) && o(p3, p4, p1) !== o(p3, p4, p2)) out.push(`cross ${r.id} x ${s.id}`);
}
for (const c of CITIES) {
  const dirs = uniq.filter((r) => r.a === c.id || r.b === c.id).map((r) => {
    const [x0, y0] = cityXY(c.id), [x1, y1] = cityXY(r.a === c.id ? r.b : r.a);
    return { id: r.id, a: Math.atan2(y1 - y0, x1 - x0) };
  });
  for (let i = 0; i < dirs.length; i++) for (let j = i + 1; j < dirs.length; j++) {
    let diff = Math.abs(dirs[i].a - dirs[j].a) * 180 / Math.PI; if (diff > 180) diff = 360 - diff;
    if (diff < 18) out.push(`angle ${c.id}: ${dirs[i].id} vs ${dirs[j].id} = ${diff.toFixed(0)}°`);
  }
}
const totals: Record<string, number> = {};
for (const r of ROUTES) totals[r.color] = (totals[r.color] ?? 0) + r.length;
out.push('totals ' + JSON.stringify(totals) + ' all=' + ROUTES.reduce((s, r) => s + r.length, 0) + ' segments=' + ROUTES.length);
if (process.argv.includes('--xy')) for (const c of CITIES) out.push(`${c.id} ${cityXY(c.id).map((n) => n.toFixed(0)).join(',')}`);
console.log(out.join('\n'));
