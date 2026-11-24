/**
 * Original top-down ship art for the grid. Each ship is drawn bow-right in a box of `length` x 1 cells
 * (100 units a cell); vertical ships are the same drawing turned a quarter (bow down).
 * Shading comes from shared gradients (`FleetArtDefs`, mounted once in FleetApp), so the art stays light per ship.
 */
import type { ReactNode } from 'react';
import { SHIPS, type Dir, type ShipClass } from '@boboland/shared/src/fleet';

const C = {
  edge: '#c3d1dc', dark: '#141d25', line: '#e2e9ee', walk: '#26313a', cyan: '#5fd4ff', amber: '#ffb547', white: '#e9eef2',
  cell: '#4a5966', cellHi: '#6a7a88', glass: '#0b151e', yellow: '#e8c547', red: '#c8423b',
};

/** The shared gradients for every ship drawing (top-down and side-on). Mounted once; never display: none. */
export function FleetArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="fleet-top-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#27323c" /><stop offset=".16" stopColor="#566673" /><stop offset=".5" stopColor="#7f8f9d" /><stop offset=".84" stopColor="#566673" /><stop offset="1" stopColor="#27323c" />
        </linearGradient>
        <linearGradient id="fleet-top-deck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b4854" /><stop offset=".5" stopColor="#5b6a77" /><stop offset="1" stopColor="#3b4854" />
        </linearGradient>
        <linearGradient id="fleet-top-super" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b6c4cf" /><stop offset=".45" stopColor="#93a3b0" /><stop offset="1" stopColor="#5e6e7b" />
        </linearGradient>
        <linearGradient id="fleet-top-flight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a343d" /><stop offset=".5" stopColor="#3b4650" /><stop offset="1" stopColor="#2a343d" />
        </linearGradient>
        <linearGradient id="fleet-top-sub" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141c23" /><stop offset=".42" stopColor="#3a4955" /><stop offset=".55" stopColor="#2c3945" /><stop offset="1" stopColor="#141c23" />
        </linearGradient>
        <linearGradient id="fleet-top-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8995a0" /><stop offset=".5" stopColor="#eef2f5" /><stop offset="1" stopColor="#8995a0" />
        </linearGradient>
        <radialGradient id="fleet-top-dome" cx=".4" cy=".35" r=".7">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#9eacb8" />
        </radialGradient>
        <linearGradient id="fleet-side-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d9dab" /><stop offset=".3" stopColor="#6d7d8b" /><stop offset="1" stopColor="#3e4b57" />
        </linearGradient>
        <linearGradient id="fleet-side-super" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b3c1cc" /><stop offset="1" stopColor="#6a7a87" />
        </linearGradient>
        <linearGradient id="fleet-side-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d4a55" /><stop offset="1" stopColor="#252f38" />
        </linearGradient>
        <radialGradient id="fleet-side-dome" cx=".4" cy=".3" r=".8">
          <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#b9c5ce" />
        </radialGradient>
        <linearGradient id="fleet-side-sub" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c5b68" /><stop offset=".35" stopColor="#2a3641" /><stop offset="1" stopColor="#141b22" />
        </linearGradient>
        <linearGradient id="fleet-side-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5f8fa" /><stop offset="1" stopColor="#aebbc5" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ---------- parts ---------- */

/** A hull in plan: square transom at the left, the sides flaring in to a fine bow at the right. */
function planHull(w: number, y0: number, y1: number, fwd = 0.62, inset = 0) {
  const a = y0 + inset, b = y1 - inset, mid = (y0 + y1) / 2, x0 = 6 + inset, xb = w - 5 - inset * 1.6;
  return `M${x0 + 3} ${a} L${w * fwd} ${a} C${w * 0.86} ${a} ${xb - 10} ${mid - (b - a) * 0.12} ${xb} ${mid} C${xb - 10} ${mid + (b - a) * 0.12} ${w * 0.86} ${b} ${w * fwd} ${b} L${x0 + 3} ${b} Q${x0} ${b} ${x0} ${b - 3} L${x0} ${a + 3} Q${x0} ${a} ${x0 + 3} ${a} Z`;
}

/** The hull with its shadow on the water, side plating, and the deck inside it. */
function Hull({ w, y0, y1, fwd, deck = 'url(#fleet-top-deck)', plate = 'url(#fleet-top-hull)' }: { w: number; y0: number; y1: number; fwd?: number; deck?: string; plate?: string }) {
  return (
    <g>
      <path d={planHull(w, y0, y1, fwd)} transform="translate(4 6)" fill="#000" opacity=".38" />
      <path d={planHull(w, y0, y1, fwd)} fill={plate} stroke={C.edge} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={planHull(w, y0, y1, fwd, 4)} fill={deck} />
      <path d={planHull(w, y0, y1, fwd, 4)} fill="none" stroke={C.walk} strokeWidth="1.2" strokeDasharray="1 3" />
    </g>
  );
}

/** A block of vertical launch cells. */
const Cells = ({ x, y, cols, rows, s = 8 }: { x: number; y: number; cols: number; rows: number; s?: number }) => (
  <g>
    <rect x={x - 2} y={y - 2} width={cols * s + 2} height={rows * s + 2} fill={C.dark} />
    {Array.from({ length: cols * rows }, (_, i) => (
      <g key={i}>
        <rect x={x + (i % cols) * s} y={y + Math.floor(i / cols) * s} width={s - 2} height={s - 2} fill={C.cell} />
        <path d={`M${x + (i % cols) * s} ${y + Math.floor(i / cols) * s + s - 2} h${s - 2} v${-(s - 2)}`} stroke={C.cellHi} strokeWidth=".6" fill="none" />
      </g>
    ))}
  </g>
);

/** A raised block (superstructure, deckhouse) with the shadow it throws on the deck. */
const Block = ({ d, fill = 'url(#fleet-top-super)', children }: { d: string; fill?: string; children?: ReactNode }) => (
  <g>
    <path d={d} transform="translate(3 4)" fill="#000" opacity=".35" />
    <path d={d} fill={fill} stroke={C.edge} strokeWidth="1.1" strokeLinejoin="round" />
    {children}
  </g>
);

/** A stealth gun mount from above, barrel to the bow. */
const Gun = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M4 0 H34" stroke={C.dark} strokeWidth="4" strokeLinecap="round" />
    <path d="M30 0 H36" stroke="#5c6b78" strokeWidth="5.5" strokeLinecap="round" />
    <path d="M-12 -8 L4 -10 L12 -4 L12 4 L4 10 L-12 8 L-15 0 Z" transform="translate(2 3)" fill="#000" opacity=".35" />
    <path d="M-12 -8 L4 -10 L12 -4 L12 4 L4 10 L-12 8 L-15 0 Z" fill="url(#fleet-top-super)" stroke={C.edge} strokeWidth="1" strokeLinejoin="round" />
    <path d="M-12 -8 L4 -10 L12 -4 L-2 0 Z" fill="#c9d4dd" opacity=".45" />
  </g>
);

/** A white radome or close-in weapon seen from above. */
const Dome = ({ x, y, r = 6, gun }: { x: number; y: number; r?: number; gun?: boolean }) => (
  <g>
    {gun && <path d={`M${x} ${y} h${r * 2.2}`} stroke={C.dark} strokeWidth="2" />}
    <circle cx={x + 2} cy={y + 3} r={r} fill="#000" opacity=".35" />
    <circle cx={x} cy={y} r={r} fill="url(#fleet-top-dome)" stroke="#8394a2" strokeWidth=".8" />
  </g>
);

/** A helicopter landing spot: touchdown circle, lineup line and the deck-edge safety band. */
const Helipad = ({ x, y, r = 16 }: { x: number; y: number; r?: number }) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="none" stroke={C.yellow} strokeWidth="1.6" strokeOpacity=".85" />
    <circle cx={x} cy={y} r={r * 0.45} fill="none" stroke={C.line} strokeWidth="1.2" strokeOpacity=".6" />
    <path d={`M${x - r - 6} ${y} H${x + r + 10}`} stroke={C.line} strokeWidth="1.4" strokeDasharray="4 3" strokeOpacity=".7" />
  </g>
);

/** A funnel from above: casing with the hot black uptake. */
const Funnel = ({ x, y, w = 14, h = 18 }: { x: number; y: number; w?: number; h?: number }) => (
  <g>
    <rect x={x + 2} y={y + 3} width={w} height={h} fill="#000" opacity=".35" />
    <rect x={x} y={y} width={w} height={h} rx="2" fill="#6c7c89" stroke={C.edge} strokeWidth=".9" />
    <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="1.5" fill="#0e151b" />
  </g>
);

/** Rows of white life-raft canisters. */
const Rafts = ({ x, y, n = 3 }: { x: number; y: number; n?: number }) => (
  <g>{Array.from({ length: n }, (_, i) => <rect key={i} x={x + i * 7} y={y} width="6" height="4" rx="2" fill={C.white} stroke="#8394a2" strokeWidth=".4" />)}</g>
);

/** A small boat in its davit, bow right. */
const Boat = ({ x, y, w = 22, color = '#55636f' }: { x: number; y: number; w?: number; color?: string }) => (
  <g>
    <path d={`M${x} ${y - 4} H${x + w - 6} Q${x + w} ${y - 4} ${x + w} ${y} Q${x + w} ${y + 4} ${x + w - 6} ${y + 4} H${x} Z`} fill={color} stroke={C.dark} strokeWidth=".6" />
    <rect x={x + w * 0.35} y={y - 2} width={w * 0.25} height="4" fill={C.dark} opacity=".7" />
  </g>
);

/** A radar face on a superstructure corner, seen edge-on from above. */
const Face = ({ x, y, a }: { x: number; y: number; a: number }) => (
  <path d={`M${x} ${y} l${Math.cos((a * Math.PI) / 180) * 12} ${Math.sin((a * Math.PI) / 180) * 12}`} stroke="#1f2a33" strokeWidth="3.4" strokeLinecap="round" />
);

const Bollards = ({ x, y }: { x: number; y: number }) => (
  <g fill={C.dark}><circle cx={x} cy={y} r="1.6" /><circle cx={x + 5} cy={y} r="1.6" /></g>
);

/** A jet seen from above, nose right. */
const Jet = ({ x, y, s = 1, r = 0 }: { x: number; y: number; s?: number; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M14 0 L6 -2 L0 -11 L-4 -11 L-3 -2.5 L-8 -2.5 L-12 -7 L-14 -7 L-13 0 L-14 7 L-12 7 L-8 2.5 L-3 2.5 L-4 11 L0 11 L6 2 Z" transform="translate(1.5 2.5)" fill="#000" opacity=".35" />
    <path d="M14 0 L6 -2 L0 -11 L-4 -11 L-3 -2.5 L-8 -2.5 L-12 -7 L-14 -7 L-13 0 L-14 7 L-12 7 L-8 2.5 L-3 2.5 L-4 11 L0 11 L6 2 Z" fill="#b9c5cf" stroke="#4b5966" strokeWidth=".5" />
    <path d="M9 0 L4 -1.2 L4 1.2 Z" fill={C.glass} />
  </g>
);

/* ---------- the classes ---------- */

const ART: Record<ShipClass | 'decoy', ReactNode> = {
  dreadnought: (
    <g>
      {/* hull under the flight deck */}
      <path d={planHull(500, 20, 80, 0.6)} transform="translate(4 6)" fill="#000" opacity=".38" />
      <path d={planHull(500, 20, 80, 0.6)} fill="url(#fleet-top-hull)" stroke={C.edge} strokeWidth="1.4" />
      {/* the flight deck, angled to port, with sponsons */}
      <path d="M8 18 L120 14 L330 8 L410 14 L462 30 L494 50 L462 68 L400 84 L300 90 L120 90 L30 86 L8 80 Z" transform="translate(4 6)" fill="#000" opacity=".32" />
      <path d="M8 18 L120 14 L330 8 L410 14 L462 30 L494 50 L462 68 L400 84 L300 90 L120 90 L30 86 L8 80 Z" fill="url(#fleet-top-flight)" stroke={C.edge} strokeWidth="1.6" strokeLinejoin="round" />
      {/* landing area: edge lines, centreline, wires */}
      <path d="M14 70 L330 12" stroke={C.line} strokeWidth="1.2" strokeDasharray="10 7" opacity=".6" />
      <path d="M40 86 L360 26" stroke={C.line} strokeWidth="1.2" strokeDasharray="10 7" opacity=".6" />
      <path d="M26 79 L346 19" stroke={C.yellow} strokeWidth="1.6" strokeDasharray="16 10" opacity=".75" />
      {[70, 84, 98, 112].map((x) => <path key={x} d={`M${x} ${80 - (x - 26) * 0.19} l${10} ${12}`} stroke={C.line} strokeWidth=".9" opacity=".5" />)}
      {/* bow catapults and the axial centreline */}
      <path d="M300 44 H470 M300 58 H462" stroke="#121a21" strokeWidth="2.2" />
      <path d="M300 44 H470 M300 58 H462" stroke="#7c8b97" strokeWidth=".6" strokeDasharray="5 3" />
      <path d="M160 52 H300" stroke={C.line} strokeWidth="1" strokeDasharray="6 8" opacity=".35" />
      {/* elevators */}
      <rect x="150" y="86" width="34" height="8" fill="#4a5662" stroke={C.edge} strokeWidth=".8" />
      <rect x="240" y="86" width="34" height="8" fill="#4a5662" stroke={C.edge} strokeWidth=".8" />
      <rect x="210" y="5" width="30" height="9" fill="#4a5662" stroke={C.edge} strokeWidth=".8" />
      {/* the island on the starboard edge */}
      <Block d="M330 70 L380 70 L392 76 L392 88 L330 88 Z">
        <path d="M330 70 L380 70 L392 76 L340 78 Z" fill="#cdd7df" opacity=".5" />
        <Face x={333} y={72} a={200} /><Face x={385} y={73} a={-20} />
        <rect x="348" y="76" width="22" height="7" fill="#58687a" stroke={C.edge} strokeWidth=".6" />
      </Block>
      <Dome x={359} y={79} r={4} />
      <text x="430" y="56" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize="18" fill={C.white} opacity=".75" transform="rotate(90 430 50)">07</text>
      <Jet x={40} y={30} r={-12} /><Jet x={66} y={40} r={-12} /><Jet x={250} y={74} s={0.95} /><Jet x={286} y={76} s={0.95} />
      <Jet x={420} y={30} s={0.9} r={-20} /><Jet x={410} y={70} s={0.9} r={20} />
      <Dome x={16} y={22} r={4} gun /><Dome x={470} y={70} r={4} gun />
    </g>
  ),
  cruiser: (
    <g>
      <Hull w={400} y0={26} y1={74} fwd={0.6} />
      <Helipad x={34} y={50} r={14} />
      <Block d="M58 32 L112 32 L114 68 L58 68 Z"><path d="M58 32 L112 32 L114 38 L58 38 Z" fill="#cdd7df" opacity=".4" /></Block>
      <Boat x={62} y={29} w={22} /><Boat x={62} y={71} w={22} />
      <Cells x={120} y={36} cols={4} rows={4} />
      <Funnel x={160} y={38} w={14} h={24} />
      <Block d="M182 34 L246 34 L258 42 L258 58 L246 66 L182 66 L176 58 L176 42 Z">
        <path d="M182 34 L246 34 L258 42 L188 44 Z" fill="#cdd7df" opacity=".45" />
        <Face x={178} y={41} a={215} /><Face x={178} y={59} a={145} /><Face x={256} y={41} a={-35} /><Face x={256} y={59} a={35} />
        <rect x="236" y="44" width="12" height="12" fill={C.glass} />
        <path d="M238 46 l8 0" stroke={C.cyan} strokeWidth="1" opacity=".8" />
      </Block>
      <path d="M212 26 V74" stroke="#8c9ba7" strokeWidth="1.6" />
      <Dome x={212} y={50} r={5} />
      <Funnel x={190} y={44} w={12} h={12} />
      <Rafts x={186} y={28} n={4} /><Rafts x={186} y={68} n={4} />
      <Cells x={276} y={38} cols={5} rows={3} />
      <Gun x={344} y={50} s={1} />
      <path d="M326 34 L334 50 L326 66" stroke={C.edge} strokeWidth="1.3" fill="none" />
      <Bollards x={372} y={42} /><Bollards x={372} y={58} />
      <path d="M380 50 H392" stroke={C.dark} strokeWidth="1.6" strokeDasharray="2 1.5" />
      <Dome x={120} y={30} r={3.5} gun /><Dome x={120} y={70} r={3.5} gun />
    </g>
  ),
  frigate: (
    <g>
      <Hull w={300} y0={28} y1={72} fwd={0.62} />
      <Helipad x={36} y={50} r={15} />
      <Block d="M64 33 L104 33 L106 67 L64 67 Z"><path d="M64 33 L104 33 L106 39 L64 39 Z" fill="#cdd7df" opacity=".4" /></Block>
      {/* faceted stealth superstructure: a ridge down the middle, lit and shaded slopes */}
      <Block d="M106 34 L196 32 L214 50 L196 68 L106 66 L100 50 Z">
        <path d="M106 34 L196 32 L214 50 L104 50 Z" fill="#cbd5dd" opacity=".45" />
        <path d="M104 50 L214 50 L196 68 L106 66 Z" fill="#3e4b56" opacity=".55" />
        <path d="M104 50 H214" stroke={C.edge} strokeWidth=".8" />
      </Block>
      <Block d="M140 40 L170 40 L176 50 L170 60 L140 60 L134 50 Z" fill="#7d8e9c">
        <Face x={136} y={43} a={210} /><Face x={136} y={57} a={150} /><Face x={174} y={43} a={-30} /><Face x={174} y={57} a={30} />
      </Block>
      <Dome x={155} y={50} r={5} />
      <path d="M198 42 L210 50 L198 58 Z" fill={C.glass} />
      <Boat x={110} y={29} w={18} /><Rafts x={120} y={66} n={3} />
      <Cells x={222} y={42} cols={3} rows={2} />
      <Gun x={258} y={50} s={0.85} />
      <Bollards x={282} y={44} /><Bollards x={282} y={56} />
      <Dome x={96} y={50} r={3.5} gun />
    </g>
  ),
  submarine: (
    <g>
      <path d="M18 50 C18 34 46 30 78 30 L236 30 C272 30 296 40 296 50 C296 60 272 70 236 70 L78 70 C46 70 18 66 18 50 Z" transform="translate(3 5)" fill="#000" opacity=".4" />
      {/* stern planes and the shrouded propulsor */}
      <path d="M26 50 L6 34 L12 34 L34 46 Z M26 50 L6 66 L12 66 L34 54 Z" fill="#1d272f" stroke="#0b1218" strokeWidth=".8" />
      <rect x="6" y="45" width="12" height="10" rx="2" fill="#2c3a46" stroke="#0b1218" strokeWidth=".8" />
      <path d="M18 50 C18 34 46 30 78 30 L236 30 C272 30 296 40 296 50 C296 60 272 70 236 70 L78 70 C46 70 18 66 18 50 Z" fill="url(#fleet-top-sub)" stroke="#5d7080" strokeWidth="1.4" />
      {/* casing: the flat walking deck along the top, hatches, tile seams */}
      <path d="M50 44 L250 43 C266 44 276 47 280 50 C276 53 266 56 250 57 L50 56 Z" fill="#33424e" opacity=".85" />
      {[70, 100, 130, 160, 220, 240].map((x) => <path key={x} d={`M${x} 32 v36`} stroke="#000" strokeOpacity=".22" strokeWidth=".8" />)}
      <circle cx="96" cy="50" r="3" fill="#1b252e" stroke="#6c7f8f" strokeWidth=".6" />
      <circle cx="252" cy="50" r="3" fill="#1b252e" stroke="#6c7f8f" strokeWidth=".6" />
      {/* the sail and its planes */}
      <path d="M170 50 C170 42 186 39 210 40 C226 41 232 46 232 50 C232 54 226 59 210 60 C186 61 170 58 170 50 Z" transform="translate(3 5)" fill="#000" opacity=".4" />
      <path d="M194 40 L188 22 L204 22 L208 40 Z M194 60 L188 78 L204 78 L208 60 Z" fill="#26323c" stroke="#6c7f8f" strokeWidth=".8" />
      <path d="M170 50 C170 42 186 39 210 40 C226 41 232 46 232 50 C232 54 226 59 210 60 C186 61 170 58 170 50 Z" fill="#3a4a57" stroke="#8ea1b1" strokeWidth="1" />
      <circle cx="198" cy="50" r="2" fill="#56697a" /><circle cx="206" cy="50" r="2" fill="#56697a" /><circle cx="214" cy="50" r="1.6" fill={C.cyan} />
      <path d="M78 33 C140 31 220 31 262 35" stroke="#7f93a4" strokeOpacity=".45" strokeWidth="1.4" fill="none" />
    </g>
  ),
  corvette: (
    <g>
      <Hull w={200} y0={30} y1={70} fwd={0.58} />
      {/* angled anti-ship missile canisters */}
      {[-9, 9].map((dy) => (
        <g key={dy} transform={`translate(20 ${50 + dy}) rotate(${dy < 0 ? -14 : 14})`}>
          <rect x="0" y="-4.5" width="38" height="9" rx="2" transform="translate(2 3)" fill="#000" opacity=".35" />
          <rect x="0" y="-4.5" width="38" height="9" rx="2" fill="#7d8e9c" stroke={C.edge} strokeWidth=".8" />
          <path d="M10 -4.5 v9 M20 -4.5 v9 M30 -4.5 v9" stroke="#55646f" strokeWidth=".7" />
          <rect x="34" y="-3.5" width="4" height="7" fill={C.amber} />
        </g>
      ))}
      <Block d="M72 37 L118 37 L130 44 L130 56 L118 63 L72 63 Z">
        <path d="M72 37 L118 37 L130 44 L76 46 Z" fill="#cdd7df" opacity=".45" />
        <rect x="116" y="44" width="8" height="12" fill={C.glass} />
      </Block>
      <Dome x={96} y={50} r={6} />
      <Boat x={74} y={33} w={14} />
      <Gun x={156} y={50} s={0.7} />
      <Bollards x={180} y={46} />
    </g>
  ),
  cutter: (
    <g>
      <Hull w={300} y0={28} y1={72} fwd={0.62} plate="url(#fleet-top-white)" deck="#b9c4cd" />
      <Helipad x={38} y={50} r={15} />
      {/* amber service band across the bow */}
      <path d="M214 30 L226 30 L212 70 L200 70 Z" fill={C.amber} />
      <path d="M230 31 L236 31 L222 69 L216 69 Z" fill="#2c5a8a" />
      <Block d="M100 33 L190 33 L204 42 L204 58 L190 67 L100 67 Z" fill="url(#fleet-top-white)">
        <path d="M100 33 L190 33 L204 42 L104 44 Z" fill="#ffffff" opacity=".5" />
        <rect x="188" y="42" width="10" height="16" fill={C.glass} />
        <path d="M190 44 v6" stroke={C.cyan} strokeWidth="1" />
      </Block>
      <path d="M146 30 V70" stroke="#8ea1b1" strokeWidth="1.6" />
      <Dome x={146} y={50} r={5.5} />
      <Boat x={104} y={29} w={22} color="#f08a35" /><Boat x={104} y={71} w={22} color="#f08a35" />
      <Gun x={250} y={50} s={0.6} />
      <Bollards x={276} y={44} /><Bollards x={276} y={56} />
    </g>
  ),
  decoy: (
    <g>
      <circle cx="50" cy="50" r="30" fill="none" stroke={C.cyan} strokeWidth="1.2" strokeOpacity=".35" strokeDasharray="2 4" />
      <path d="M14 36 L62 32 L84 40 L92 50 L84 60 L62 68 L14 64 Z" fill="rgba(95,212,255,.12)" stroke={C.cyan} strokeWidth="2.5" strokeDasharray="7 5" strokeLinejoin="round" />
      <path d="M40 42 L56 50 L40 58 Z" fill={C.cyan} opacity=".75" />
      <circle cx="30" cy="50" r="3" fill={C.cyan} opacity=".6" />
    </g>
  ),
};

/** A ship (or the Decoy) at its size, for a grid square size set by the parent (the SVG fills its box). */
export function ShipTop({ cls, dir = 'h', className = '' }: { cls: ShipClass | 'decoy'; dir?: Dir; className?: string }) {
  const len = cls === 'decoy' ? 1 : SHIPS[cls].length;
  const w = len * 100;
  return (
    <svg className={`fleet-ship ${className}`} viewBox={dir === 'h' ? `0 0 ${w} 100` : `0 0 100 ${w}`} preserveAspectRatio="none" aria-hidden>
      <g transform={dir === 'h' ? undefined : 'translate(100 0) rotate(90)'}>{ART[cls]}</g>
    </svg>
  );
}
