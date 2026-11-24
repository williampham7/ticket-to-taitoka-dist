/**
 * Cinematic scenes, drawn side-on in an 800 x 240 frame (horizon y 130, waterline y 172) and animated with SVG SMIL,
 * so each scene restarts when it mounts. The attacker sees the shot go out (left to right, impact at x 560); for the
 * defender the whole frame is mirrored, so it comes in. Every timing is passed in from fx.ts (seconds here).
 */
import type { ReactNode } from 'react';
import type { ShipClass } from '@boboland/shared/src/fleet';
import { DREADNOUGHT_JETS, SIDE, SIDE_W, SideJet } from './sideArt';
import type { Delivery, Impact } from './plan';

export const P = { x: 560, y: 172 };
const s = (n: number) => `${n.toFixed(3)}s`;

/** shorthand for an SMIL <animate> */
const A = ({ at, from, to, values, b = 0, d, attr }: { at?: string; attr?: string; from?: string | number; to?: string | number; values?: string; b?: number; d: number }) => (
  <animate attributeName={attr ?? at!} from={from as string} to={to as string} values={values} begin={s(b)} dur={s(d)} fill="freeze" />
);
const Motion = ({ path, b = 0, d, rotate }: { path: string; b?: number; d: number; rotate?: boolean }) => (
  <animateMotion path={path} begin={s(b)} dur={s(d)} fill="freeze" rotate={rotate ? 'auto' : undefined} />
);
/** hidden until `b`, then shown */
const Show = ({ b, d = 0.001 }: { b: number; d?: number }) => <animate attributeName="opacity" from="0" to="1" begin={s(b)} dur={s(d)} fill="freeze" />;

export const Backdrop = () => (
  <g>
    <defs>
      <linearGradient id="cn-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#060d17" /><stop offset="1" stopColor="#173a55" /></linearGradient>
      <linearGradient id="cn-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d2a40" /><stop offset="1" stopColor="#030b14" /></linearGradient>
      <radialGradient id="cn-fire"><stop offset="0" stopColor="#fff3c4" /><stop offset=".35" stopColor="#ffb547" /><stop offset=".7" stopColor="#ff4d2a" stopOpacity=".8" /><stop offset="1" stopColor="#ff4d2a" stopOpacity="0" /></radialGradient>
      <radialGradient id="cn-smoke"><stop offset="0" stopColor="#56606a" stopOpacity=".9" /><stop offset="1" stopColor="#2a323a" stopOpacity="0" /></radialGradient>
      <pattern id="cn-hex" width="16" height="27.7" patternUnits="userSpaceOnUse" patternTransform="scale(.8)">
        <path d="M8 0 L16 4.6 L16 13.9 L8 18.5 L0 13.9 L0 4.6 Z M8 18.5 L8 27.7" fill="none" stroke="#38e1ff" strokeWidth="1.2" />
      </pattern>
    </defs>
    <rect width="800" height="240" fill="url(#cn-sky)" />
    <rect y="130" width="800" height="110" fill="url(#cn-sea)" />
    <path d="M0 130 H800" stroke="#38e1ff" strokeOpacity=".25" />
    {[150, 170, 196, 224].map((y, i) => <path key={y} d={`M${-40 + i * 30} ${y} q20 -3 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0`} fill="none" stroke="#9fc4dd" strokeOpacity={0.08 + i * 0.03} />)}
  </g>
);

/** the sea in front of a ship: hides what is under the waterline */
const Foreground = () => <rect y={P.y + 2} width="800" height="70" fill="#06141f" opacity=".88" />;

/** our gun at the left edge, with its flash */
const Gun = ({ b = 0, n = 1 }: { b?: number; n?: number }) => (
  <g>
    <path d="M-10 182 L70 176 L90 168 L-10 168 Z" fill="#3c4c5c" stroke="#a9c1d6" strokeWidth="1" />
    {Array.from({ length: n }, (_, i) => (
      <circle key={i} cx={52 + i * 7} cy={166 - i * 3} r="0" fill="url(#cn-fire)">
        <A at="r" values="0;22;0" b={b + i * 0.12} d={0.3} />
      </circle>
    ))}
  </g>
);

/** a shell on its arc, with a fading tracer */
const Shell = ({ b, d, to = P.x, from = 70, peak = 20, toY = P.y }: { b: number; d: number; to?: number; from?: number; peak?: number; toY?: number }) => {
  const path = `M${from} 168 Q${(from + to) / 2} ${peak} ${to} ${toY}`;
  return (
    <g opacity="0">
      <Show b={b} />
      <path d={path} fill="none" stroke="#ffd9a0" strokeOpacity=".35" strokeWidth="1.6" strokeDasharray="900" strokeDashoffset="900">
        <A at="stroke-dashoffset" from={900} to={0} b={b} d={d} />
        <A at="opacity" from={1} to={0} b={b + d} d={0.3} />
      </path>
      <circle r="3.5" fill="#fff0c8"><Motion path={path} b={b} d={d} /><A at="opacity" from={1} to={0} b={b + d} d={0.05} /></circle>
    </g>
  );
};

/** a falling whistle bomb or bomblet */
const Drop = ({ x0, y0, x1, y1 = P.y, b, d }: { x0: number; y0: number; x1: number; y1?: number; b: number; d: number }) => (
  <g opacity="0"><Show b={b} />
    <ellipse rx="5" ry="2.4" fill="#cfd8e0"><Motion path={`M${x0} ${y0} Q${x0 + (x1 - x0) * 0.6} ${y0} ${x1} ${y1}`} b={b} d={d} rotate /><A at="opacity" from={1} to={0} b={b + d} d={0.05} /></ellipse>
  </g>
);

/** a quick flash and fireball at (x, y) */
const Burst = ({ x, y, b, r = 26, d = 0.5 }: { x: number; y: number; b: number; r?: number; d?: number }) => (
  <circle cx={x} cy={y} r="0" fill="url(#cn-fire)"><A at="r" values={`0;${r};${r * 0.6}`} b={b} d={d} /><A at="opacity" values="1;1;0" b={b} d={d + 0.2} /></circle>
);

const Splash = ({ x, b, h = 70 }: { x: number; b: number; h?: number }) => (
  <g opacity="0"><Show b={b} />
    <g transform={`translate(${x} ${P.y})`}>
      <path d={`M-14 0 Q0 ${-h} 14 0 Z`} fill="#dff3ff" opacity=".85" transform="scale(1 0)">
        <animateTransform attributeName="transform" type="scale" values="1 0;1 1;1.3 0.1" begin={s(b)} dur={s(0.7)} fill="freeze" />
      </path>
    </g>
    {[-18, -8, 6, 16].map((dx) => <circle key={dx} cx={x} cy={P.y} r="2.5" fill="#dff3ff"><Motion path={`M0 0 Q${dx} ${-h * 0.9} ${dx * 2.4} 0`} b={b} d={0.7} /></circle>)}
    <ellipse cx={x} cy={P.y + 2} rx="4" ry="1.5" fill="none" stroke="#9fc4dd"><A at="rx" from={4} to={46} b={b} d={0.8} /><A at="ry" from={1.5} to={7} b={b} d={0.8} /><A at="opacity" from={1} to={0} b={b} d={0.8} /></ellipse>
  </g>
);

const Smoke = ({ x, y, b, r = 30, rise = 60, d = 1 }: { x: number; y: number; b: number; r?: number; rise?: number; d?: number }) => (
  <circle cx={x} cy={y} r="0" fill="url(#cn-smoke)" opacity="0">
    <Show b={b} />
    <A at="r" from={r * 0.3} to={r} b={b} d={d} />
    <A at="cy" from={y} to={y - rise} b={b} d={d} />
  </circle>
);

/** a ship of this class standing at the impact point (scaled to fit) */
const ShipAt = ({ cls, x = P.x, children }: { cls: ShipClass; x?: number; children?: ReactNode }) => (
  <g transform={`translate(${x - SIDE_W[cls] * 0.475} ${P.y}) scale(.95)`}>
    {SIDE[cls]}
    {cls === 'dreadnought' && DREADNOUGHT_JETS.map((jx) => <SideJet key={jx} x={jx} />)}
    {children}
  </g>
);

/* ---------- deliveries: the shot or weapon on its way (d = delivery seconds) ---------- */

const Aircraft = ({ y, b, d, kind }: { y: number; b: number; d: number; kind: 'bomber' | 'heli' | 'lifter' }) => (
  <g opacity="0"><Show b={b} />
    <g>
      <animateTransform attributeName="transform" type="translate" values={`-120 ${y};920 ${y}`} begin={s(b)} dur={s(d)} fill="freeze" />
      {kind === 'bomber' && <path d="M0 0 L60 -4 L72 0 L60 4 Z M24 -2 L40 -22 L48 -22 L40 -2 Z M24 2 L40 18 L48 18 L40 2 Z M4 -1 L-4 -10 L2 -10 L10 -1 Z" fill="#9fb3c6" />}
      {kind === 'lifter' && <path d="M0 0 L54 -3 L64 0 L54 5 Z M20 -2 L30 -16 L38 -16 L32 -2 Z" fill="#9fb3c6" />}
      {kind === 'heli' && (
        <g fill="#8fa5b9">
          <path d="M0 0 C0 -10 30 -12 38 -4 L60 -4 L66 -10 L68 -2 L38 4 C26 8 0 8 0 0 Z" />
          <rect x="-30" y="-16" width="96" height="2.4" fill="#cfdbe6" opacity=".6" />
        </g>
      )}
    </g>
  </g>
);

export function DeliveryScene({ kind, d }: { kind: Delivery; d: number }) {
  switch (kind) {
    case 'shell': return <g><Gun /><Shell b={0.1} d={d - 0.15} /></g>;
    case 'salvo': return (
      <g><Gun n={5} />{[0, 1, 2, 3, 4].map((i) => <Shell key={i} b={0.1 + i * 0.12} d={d - 0.7} to={P.x - 70 + i * 34} peak={10 + i * 8} />)}</g>
    );
    case 'frag': return (
      <g><Gun /><Shell b={0.1} d={d * 0.55} to={P.x - 30} toY={70} peak={10} />
        <Burst x={P.x - 30} y={70} b={0.1 + d * 0.55} r={20} d={0.3} />
        {[-60, -30, 0, 30, 60].map((dx) => <Drop key={dx} x0={P.x - 30} y0={70} x1={P.x + dx} b={0.15 + d * 0.55} d={d * 0.4} />)}
      </g>
    );
    case 'airStrike': return (
      <g><Aircraft y={60} b={0} d={d} kind="bomber" />
        {[-60, 0, 60].map((dx, i) => <Drop key={dx} x0={P.x - 150 + i * 60} y0={64} x1={P.x + dx} b={d * 0.35 + i * 0.12} d={d * 0.45} />)}
      </g>
    );
    case 'chainGun': return (
      <g><Aircraft y={92} b={0} d={d * 1.4} kind="heli" />
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i} opacity="0"><Show b={d * 0.4 + i * 0.1} />
            <path d={`M${P.x - 200 + i * 20} 96 L${P.x - 40 + i * 20} ${P.y}`} stroke="#ffd27a" strokeWidth="1.6" strokeDasharray="6 10"><A at="opacity" from={1} to={0} b={d * 0.4 + i * 0.1} d={0.25} /></path>
            <circle cx={P.x - 40 + i * 20} cy={P.y} r="0" fill="#fff0c8"><A at="r" values="0;5;0" b={d * 0.45 + i * 0.1} d={0.2} /></circle>
          </g>
        ))}
      </g>
    );
    case 'seaMine': return (
      <g><Aircraft y={50} b={0} d={d * 0.8} kind="lifter" />
        <g opacity="0"><Show b={d * 0.3} />
          <g><animateTransform attributeName="transform" type="translate" values={`${P.x - 60} 56;${P.x} ${P.y - 6};${P.x + 30} ${P.y - 4}`} keyTimes="0;0.6;1" begin={s(d * 0.3)} dur={s(d * 0.7)} fill="freeze" />
            <path d="M-12 -26 Q0 -40 12 -26 L2 -8 L-2 -8 Z" fill="#cfd8e0" opacity=".8"><A at="opacity" values="0.8;0.8;0" b={d * 0.3} d={d * 0.45} /></path>
            <circle r="7" fill="#2c3a48" stroke="#dbe7f3" strokeWidth="1.5" />
            {[0, 60, 120, 180, 240, 300].map((a) => <line key={a} x1="0" y1="0" x2={Math.cos((a * Math.PI) / 180) * 11} y2={Math.sin((a * Math.PI) / 180) * 11} stroke="#dbe7f3" strokeWidth="1.5" />)}
            <circle r="2" fill="#ffb547"><A at="opacity" values="1;0;1;0;1" b={d * 0.6} d={d * 0.4} /></circle>
          </g>
        </g>
        <Splash x={P.x} b={d * 0.72} h={30} />
      </g>
    );
    case 'torpedo': return (
      <g>
        <rect y="176" width="800" height="64" fill="#0a3550" opacity=".35" />
        <g><animateTransform attributeName="transform" type="translate" values={`-60 204;${P.x - 20} 190`} begin="0s" dur={s(d)} fill="freeze" />
          <path d="M0 0 L40 0 C48 0 52 3 52 5 C52 7 48 10 40 10 L0 10 Z" fill="#cfd8e0" /><path d="M0 0 L-8 -4 L-8 14 L0 10 Z" fill="#ffb547" />
        </g>
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx={-40 + i * ((P.x + 20) / 12)} cy={200 - i * 1.2} r="0" fill="#bfe6ff" opacity=".7">
            <A at="r" values="0;4;0" b={(i / 12) * d} d={0.6} /><A at="cy" from={200 - i * 1.2} to={176} b={(i / 12) * d} d={0.6} />
          </circle>
        ))}
        <path d={`M-20 ${P.y - 1} L${P.x - 20} ${P.y - 1}`} stroke="#dff3ff" strokeOpacity=".5" strokeWidth="2" strokeDasharray="900" strokeDashoffset="900"><A at="stroke-dashoffset" from={900} to={0} b={0} d={d} /></path>
      </g>
    );
    case 'supernova': return (
      <g><Aircraft y={46} b={0} d={d * 0.7} kind="lifter" />
        <g opacity="0"><Show b={d * 0.25} />
          <g><animateTransform attributeName="transform" type="translate" values={`${P.x - 40} 52;${P.x} ${P.y - 30}`} begin={s(d * 0.25)} dur={s(d * 0.55)} fill="freeze" />
            <path d="M-16 -30 Q0 -50 16 -30 L2 -10 L-2 -10 Z" fill="#e8eef3" opacity=".85" />
            <rect x="-5" y="-10" width="10" height="16" rx="3" fill="#dbe7f3" stroke="#38e1ff" />
          </g>
        </g>
        <rect width="800" height="240" fill="#ffffff" opacity="0"><A at="opacity" values="0;1;0" b={d * 0.82} d={0.5} /></rect>
        <circle cx={P.x} cy={P.y - 20} r="0" fill="none" stroke="#ffffff" strokeWidth="6"><A at="r" from={0} to={260} b={d * 0.82} d={0.6} /><A at="opacity" from={1} to={0} b={d * 0.82} d={0.6} /></circle>
      </g>
    );
    case 'thunderhead': return (
      <g><Gun /><Shell b={0.1} d={d * 0.5} to={P.x} toY={80} peak={10} />
        <circle cx={P.x} cy={84} r="0" fill="url(#cn-fire)"><A at="r" values="0;70;60" b={0.1 + d * 0.5} d={0.5} /><A at="opacity" values="1;1;0" b={0.1 + d * 0.5} d={0.8} /></circle>
        {[-1, 0, 1].flatMap((gy) => [-1, 0, 1].map((gx) => <Burst key={`${gx}${gy}`} x={P.x + gx * 40} y={P.y - 6 + gy * 4} b={0.2 + d * 0.62 + (gx + gy + 2) * 0.05} r={16} d={0.35} />))}
      </g>
    );
    case 'cherry': return (
      <g><Gun /><Shell b={0.1} d={d * 0.5} to={P.x} toY={66} peak={14} />
        <Burst x={P.x} y={66} b={0.1 + d * 0.5} r={14} d={0.25} />
        {[[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]].map(([gx, gy]) => <Drop key={`${gx}${gy}`} x0={P.x} y0={66} x1={P.x + gx * 44} y1={P.y + gy * 4} b={0.15 + d * 0.5} d={d * 0.4} />)}
      </g>
    );
    case 'maelstrom': return (
      <g>
        <rect x={P.x - 2} y="0" width="4" height={P.y} fill="#bff6ff" opacity="0"><A at="opacity" values="0;1;1" b={0} d={d * 0.4} /><A at="width" from={4} to={40} b={d * 0.4} d={d * 0.4} /><A at="x" from={P.x - 2} to={P.x - 20} b={d * 0.4} d={d * 0.4} /></rect>
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={P.x} cy={P.y} rx="0" ry="0" fill="none" stroke="#7fecff" strokeWidth="2.5"><A at="rx" from={0} to={180 + i * 40} b={d * 0.55 + i * 0.12} d={0.6} /><A at="ry" from={0} to={18 + i * 4} b={d * 0.55 + i * 0.12} d={0.6} /><A at="opacity" from={1} to={0} b={d * 0.55 + i * 0.12} d={0.6} /></ellipse>
        ))}
        <rect width="800" height="240" fill="#bff6ff" opacity="0"><A at="opacity" values="0;.7;0" b={d * 0.78} d={0.4} /></rect>
      </g>
    );
    case 'mineBlast': return (
      <g>
        <circle cx={P.x} cy={P.y + 22} r="0" fill="#bfe6ff" opacity=".8"><A at="r" values="0;26;0" b={0} d={d} /></circle>
        <path d={`M${P.x - 40} ${P.y} Q${P.x} ${P.y - 60} ${P.x + 40} ${P.y} Z`} fill="#dff3ff" opacity="0"><A at="opacity" values="0;.85;0" b={d * 0.3} d={d * 0.7} /></path>
      </g>
    );
    default: return <g><Gun /><Shell b={0.1} d={d - 0.15} /></g>;
  }
}

/* ---------- impacts (b = when it lands, d = impact seconds) ---------- */

export function ImpactScene({ impact, hitClass, b, d }: { impact: Impact; hitClass: ShipClass | null; b: number; d: number }) {
  switch (impact) {
    case 'splash': return <g><Splash x={P.x} b={b} /><Foreground /></g>;
    case 'hit': return (
      <g>
        {hitClass ? (
          <ShipAt cls={hitClass}>
            <animateTransform attributeName="transform" type="rotate" additive="sum" values="0;-3;2;0" begin={s(b)} dur={s(d)} />
          </ShipAt>
        ) : (
          <path d={`M${P.x - 120} ${P.y} L${P.x - 110} ${P.y - 16} L${P.x + 80} ${P.y - 18} L${P.x + 120} ${P.y - 10} L${P.x + 110} ${P.y} Z`} fill="#141d26" opacity=".85" />
        )}
        <Foreground />
        <Burst x={P.x} y={P.y - 14} b={b} r={62} d={0.6} />
        <Smoke x={P.x - 6} y={P.y - 24} b={b + 0.2} r={34} rise={70} d={d} />
        {[-30, -10, 14, 34].map((dx) => <rect key={dx} x={P.x} y={P.y - 14} width="4" height="3" fill="#ffb547"><Motion path={`M0 0 Q${dx} -60 ${dx * 2} 10`} b={b} d={0.7} /></rect>)}
      </g>
    );
    case 'deflect': return (
      <g>
        {hitClass && <ShipAt cls={hitClass} />}
        <Foreground />
        <path d={`M${P.x - 110} ${P.y} A110 90 0 0 1 ${P.x + 110} ${P.y} Z`} fill="url(#cn-hex)" opacity="0"><A at="opacity" values="0;1;.6;0" b={b} d={d} /></path>
        <path d={`M${P.x - 110} ${P.y} A110 90 0 0 1 ${P.x + 110} ${P.y}`} fill="none" stroke="#7fecff" strokeWidth="3" opacity="0"><A at="opacity" values="0;1;0" b={b} d={d} /></path>
        {[-50, -20, 20, 50].map((dx) => <circle key={dx} cx={P.x} cy={P.y - 90} r="2.5" fill="#fff0c8"><Motion path={`M0 0 Q${dx} -30 ${dx * 2.5} -10`} b={b} d={0.5} /></circle>)}
      </g>
    );
    default: return null;
  }
}

/* ---------- sinkings, one per class (d = seconds) ---------- */

export function SinkScene({ cls, d }: { cls: ShipClass; d: number }) {
  const w = SIDE_W[cls];
  const x0 = 400 - w * 0.55;
  const sinkBy = (deg: string, dy = 60, origin = '0 0') => (
    <>
      <animateTransform attributeName="transform" type="rotate" values={`0 ${origin};${deg} ${origin}`} begin={s(0.25)} dur={s(d * 0.85)} fill="freeze" additive="sum" />
      <animateTransform attributeName="transform" type="translate" values={`0 0;0 ${dy}`} begin={s(0.35)} dur={s(d * 0.75)} fill="freeze" additive="sum" />
    </>
  );
  let ship: ReactNode;
  switch (cls) {
    case 'dreadnought':
      ship = (
        <g>
          {sinkBy('9', 54, `${w} 0`)}
          {SIDE.dreadnought}
          {DREADNOUGHT_JETS.map((jx, i) => (
            <g key={jx}>
              <animateTransform attributeName="transform" type="translate" values={`0 0;${w - jx + 20} 6;${w - jx + 50} 90`} keyTimes="0;0.6;1" begin={s(0.3 + i * 0.08)} dur={s(d * 0.7)} fill="freeze" />
              <SideJet x={jx} />
            </g>
          ))}
        </g>
      );
      break;
    case 'cruiser':
      ship = (
        <g>
          <g><animateTransform attributeName="transform" type="rotate" values={`0 ${w / 2} 0;-16 ${w / 2} 0`} begin={s(0.3)} dur={s(d * 0.8)} fill="freeze" /><animateTransform attributeName="transform" type="translate" values="0 0;-14 58" begin={s(0.4)} dur={s(d * 0.7)} fill="freeze" additive="sum" />
            <clipPath id="cn-cut-a"><rect x="-20" y="-120" width={w / 2 + 20} height="160" /></clipPath><g clipPath="url(#cn-cut-a)">{SIDE.cruiser}</g>
          </g>
          <g><animateTransform attributeName="transform" type="rotate" values={`0 ${w / 2} 0;18 ${w / 2} 0`} begin={s(0.3)} dur={s(d * 0.8)} fill="freeze" /><animateTransform attributeName="transform" type="translate" values="0 0;14 58" begin={s(0.4)} dur={s(d * 0.7)} fill="freeze" additive="sum" />
            <clipPath id="cn-cut-b"><rect x={w / 2} y="-120" width={w / 2 + 20} height="160" /></clipPath><g clipPath="url(#cn-cut-b)">{SIDE.cruiser}</g>
          </g>
        </g>
      );
      break;
    case 'frigate':
      ship = <g>{sinkBy('-24', 64, '0 0')}{SIDE.frigate}</g>;
      break;
    case 'submarine':
      ship = (
        <g>{sinkBy('14', 70, `${w * 0.2} 0`)}{SIDE.submarine}
          {[0.2, 0.4, 0.6, 0.8].map((f, i) => <circle key={f} cx={w * f} cy={-6} r="0" fill="#bfe6ff" opacity=".7"><A at="r" values="0;5;0" b={0.5 + i * 0.15} d={0.8} /><A at="cy" from={0} to={-36} b={0.5 + i * 0.15} d={0.8} /></circle>)}
        </g>
      );
      break;
    case 'corvette':
      ship = <g>{sinkBy('-34', 80, '0 0')}{SIDE.corvette}</g>;
      break;
    case 'cutter':
      ship = (
        <g>{sinkBy('-12', 60, '0 0')}{SIDE.cutter}
          <circle cx={w * 0.7} cy={-40} r="0" fill="#ff6a3d"><A at="r" values="0;6;3" b={0.3} d={0.6} /><A at="cy" from={-40} to={-110} b={0.3} d={d * 0.8} /></circle>
        </g>
      );
      break;
  }
  return (
    <g>
      <g transform={`translate(${x0} ${P.y}) scale(1.1)`}>{ship}</g>
      <Foreground />
      <Burst x={400} y={P.y - 12} b={0.05} r={50} d={0.6} />
      <Smoke x={380} y={P.y - 20} b={0.3} r={44} rise={80} d={d * 0.9} />
      <Smoke x={440} y={P.y - 16} b={0.6} r={36} rise={70} d={d * 0.8} />
      <ellipse cx="400" cy={P.y + 4} rx="10" ry="2" fill="none" stroke="#9fc4dd"><A at="rx" from={10} to={180} b={d * 0.6} d={d * 0.4} /><A at="opacity" from={1} to={0} b={d * 0.6} d={d * 0.4} /></ellipse>
    </g>
  );
}

/** The short generic effect for anything without its own scene (and Fast): a flash at the point of impact. */
export function GenericScene({ d }: { d: number }) {
  return <g><Burst x={P.x} y={P.y - 10} b={0} r={30} d={Math.min(0.5, d)} /><Foreground /></g>;
}
