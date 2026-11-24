/**
 * Original side-on ship art for the cinematics, the menu's task force and the hub. Each ship is drawn bow-right with
 * its waterline at y = 0 (superstructure above, negative y; the hull below the waterline in anti-fouling red).
 * `SIDE_W` is each drawing's length. Shading comes from the shared gradients in `FleetArtDefs` (shipArt.tsx).
 */
import type { ReactNode } from 'react';
import type { ShipClass } from '@boboland/shared/src/fleet';

const EDGE = '#c9d7e2', DARK = '#121b23', GLASS = '#0a141d', CY = '#5fd4ff', AM = '#ffb547', WHITE = '#e3e9ee', RED = '#7c2b26', RAILC = '#9fb2c2';
const HULL = 'url(#fleet-side-hull)', SUPER = 'url(#fleet-side-super)', SHADE = 'url(#fleet-side-shade)';

export const SIDE_W: Record<ShipClass, number> = { dreadnought: 420, cruiser: 330, frigate: 260, submarine: 280, corvette: 180, cutter: 240 };

const range = (a: number, b: number, step: number) => { const out: number[] = []; for (let x = a; x <= b; x += step) out.push(x); return out; };

/** A hull: deck line rising to the bow (`stern` and `bow` are freeboard heights), raked stem, red below the waterline. */
function Hull({ w, stern, bow, rake = 22, fill = HULL, no, noAt, ports }: {
  w: number; stern: number; bow: number; rake?: number; fill?: string; no?: string; noAt?: number; ports?: [number, number, number];
}) {
  const xAt = (y: number) => w - rake * ((y + bow) / bow);
  const sheer = `M0 ${-stern} Q${w * 0.55} ${-stern} ${w} ${-bow}`;
  return (
    <g>
      <path d={`${sheer} L${w - rake} 0 Q${w - rake - 6} 11 ${w - rake - 30} 11 L14 11 Q3 11 1 3 Z`} fill={fill} stroke={DARK} strokeWidth="1" />
      <path d={`M1 0 L${w - rake} 0 Q${w - rake - 6} 11 ${w - rake - 30} 11 L14 11 Q3 11 1 3 Z`} fill={RED} />
      <path d={`M0.6 -3 L${xAt(-3)} -3 L${w - rake} 0 L1 0 Z`} fill={DARK} />
      {/* knuckle and deck-edge light */}
      <path d={`M2 ${-stern + 7} Q${w * 0.55} ${-stern + 7} ${xAt(-bow + 7)} ${-bow + 7}`} fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="1.2" />
      <path d={sheer} fill="none" stroke={EDGE} strokeWidth="1.3" strokeOpacity=".85" />
      {ports && range(ports[0], ports[1], 12).map((x) => <circle key={x} cx={x} cy={-ports[2]} r="1.3" fill={GLASS} stroke="#9fb2c2" strokeWidth=".4" />)}
      {/* hawse pipe and anchor */}
      <circle cx={w - rake - 8} cy={-bow + 9} r="2.4" fill={DARK} />
      <path d={`M${w - rake - 8} ${-bow + 11} v5 m-3 -2 q3 4 6 0`} stroke={DARK} strokeWidth="1.2" fill="none" />
      {no && <text x={noAt ?? w - rake - 40} y={-bow * 0.32} fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize={Math.max(9, bow * 0.5)} fill={WHITE} stroke={DARK} strokeWidth=".6" paintOrder="stroke" letterSpacing=".5">{no}</text>}
    </g>
  );
}

/** A railing with stanchions. */
const Rail = ({ x1, x2, y, step = 6 }: { x1: number; x2: number; y: number; step?: number }) => (
  <g stroke={RAILC} strokeWidth=".7" strokeOpacity=".85">
    <path d={`M${x1} ${y - 4} H${x2}`} />
    <path d={range(x1, x2, step).map((x) => `M${x} ${y} V${y - 4}`).join(' ')} />
  </g>
);

/** A bridge window band with a glint. */
const Windows = ({ x, y, w, h = 4, n = 0 }: { x: number; y: number; w: number; h?: number; n?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill={GLASS} />
    {n > 0 && range(1, n - 1, 1).map((i) => <path key={i} d={`M${x + (w / n) * i} ${y} v${h}`} stroke="#2a3a48" strokeWidth=".7" />)}
    <path d={`M${x + 2} ${y + h - 1} L${x + w * 0.3} ${y + 1}`} stroke={CY} strokeWidth="1" strokeOpacity=".7" />
  </g>
);

/** A flat phased-array radar face seen side-on. */
const Array8 = ({ x, y, s = 12 }: { x: number; y: number; s?: number }) => {
  const k = s * 0.3;
  return (
    <g>
      <path d={`M${x + k} ${y} H${x + s - k} L${x + s} ${y + k} V${y + s - k} L${x + s - k} ${y + s} H${x + k} L${x} ${y + s - k} V${y + k} Z`} fill="#2d3a46" stroke={EDGE} strokeWidth=".6" />
      <path d={`M${x + 2} ${y + s / 2} H${x + s - 2} M${x + s / 2} ${y + 2} V${y + s - 2}`} stroke="#4a5d6e" strokeWidth=".5" />
    </g>
  );
};

/** A white dome (satcom, fire control, close-in weapon). */
const Dome = ({ x, y, r = 5, gun }: { x: number; y: number; r?: number; gun?: boolean }) => (
  <g>
    {gun && <path d={`M${x} ${y - r * 0.2} L${x + r * 2.4} ${y - r * 0.5}`} stroke={DARK} strokeWidth="1.6" />}
    <path d={`M${x - r} ${y} a${r} ${r} 0 0 1 ${r * 2} 0 Z`} fill="url(#fleet-side-dome)" stroke="#8ea1b1" strokeWidth=".5" />
    <rect x={x - r * 0.8} y={y} width={r * 1.6} height={r * 0.8} fill="#6b7a87" />
  </g>
);

/** A stealth gun mount with its barrel. */
const Gun = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M10 -5 L32 -6.5" stroke={DARK} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M30 -6.6 L33 -6.8" stroke="#56657a" strokeWidth="3.2" />
    <path d="M-10 0 L-8 -6 L2 -10 L12 -9 L16 -4 L16 0 Z" fill={SUPER} stroke={EDGE} strokeWidth=".6" />
    <path d="M2 -10 L12 -9 L16 -4 L6 -5 Z" fill="#9aabb9" opacity=".6" />
  </g>
);

/** A whip antenna and a mast top. */
const Whip = ({ x, y, h }: { x: number; y: number; h: number }) => <path d={`M${x} ${y} V${y - h}`} stroke={RAILC} strokeWidth=".7" />;

/** A rigid inflatable boat in its davit. */
const Boat = ({ x, y, w = 18, color = '#4b5966' }: { x: number; y: number; w?: number; color?: string }) => (
  <g>
    <path d={`M${x - 2} ${y - 9} q0 -4 4 -4 M${x + w + 2} ${y - 9} q0 -4 -4 -4`} stroke={RAILC} strokeWidth=".8" fill="none" />
    <path d={`M${x} ${y - 6} H${x + w} q3 0 3 2.5 q0 2.5 -3 2.5 H${x + 2} q-2 0 -2 -2.5 Z`} fill={color} stroke={DARK} strokeWidth=".5" />
    <rect x={x + w * 0.4} y={y - 9} width={w * 0.28} height="3" fill={DARK} />
  </g>
);

/** Life-raft canisters on a rack. */
const Rafts = ({ x, y, n = 3 }: { x: number; y: number; n?: number }) => (
  <g>{range(0, n - 1, 1).map((i) => <rect key={i} x={x + i * 5} y={y - 4} width="4" height="4" rx="2" fill={WHITE} stroke="#8ea1b1" strokeWidth=".4" />)}</g>
);

/** A jet parked on deck, nose right: fuselage, canopy, fins and the tail number light. */
export const SideJet = ({ x, y = -34 }: { x: number; y?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0 L22 0 L28 -1.6 L22 -3 L17 -3.4 L12 -8.5 L9 -8.5 L10 -3.4 L3 -3.4 L-1 -9 L-3 -9 L-2 -2 Z" fill="#b7c3cd" stroke="#4b5966" strokeWidth=".5" />
    <path d="M15 -3.2 Q18 -6 22 -3.1 Z" fill={GLASS} />
    <path d="M16.5 -3.6 L19 -4.8" stroke={CY} strokeWidth=".5" />
    <rect x="2" y="-1.3" width="10" height="1" fill="#8b98a3" />
  </g>
);

/* ---------- the classes ---------- */

const dreadnought = (
  <g>
    <Hull w={420} stern={24} bow={28} rake={20} no="07" noAt={350} ports={[60, 240, 14]} />
    {/* hangar openings and sponsons under the flight deck */}
    <rect x="40" y="-24" width="40" height="9" fill={DARK} /><rect x="150" y="-24" width="54" height="9" fill={DARK} />
    <path d="M44 -24 v9 M52 -24 v9 M60 -24 v9 M68 -24 v9 M154 -24 v9 M164 -24 v9 M174 -24 v9 M184 -24 v9 M194 -24 v9" stroke="#26333e" strokeWidth=".8" />
    <path d="M100 -26 l8 10 h14 l8 -10 Z" fill={SHADE} />
    <path d="M318 -26 l6 8 h12 l6 -8 Z" fill={SHADE} />
    {/* flight deck: overhanging slab, with the elevator platform at the stern */}
    <path d="M-8 -34 L404 -34 L424 -29 L414 -26 L-8 -26 Z" fill={SUPER} stroke={DARK} strokeWidth="1" />
    <path d="M-8 -34 H404 L424 -29" stroke={EDGE} strokeWidth="1.3" fill="none" />
    <path d="M-8 -30 H414" stroke="#000" strokeOpacity=".25" strokeWidth="1" />
    <rect x="212" y="-26" width="30" height="5" fill={SHADE} />
    <Rail x1={0} x2={240} y={-34} step={8} />
    {/* the island */}
    <path d="M252 -34 L254 -66 L262 -74 L300 -74 L306 -66 L306 -34 Z" fill={SUPER} stroke={DARK} strokeWidth=".8" />
    <path d="M262 -74 L300 -74 L306 -66 L278 -66 Z" fill="#a6b5c2" opacity=".55" />
    <Windows x={258} y={-64} w={44} h={4} n={8} />
    <Windows x={256} y={-52} w={48} h={3} n={10} />
    <Array8 x={262} y={-48} s={11} /><Array8 x={286} y={-48} s={11} />
    <path d="M276 -74 L278 -92 L286 -92 L288 -74 Z" fill="#4c5b68" stroke={DARK} strokeWidth=".6" />
    <path d="M270 -86 H296 M274 -96 H292" stroke={RAILC} strokeWidth="1.2" />
    <Dome x={283} y={-96} r={4.5} />
    <Whip x={283} y={-100} h={14} />
    <path d="M292 -92 L300 -104" stroke={RAILC} strokeWidth=".7" />
    <rect x="304" y="-60" width="7" height="12" fill="#3e4c58" />
    <circle cx="308" cy="-62" r="1.2" fill="#ff5a4a" />
    {/* close-in weapons on the sponsons */}
    <Dome x={20} y={-26} r={4} gun /><Dome x={392} y={-26} r={4} gun />
  </g>
);

const cruiser = (
  <g>
    <Hull w={330} stern={14} bow={24} rake={24} no="62" ports={[40, 230, 8]} />
    <Rail x1={4} x2={60} y={-14} />
    <Rail x1={232} x2={300} y={-19} />
    {/* hangar and aft deckhouse */}
    <path d="M60 -14 L62 -34 L112 -34 L114 -14 Z" fill={SUPER} stroke={DARK} strokeWidth=".7" />
    <path d="M66 -30 H108 V-16 H66 Z" fill="#56656f" stroke="#33414c" strokeWidth=".5" />
    <path d="M66 -27 H108 M66 -24 H108 M66 -21 H108 M66 -18 H108" stroke="#3c4a55" strokeWidth=".5" />
    <Boat x={70} y={-34} w={20} />
    {/* funnels */}
    <path d="M118 -15 L122 -48 L138 -48 L140 -15 Z" fill={SUPER} stroke={DARK} strokeWidth=".7" />
    <path d="M121 -48 L123 -54 L137 -54 L139 -48 Z" fill={DARK} />
    <path d="M178 -18 L182 -50 L196 -50 L198 -18 Z" fill={SUPER} stroke={DARK} strokeWidth=".7" />
    <path d="M181 -50 L183 -56 L195 -56 L197 -50 Z" fill={DARK} />
    {/* main superstructure with the radar faces */}
    <path d="M140 -16 L142 -46 L150 -58 L218 -58 L226 -46 L232 -18 Z" fill={SUPER} stroke={DARK} strokeWidth=".8" />
    <path d="M150 -58 L218 -58 L226 -46 L180 -46 Z" fill="#a6b5c2" opacity=".5" />
    <Array8 x={148} y={-44} s={16} /><Array8 x={206} y={-44} s={16} />
    <Windows x={204} y={-55} w={20} h={4} n={4} />
    <Rafts x={164} y={-18} n={4} />
    {/* mast */}
    <path d="M184 -58 L186 -96 L192 -96 L194 -58 Z" fill="#56656f" stroke={DARK} strokeWidth=".6" />
    <path d="M172 -78 H206 M176 -90 H202" stroke={RAILC} strokeWidth="1.2" />
    <Dome x={189} y={-96} r={4} />
    <Whip x={189} y={-100} h={14} /><Whip x={176} y={-78} h={8} /><Whip x={204} y={-78} h={8} />
    <Dome x={168} y={-58} r={3.5} /><Dome x={214} y={-58} r={3.5} />
    {/* missile cells fore and aft, then the gun */}
    <rect x="22" y="-17" width="30" height="3" fill="#45535f" stroke={DARK} strokeWidth=".4" />
    <rect x="244" y="-21" width="36" height="3" fill="#45535f" stroke={DARK} strokeWidth=".4" />
    <Gun x={292} y={-21} s={0.95} />
    <Dome x={56} y={-14} r={3.5} gun />
    <path d="M326 -24 L326 -34" stroke={RAILC} strokeWidth=".7" />
  </g>
);

const frigate = (
  <g>
    <Hull w={260} stern={12} bow={22} rake={22} no="41" ports={[40, 170, 7]} />
    <Rail x1={4} x2={64} y={-12} />
    <Rail x1={190} x2={232} y={-17} />
    {/* hangar */}
    <path d="M62 -12 L64 -32 L100 -32 L102 -12 Z" fill={SUPER} stroke={DARK} strokeWidth=".7" />
    <path d="M68 -28 H96 V-13 H68 Z" fill="#56656f" stroke="#33414c" strokeWidth=".5" />
    {/* faceted stealth superstructure and the integrated mast */}
    <path d="M100 -14 L104 -40 L128 -50 L170 -50 L184 -36 L188 -16 Z" fill={SUPER} stroke={DARK} strokeWidth=".8" strokeLinejoin="round" />
    <path d="M104 -40 L128 -50 L150 -50 L136 -38 Z" fill="#a6b5c2" opacity=".5" />
    <path d="M136 -38 L150 -50 L170 -50 L184 -36 Z" fill={SHADE} opacity=".6" />
    <path d="M126 -50 L132 -82 L150 -86 L160 -50 Z" fill={SUPER} stroke={DARK} strokeWidth=".7" />
    <path d="M132 -82 L150 -86 L155 -66 L134 -64 Z" fill="#7d8e9c" />
    <Array8 x={136} y={-78} s={10} />
    <Windows x={166} y={-46} w={14} h={4} n={3} />
    <Dome x={141} y={-86} r={4} /><Whip x={141} y={-90} h={10} />
    <Boat x={108} y={-18} w={16} />
    <Rafts x={150} y={-15} n={3} />
    <rect x="194" y="-19" width="20" height="3" fill="#45535f" stroke={DARK} strokeWidth=".4" />
    <Gun x={222} y={-19} s={0.85} />
    <Dome x={96} y={-32} r={3} gun />
  </g>
);

const submarine = (
  <g>
    {/* the hull rides awash: casing just above the water, the rest dark below */}
    <path d="M0 -2 C10 -12 40 -14 70 -14 L236 -14 C262 -14 280 -8 280 2 C280 10 262 13 236 13 L40 13 C14 13 2 8 0 -2 Z" fill="url(#fleet-side-sub)" stroke="#0b1218" strokeWidth="1" />
    <path d="M14 -10 C40 -13 200 -14 262 -11" stroke="#7f93a4" strokeOpacity=".55" strokeWidth="1.2" fill="none" />
    <path d={range(40, 250, 18).map((x) => `M${x} -13 v24`).join(' ')} stroke="#000" strokeOpacity=".18" strokeWidth=".6" />
    {/* the sail with its planes and masts */}
    <path d="M150 -14 L154 -44 C156 -50 192 -50 198 -44 L204 -14 Z" fill="url(#fleet-side-sub)" stroke="#0b1218" strokeWidth=".9" />
    <path d="M156 -44 C160 -48 190 -48 196 -44" stroke="#8ea1b1" strokeOpacity=".6" strokeWidth="1" fill="none" />
    <path d="M160 -32 L140 -32 L144 -29 L160 -29 Z M194 -32 L214 -32 L210 -29 L194 -29 Z" fill="#24303a" stroke="#0b1218" strokeWidth=".6" />
    <path d="M170 -48 V-66 M176 -48 V-60 M183 -48 V-70 M189 -48 V-58" stroke="#5a6c7b" strokeWidth="2" />
    <rect x="181" y="-74" width="4" height="5" fill="#3b4955" />
    <circle cx="183" cy="-70" r="1" fill={CY} />
    <path d="M178 -40 h14" stroke={GLASS} strokeWidth="2" />
    {/* cruciform stern planes and the shrouded propulsor */}
    <path d="M18 -6 L6 -18 L-1 -18 L2 -4 Z M18 6 L6 16 L-1 16 L2 4 Z" fill="#1f2a33" stroke="#0b1218" strokeWidth=".6" />
    <path d="M-2 -6 L4 -6 L4 6 L-2 6 Z" fill="#30404c" />
    <path d="M240 -12 h22" stroke={DARK} strokeWidth="1" />
    <circle cx="248" cy="-6" r="1.4" fill={GLASS} />
    <path d="M0 0 H280" stroke="#000" strokeOpacity=".35" strokeWidth="1" />
  </g>
);

const corvette = (
  <g>
    <Hull w={180} stern={10} bow={18} rake={20} no="09" ports={[26, 110, 6]} />
    <Rail x1={4} x2={40} y={-10} step={5} />
    {/* angled missile canisters aft */}
    {[0, 1].map((i) => (
      <g key={i} transform={`translate(${16 + i * 6} ${-12 - i * 3}) rotate(-20)`}>
        <rect width="30" height="6" rx="1.5" fill="#7d8e9c" stroke={DARK} strokeWidth=".6" />
        <rect x="27" y=".8" width="3" height="4.4" fill={AM} />
        <path d="M6 0 v6 M14 0 v6 M22 0 v6" stroke="#55646f" strokeWidth=".5" />
      </g>
    ))}
    {/* superstructure and mast */}
    <path d="M58 -12 L62 -34 L106 -34 L114 -14 Z" fill={SUPER} stroke={DARK} strokeWidth=".8" />
    <path d="M62 -34 L106 -34 L110 -26 L80 -26 Z" fill="#a6b5c2" opacity=".5" />
    <Windows x={92} y={-31} w={14} h={4} n={3} />
    <path d="M80 -34 L82 -58 L88 -58 L90 -34 Z" fill="#56656f" stroke={DARK} strokeWidth=".6" />
    <path d="M74 -50 H96" stroke={RAILC} strokeWidth="1.1" />
    <Dome x={85} y={-58} r={4.5} />
    <Whip x={85} y={-62} h={10} />
    <Boat x={64} y={-12} w={14} />
    <Gun x={140} y={-16} s={0.7} />
  </g>
);

const cutter = (
  <g>
    <Hull w={240} stern={12} bow={22} rake={22} fill="url(#fleet-side-white)" no="06" noAt={150} ports={[36, 150, 7]} />
    {/* the amber service band on the bow */}
    <path d="M160 -19 L172 -19.6 L156 -3 L144 -3 Z" fill={AM} />
    <path d="M176 -20 L181 -20.2 L165 -3 L160 -3 Z" fill="#2c5a8a" />
    <Rail x1={4} x2={70} y={-12} />
    {/* flight deck aft, then the white superstructure */}
    <path d="M6 -12 H60" stroke={AM} strokeWidth="1" strokeDasharray="3 3" />
    <path d="M70 -12 L72 -40 L84 -48 L140 -48 L150 -36 L156 -14 Z" fill="url(#fleet-side-white)" stroke="#6f8091" strokeWidth=".8" />
    <Windows x={120} y={-44} w={24} h={5} n={5} />
    <Windows x={80} y={-34} w={50} h={3} n={0} />
    <path d="M104 -48 L106 -76 L112 -76 L114 -48 Z" fill="#c9d3dc" stroke="#6f8091" strokeWidth=".6" />
    <path d="M96 -66 H122" stroke="#8ea1b1" strokeWidth="1.1" />
    <Dome x={109} y={-76} r={4} /><Whip x={109} y={-80} h={10} />
    <Boat x={80} y={-14} w={18} color="#f08a35" />
    <Gun x={196} y={-18} s={0.6} />
  </g>
);

export const SIDE: Record<ShipClass, ReactNode> = { dreadnought, cruiser, frigate, submarine, corvette, cutter };

/** The Dreadnought's air wing, drawn separately so its sinking can slide the jets off the deck. */
export const DREADNOUGHT_JETS = [40, 92, 144, 196, 320, 362];
