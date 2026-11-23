
/** Each edition's accent, for the little map badges on the series card (the same reds, greens and pinks as its own card). */
export const SERIES_CHIP: Record<string, string> = {
  usa: '#b23a2e',
  china: '#1d5fbf',
  europe: '#1f4a3a',
  sf: '#e2557a',
  singapore: '#0f7f7a',
};

type Pt = readonly [number, number];

/** A made-up board: towns, and the routes between them as rows of coloured car slots, like on every map in the series. */
const TOWNS: Record<string, Pt> = {
  a: [30, 58], b: [139, 30], c: [242, 72], d: [170, 132], e: [56, 148],
  f: [345, 34], g: [390, 112], h: [501, 58], i: [570, 138], j: [287, 172], k: [456, 178],
};
const HUB = 'c';

const CAR = {
  red: '#d24a3c', blue: '#3a77c9', green: '#3f9a59', yellow: '#efc23f',
  black: '#1c2033', white: '#f2ecdc', orange: '#e8873a', gray: '#8f96ad',
} as const;

/** Player train colours for the pieces that land on claimed routes. */
const PLAYER = ['#4fc0ff', '#ff5a47', '#ffd34d', '#5fd67a'];

interface Route { from: string; to: string; color: keyof typeof CAR; cars: number; claim?: number }
const ROUTES: Route[] = [
  { from: 'a', to: 'b', color: 'red', cars: 3, claim: 0 },
  { from: 'b', to: 'c', color: 'blue', cars: 3 },
  { from: 'a', to: 'e', color: 'gray', cars: 3 },
  { from: 'e', to: 'd', color: 'green', cars: 3 },
  { from: 'd', to: 'c', color: 'yellow', cars: 3 },
  { from: 'c', to: 'f', color: 'orange', cars: 3 },
  { from: 'f', to: 'h', color: 'black', cars: 5, claim: 2 },
  { from: 'c', to: 'g', color: 'white', cars: 5, claim: 1 },
  { from: 'g', to: 'h', color: 'gray', cars: 4 },
  { from: 'd', to: 'j', color: 'orange', cars: 4 },
  { from: 'j', to: 'k', color: 'blue', cars: 5, claim: 3 },
  { from: 'g', to: 'k', color: 'yellow', cars: 2 },
  { from: 'h', to: 'i', color: 'gray', cars: 3 },
  { from: 'k', to: 'i', color: 'red', cars: 4 },
];

/** Car slots along a route: centre, angle and length of each, leaving room for the towns at both ends. */
function slots([x1, y1]: Pt, [x2, y2]: Pt, n: number) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const margin = 13, gap = 3.5;
  const car = (len - 2 * margin - (n - 1) * gap) / n;
  const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
  return Array.from({ length: n }, (_, i) => {
    const t = margin + car / 2 + i * (car + gap);
    return { x: x1 + ux * t, y: y1 + uy * t, angle, car };
  });
}

/** Seconds between one claimed route and the next; the loop (in CSS) is four of these and a rest. */
const CLAIM_STEP = 1.7;

/** A night route map: towns, slots in the card colours, a destination ticket arcing across, and routes being claimed car by car. */
export function SeriesArt() {
  return (
    <svg viewBox="0 0 600 210" preserveAspectRatio="xMidYMid meet" overflow="hidden">
      <defs>
        <radialGradient id="eps-sky" cx=".32" cy=".3" r=".95">
          <stop offset="0" stopColor="#25336b" />
          <stop offset=".6" stopColor="#18214a" />
          <stop offset="1" stopColor="#0f1533" />
        </radialGradient>
        <radialGradient id="eps-hub" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffd77a" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffd77a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="-600" y="-210" width="1800" height="630" fill="url(#eps-sky)" />
      {/* a faint compass grid, like the back of an old route map */}
      <g stroke="#8ea2e8" strokeWidth=".5" opacity=".12">
        {Array.from({ length: 31 }, (_, i) => (i - 10) * 60).map((x) => <line key={x} x1={x} y1="-210" x2={x} y2="420" />)}
        {Array.from({ length: 15 }, (_, i) => (i - 5) * 42).map((y) => <line key={y} x1="-600" y1={y} x2="1200" y2={y} />)}
      </g>
      <path d="M-600 198 H-20 C70 178 110 214 210 200 S370 166 440 206 S560 186 620 196 H1200" fill="none" stroke="#8ea2e8" strokeWidth="1" opacity=".18" />
      {/* a destination ticket: from the far west town to the far east one */}
      <path className="eps-ticket-arc" d="M30 58 C180 -22 470 -4 570 138" fill="none" stroke="#ffd77a" strokeWidth="1.4" strokeDasharray="2 6" strokeLinecap="round" opacity=".55" />
      <circle cx={TOWNS[HUB][0]} cy={TOWNS[HUB][1]} r="34" fill="url(#eps-hub)" />
      {/* the slots */}
      {ROUTES.map((r) => (
        <g key={`${r.from}${r.to}`}>
          {slots(TOWNS[r.from], TOWNS[r.to], r.cars).map((s, i) => (
            <rect key={i} x={-s.car / 2} y="-4.2" width={s.car} height="8.4" rx="1.6"
              transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.angle.toFixed(1)})`}
              fill={CAR[r.color]} fillOpacity={r.color === 'black' ? 1 : 0.88} stroke={r.color === 'black' ? '#6d779d' : '#0b1029'} strokeWidth=".9" />
          ))}
        </g>
      ))}
      {/* the claims: train pieces drop onto a route one after another, then the next player's route */}
      {ROUTES.filter((r) => r.claim !== undefined).map((r) => (
        <g key={`claim-${r.from}${r.to}`}>
          {slots(TOWNS[r.from], TOWNS[r.to], r.cars).map((s, i) => (
            <g key={i} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.angle.toFixed(1)})`}>
              <rect className="eps-piece" x={-s.car / 2 + 0.6} y="-4.8" width={s.car - 1.2} height="9.6" rx="2.2"
                fill={PLAYER[r.claim!]} stroke="#fff7df" strokeWidth="1.5"
                style={{ animationDelay: `${(r.claim! * CLAIM_STEP + i * 0.16).toFixed(2)}s` }} />
            </g>
          ))}
        </g>
      ))}
      {/* the towns; the hub is a gold star */}
      {Object.entries(TOWNS).map(([id, [x, y]]) => id === HUB ? null : (
        <g key={id}>
          <circle cx={x} cy={y} r="7.5" fill="#0f1533" stroke="#f2ecdc" strokeWidth="2" />
          <circle cx={x} cy={y} r="2.6" fill="#f2ecdc" />
        </g>
      ))}
      <g transform={`translate(${TOWNS[HUB][0]} ${TOWNS[HUB][1]})`}>
        <circle r="11" fill="#0f1533" stroke="#ffd77a" strokeWidth="2.2" />
        <path d="M0 -7 L2 -2.2 L7 -2.2 L3 1 L4.6 6 L0 3 L-4.6 6 L-3 1 L-7 -2.2 L-2 -2.2 Z" fill="#ffd77a" />
      </g>
    </svg>
  );
}
