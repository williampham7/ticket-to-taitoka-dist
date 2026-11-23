type Pt = readonly [number, number];

/** A made-up board printed on ticket stock: towns, and the routes between them as rows of coloured car slots. */
const TOWNS: Record<string, Pt> = {
  a: [38, 58], b: [122, 30], c: [160, 104], d: [84, 150], e: [36, 200],
  f: [246, 40], g: [236, 152], h: [290, 96], i: [288, 208], j: [160, 210],
};
const HUB = 'c';

/** The card colours, a little faded, as if printed on the ticket. */
const CAR = {
  red: '#b5523f', blue: '#4f7299', green: '#5e8a5a', yellow: '#d3a640',
  black: '#3a3631', white: '#fbf8f1', orange: '#cf7d3d', gray: '#a8a196',
} as const;

/** Player train colours for the pieces that land on claimed routes. */
const PLAYER = ['#2f6fd1', '#d8412f', '#e7b21f', '#2f9a52'];

const INK = '#2d2924';

interface Route { from: string; to: string; color: keyof typeof CAR; cars: number; claim?: number }
const ROUTES: Route[] = [
  { from: 'a', to: 'b', color: 'red', cars: 3, claim: 0 },
  { from: 'b', to: 'c', color: 'blue', cars: 3 },
  { from: 'a', to: 'd', color: 'gray', cars: 4 },
  { from: 'e', to: 'd', color: 'green', cars: 2 },
  { from: 'd', to: 'c', color: 'yellow', cars: 3 },
  { from: 'c', to: 'f', color: 'orange', cars: 4 },
  { from: 'b', to: 'f', color: 'black', cars: 5, claim: 2 },
  { from: 'f', to: 'h', color: 'gray', cars: 2 },
  { from: 'c', to: 'g', color: 'white', cars: 3, claim: 1 },
  { from: 'g', to: 'h', color: 'yellow', cars: 3 },
  { from: 'd', to: 'j', color: 'orange', cars: 3 },
  { from: 'j', to: 'g', color: 'green', cars: 3 },
  { from: 'g', to: 'i', color: 'red', cars: 2 },
  { from: 'h', to: 'i', color: 'gray', cars: 4 },
  { from: 'e', to: 'j', color: 'blue', cars: 5, claim: 3 },
];

/** Car slots along a route: centre, angle and length of each, leaving room for the towns at both ends. */
function slots([x1, y1]: Pt, [x2, y2]: Pt, n: number) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  const margin = 11, gap = 3;
  const car = (len - 2 * margin - (n - 1) * gap) / n;
  const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
  return Array.from({ length: n }, (_, i) => {
    const t = margin + car / 2 + i * (car + gap);
    return { x: x1 + ux * t, y: y1 + uy * t, angle, car };
  });
}

/** Seconds between one claimed route and the next; the loop (in CSS) is four of these and a rest. */
const CLAIM_STEP = 1.7;

/** A route map printed on paper: towns, slots in the card colours, a destination ticket arcing across, and routes being claimed car by car. */
export function SeriesArt() {
  return (
    <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice">
      <rect x="-160" y="-120" width="640" height="480" fill="#ece4d3" />
      {/* faint survey grid and a coastline, like the back of an old route map */}
      <g stroke="#a88f5f" strokeWidth=".5" opacity=".28">
        {Array.from({ length: 15 }, (_, i) => (i - 2) * 32).map((x) => <line key={x} x1={x} y1="-120" x2={x} y2="360" />)}
        {Array.from({ length: 12 }, (_, i) => (i - 3) * 32).map((y) => <line key={y} x1="-160" y1={y} x2="480" y2={y} />)}
      </g>
      <path d="M-160 236 H-10 C30 222 60 244 110 232 S200 218 250 236 S300 226 480 232" fill="none" stroke="#a88f5f" strokeWidth="1" opacity=".45" />
      {/* a destination ticket: from the far north-west town to the far south-east one */}
      <path d="M38 58 C150 0 330 80 288 208" fill="none" stroke="#a6843f" strokeWidth="1.3" strokeDasharray="2 5" strokeLinecap="round" opacity=".8" />
      {/* the slots */}
      {ROUTES.map((r) => (
        <g key={`${r.from}${r.to}`}>
          {slots(TOWNS[r.from], TOWNS[r.to], r.cars).map((s, i) => (
            <rect key={i} x={-s.car / 2} y="-3.8" width={s.car} height="7.6" rx="1.4"
              transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.angle.toFixed(1)})`}
              fill={CAR[r.color]} stroke={INK} strokeOpacity=".55" strokeWidth=".8" />
          ))}
        </g>
      ))}
      {/* the claims: train pieces drop onto a route one after another, then the next player's route */}
      {ROUTES.filter((r) => r.claim !== undefined).map((r) => (
        <g key={`claim-${r.from}${r.to}`}>
          {slots(TOWNS[r.from], TOWNS[r.to], r.cars).map((s, i) => (
            <g key={i} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)}) rotate(${s.angle.toFixed(1)})`}>
              <rect className="eps-piece" x={-s.car / 2 + 0.5} y="-4.4" width={s.car - 1} height="8.8" rx="2"
                fill={PLAYER[r.claim!]} stroke={INK} strokeWidth="1.1"
                style={{ animationDelay: `${(r.claim! * CLAIM_STEP + i * 0.16).toFixed(2)}s` }} />
            </g>
          ))}
        </g>
      ))}
      {/* the towns; the hub is a gold star */}
      {Object.entries(TOWNS).map(([id, [x, y]]) => id === HUB ? null : (
        <g key={id}>
          <circle cx={x} cy={y} r="6.5" fill="#f7f2e7" stroke={INK} strokeWidth="1.8" />
          <circle cx={x} cy={y} r="2.2" fill={INK} />
        </g>
      ))}
      <g transform={`translate(${TOWNS[HUB][0]} ${TOWNS[HUB][1]})`}>
        <circle r="10" fill="#f7f2e7" stroke={INK} strokeWidth="2" />
        <path d="M0 -6.6 L1.9 -2.1 L6.6 -2.1 L2.8 .9 L4.3 5.6 L0 2.8 L-4.3 5.6 L-2.8 .9 L-6.6 -2.1 L-1.9 -2.1 Z" fill="#b08d4a" stroke={INK} strokeWidth=".7" />
      </g>
    </svg>
  );
}
