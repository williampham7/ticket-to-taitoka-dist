import { useEffect, useState, type CSSProperties } from 'react';
import type { CurtainProps } from './EnterCurtain';
import './hsr.css';

/**
 * China edition curtain: a high-speed-rail platform, facing a pair of platform screen doors.
 * Closed: the camera faces the doors set in a wall of fixed glass panels under a stainless header with a scrolling
 * red LED ticker; ceiling light lines, a hanging blue station sign and an LED clock above, safety stickers and a
 * route map on the glass, a polished granite floor with the yellow tactile strip and green boarding arrows below.
 * A white-and-red train streaks past behind the glass, and the LED departure board carries the title. A station
 * ambience cue (introHsr.ts `playHsrWaiting`) plays meanwhile.
 * Opening: the chime sounds and the lamps turn green, the board drops away, the doors pop and slide apart behind
 * the fixed panels while the trackway behind the glass fills with cool light, and the camera pushes through the
 * doorway with speed lines; the light then dissolves into the real board, which comes into focus from a blurred,
 * washed-out glow (`backdrop-filter`, as in the USA intro). Closed build ~2.8 s (HOLD_MS 3.2 s); opening beats inside
 * OPEN_MS (5.2 s), the glow gone by ~4.7 s and the focus by ~4.95 s.
 *
 * Geometry: the doorway box is --dw wide and 1.3 --dw tall (SVG units 100 x 130: doors x 0..100, y 0..130; the
 * header sits at y -24..0, the floor starts at y 130). The box's top is at 24vh.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** --dw in px, mirrored from hsr.css (min(40vw, 46vh)); the door centre sits at 24vh + .65 dw. */
function dollyZoom(): number {
  if (typeof window === 'undefined') return 6;
  const vw = window.innerWidth, vh = window.innerHeight;
  const dw = Math.min(0.4 * vw, 0.46 * vh);
  const oy = 0.24 * vh + 0.65 * dw;
  const s = Math.max(vw / dw, (2 * Math.max(oy, vh - oy)) / (1.3 * dw));
  return Math.max(2, s * 1.15);
}

/** radial speed lines for the push through the doorway */
const RAYS = range(22).map((i) => ({ a: Math.round(i * (360 / 22) + ((i * 37) % 11) - 5), d: ((i * 7) % 10) * 0.06 }));

/* ============================== behind the glass: the trackway ============================== */

function Trackway() {
  return (
    <div className="hc-behind">
      <svg className="hc-fill" viewBox="0 0 1000 130" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="hc-track" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1222" />
            <stop offset=".55" stopColor="#141f36" />
            <stop offset="1" stopColor="#070b14" />
          </linearGradient>
        </defs>
        <rect width="1000" height="130" fill="url(#hc-track)" />
        {/* the far wall: lit advertising light boxes and a row of tunnel lamps */}
        {range(9).map((i) => <rect key={i} x={30 + i * 112} y="34" width="70" height="40" rx="2" fill="#2a4a78" opacity=".35" />)}
        {range(9).map((i) => <rect key={i} x={38 + i * 112} y="40" width="54" height="4" fill="#9cc4ff" opacity=".25" />)}
        {range(40).map((i) => <ellipse key={i} cx={12 + i * 25} cy="20" rx="2.4" ry=".9" fill="#d9ecff" opacity=".4" />)}
        <rect y="96" width="1000" height="3" fill="#1f2c45" />
        <rect y="104" width="1000" height="2" fill="#2b3a58" />
      </svg>
      {/* a train streaking past, twice */}
      <div className="hc-train hc-t1"><i /></div>
      <div className="hc-train hc-t2"><i /></div>
    </div>
  );
}

/* ============================== the platform: wall, header, ceiling, floor ============================== */

const PANEL_W = 110; // glass panel + mullion pitch, in door units
const MULL = 8;
/** fixed glass panels either side of the doorway (x of each panel's left edge) */
const PANELS = [-3, -2, -1, 1, 2, 3].map((k) => (k < 0 ? k * PANEL_W + MULL : 100 + MULL + (k - 1) * PANEL_W));
/** the wall with holes for the doorway and every glass panel */
const WALL = `M-2000 -2000 H2100 V2000 H-2000 Z M0 0 H100 V130 H0 Z ${PANELS.map((x) => `M${x} 0 H${x + PANEL_W - MULL} V122 H${x} Z`).join(' ')}`;
const FLOOR_RAYS = range(17).map((i) => i - 8);
const CEIL_LIGHTS = range(9).map((i) => -340 + i * 95);
const TICKER = '列车即将进站  请注意安全  请勿倚靠屏蔽门  ·  THE TRAIN IS ARRIVING  ·  PLEASE MIND THE GAP  ·  ';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <g transform="translate(132 -50)">
      <rect x="18" y="-12" width="1" height="12" fill="#8c97a8" />
      <rect x="62" y="-12" width="1" height="12" fill="#8c97a8" />
      <rect width="80" height="18" rx="1.5" fill="#0b0f18" stroke="#56627a" strokeWidth=".6" />
      <text x="6" y="7.4" fontSize="4.6" className="hc-zh" fill="#f2a900">开往</text>
      <text x="6" y="14" fontSize="3.6" fill="#8ea2c2" letterSpacing=".4">TO 北京南  G1</text>
      <text x="74" y="13.6" fontSize="11" textAnchor="end" className="hc-led" fill="#ff3b30">
        {hh}<tspan className="hc-colon">:</tspan>{mm}
      </text>
    </g>
  );
}

function StationSign() {
  return (
    <g transform="translate(-122 -52)">
      <rect x="16" y="-10" width="1" height="10" fill="#8c97a8" />
      <rect x="76" y="-10" width="1" height="10" fill="#8c97a8" />
      <rect width="94" height="22" rx="1.5" fill="#1d5fbf" />
      <rect x="1" y="1" width="92" height="20" rx="1" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth=".4" />
      <text x="47" y="11" fontSize="9" textAnchor="middle" className="hc-zh" fill="#fff" fontWeight="700" letterSpacing="1.4">北京南</text>
      <text x="47" y="17.6" fontSize="3.8" textAnchor="middle" fill="#dbe8ff" letterSpacing=".6">BEIJING SOUTH</text>
      <path d="M6 11 h7 m-2.6 -2.6 l2.6 2.6 -2.6 2.6" stroke="#fff" strokeWidth=".9" fill="none" />
    </g>
  );
}

/** a small route-map sticker on the glass: the line with the stations, this one highlighted */
function RouteMap({ x, y }: { x: number; y: number }) {
  const stops = ['上海虹桥', '南京南', '济南西', '天津南', '北京南'];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="84" height="26" rx="1.2" fill="#f4f7fb" opacity=".92" />
      <rect width="84" height="5" rx="1.2" fill="#c8102e" />
      <text x="3" y="3.8" fontSize="3" fill="#fff" className="hc-zh" fontWeight="700">京沪高铁</text>
      <text x="81" y="3.8" fontSize="2.4" fill="#fff" textAnchor="end" letterSpacing=".2">BEIJING–SHANGHAI HSR</text>
      <line x1="8" y1="15" x2="76" y2="15" stroke="#1d5fbf" strokeWidth="1.4" />
      {stops.map((s, i) => {
        const cx = 8 + i * 17;
        const here = i === stops.length - 1;
        return (
          <g key={s}>
            <circle cx={cx} cy="15" r={here ? 2.2 : 1.5} fill={here ? '#c8102e' : '#fff'} stroke="#1d5fbf" strokeWidth=".6" />
            <text x={cx} y="22.4" fontSize="2.6" textAnchor="middle" className="hc-zh" fill={here ? '#c8102e' : '#25324d'} fontWeight={here ? 700 : 400}>{s}</text>
          </g>
        );
      })}
    </g>
  );
}

/** "no leaning" pictogram and a caution strip on a fixed panel */
function SafetySticker({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="8" fill="#fff" opacity=".95" />
      <circle r="7" fill="none" stroke="#c8102e" strokeWidth="1.4" />
      <g fill="#14213d">
        <circle cx="-.6" cy="-3.6" r="1.2" />
        <path d="M-1.6 -2 h2 l1.6 4.6 -1 .4 -1 -2.6 v4.6 h-1.6 z" />
      </g>
      <rect x="2.4" y="-5" width="1" height="10" fill="#14213d" />
      <line x1="-5" y1="5" x2="5" y2="-5" stroke="#c8102e" strokeWidth="1.4" />
      <text y="12.4" fontSize="2.8" textAnchor="middle" className="hc-zh" fill="#f4f7fb">请勿倚靠</text>
      <text y="15.6" fontSize="2" textAnchor="middle" fill="#cfd8e6" letterSpacing=".2">NO LEANING</text>
    </g>
  );
}

function Platform() {
  return (
    <svg className="hc-wall" viewBox="0 0 100 130" overflow="visible" aria-hidden>
      <defs>
        <linearGradient id="hc-steel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f9aab" />
          <stop offset=".35" stopColor="#e9eef4" />
          <stop offset=".6" stopColor="#c3ccd8" />
          <stop offset="1" stopColor="#7d889a" />
        </linearGradient>
        <linearGradient id="hc-header" x1="0" y1="-24" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#dfe5ec" />
          <stop offset=".5" stopColor="#b9c3cf" />
          <stop offset="1" stopColor="#8e99aa" />
        </linearGradient>
        <linearGradient id="hc-ceil" x1="0" y1="-200" x2="0" y2="-24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0c111c" />
          <stop offset="1" stopColor="#2a3346" />
        </linearGradient>
        <linearGradient id="hc-floor" x1="0" y1="130" x2="0" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a9b3c1" />
          <stop offset=".4" stopColor="#7e8899" />
          <stop offset="1" stopColor="#3c4352" />
        </linearGradient>
        <linearGradient id="hc-glass" x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor="#dff0ff" stopOpacity=".2" />
          <stop offset=".5" stopColor="#9fc3e8" stopOpacity=".06" />
          <stop offset="1" stopColor="#dff0ff" stopOpacity=".14" />
        </linearGradient>
        <linearGradient id="hc-refl" x1="0" y1="130" x2="0" y2="175" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e9f2ff" stopOpacity=".32" />
          <stop offset="1" stopColor="#e9f2ff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hc-lamp">
          <stop offset="0" stopColor="#f2fbff" stopOpacity=".55" />
          <stop offset="1" stopColor="#f2fbff" stopOpacity="0" />
        </radialGradient>
        <pattern id="hc-tactile" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r=".7" fill="#b88a00" opacity=".55" />
        </pattern>
        <clipPath id="hc-ticker-clip"><rect x="18" y="-17.5" width="64" height="11" /></clipPath>
      </defs>

      {/* the wall: a stainless frame around the doorway and the glass panels */}
      <path d={WALL} fill="#c3ccd8" fillRule="evenodd" />
      {PANELS.map((x) => <rect key={x} x={x} y="0" width={PANEL_W - MULL} height="122" fill="url(#hc-glass)" />)}
      {[...PANELS.map((x) => x - MULL), -MULL].map((x) => <rect key={x} x={x} y="0" width={MULL} height="130" fill="url(#hc-steel)" />)}
      {PANELS.map((x) => (
        <g key={x}>
          <rect x={x} y="122" width={PANEL_W - MULL} height="8" fill="#9aa5b4" />
          <rect x={x} y="122" width={PANEL_W - MULL} height=".6" fill="#fff" opacity=".6" />
          <polygon points={`${x + 14},0 ${x + 30},0 ${x + 10},122 ${x},122 ${x},40`} fill="#fff" opacity=".05" />
          {/* the livery stripe runs across the glass */}
          <rect x={x} y="78" width={PANEL_W - MULL} height="3.2" fill="#c8102e" opacity=".85" />
          <rect x={x} y="82.4" width={PANEL_W - MULL} height="1" fill="#1d5fbf" opacity=".85" />
          <rect x={x} y="112" width={PANEL_W - MULL} height="3" fill="#f2c200" opacity=".8" />
          <text x={x + (PANEL_W - MULL) / 2} y="114.4" fontSize="2.1" textAnchor="middle" fill="#14213d" letterSpacing=".3">小心站台间隙  MIND THE GAP</text>
        </g>
      ))}
      <RouteMap x={-105} y={84} />
      <SafetySticker x={160} y={96} />

      {/* header box over the whole wall, with the red LED ticker above the doorway */}
      <rect x="-2000" y="-24" width="4100" height="24" fill="url(#hc-header)" />
      <rect x="-2000" y="-24" width="4100" height=".8" fill="#fff" opacity=".7" />
      <rect x="-2000" y="-1.4" width="4100" height="1.4" fill="#5d687a" />
      <rect x="16" y="-19" width="68" height="14" rx="1" fill="#06080d" />
      <g clipPath="url(#hc-ticker-clip)">
        <g className="hc-ticker">
          <text x="18" y="-9.4" fontSize="6.6" className="hc-led hc-zh" fill="#ff3b30">{TICKER}{TICKER}</text>
        </g>
        <text className="hc-ticker-open hc-led hc-zh" x="50" y="-9.4" fontSize="6.6" textAnchor="middle" fill="#2ee07a">开门 · DOORS OPENING</text>
      </g>
      <g>
        <circle cx="6" cy="-12" r="4.4" fill="#14213d" />
        <text x="6" y="-9.6" fontSize="6.4" textAnchor="middle" fill="#fff" fontWeight="700">3</text>
        <circle cx="94" cy="-12" r="4.4" fill="#14213d" />
        <text x="94" y="-9.6" fontSize="6.4" textAnchor="middle" fill="#fff" fontWeight="700">3</text>
      </g>
      {PANELS.map((x) => (
        <text key={x} x={x + (PANEL_W - MULL) / 2} y="-9.6" fontSize="3.4" textAnchor="middle" fill="#3b4760" letterSpacing=".5">
          站台屏蔽门 · PLATFORM SCREEN DOOR
        </text>
      ))}

      {/* ceiling: a slatted soffit with lines of light */}
      <rect x="-2000" y="-2000" width="4100" height="1976" fill="url(#hc-ceil)" />
      <g stroke="#3b465c" strokeWidth=".5">{range(40).map((i) => <line key={i} x1={-2000} y1={-25 - i * 2.2} x2={2100} y2={-25 - i * 2.2} />)}</g>
      {CEIL_LIGHTS.map((x) => (
        <g key={x}>
          <ellipse className="hc-lamp-glow" cx={x + 30} cy="-60" rx="46" ry="14" fill="url(#hc-lamp)" />
          <rect x={x} y="-61.6" width="60" height="2.6" rx="1.3" fill="#f5fbff" />
        </g>
      ))}
      <rect x="-2000" y="-28" width="4100" height="4" fill="#1b2230" />
      <StationSign />
      <Clock />

      {/* floor: polished granite, reflections, the tactile strip and boarding arrows */}
      <rect x="-2000" y="130" width="4100" height="2000" fill="url(#hc-floor)" />
      <g stroke="#2f3644" strokeOpacity=".35" strokeWidth=".35">
        {FLOOR_RAYS.map((k) => <line key={k} x1={50 + k * 24} y1="130" x2={50 + k * 24 * 40} y2={130 + 70 * 40} />)}
        {[6, 14, 26, 44, 70].map((d) => <line key={d} x1="-2000" y1={130 + d} x2="2100" y2={130 + d} />)}
      </g>
      <rect x="-2000" y="130" width="4100" height="45" fill="url(#hc-refl)" opacity=".5" />
      <rect className="hc-refl-door" x="0" y="130" width="100" height="40" fill="url(#hc-refl)" />
      <rect x="-2000" y="132.5" width="4100" height="5.5" fill="#f2c200" />
      <rect x="-2000" y="132.5" width="4100" height="5.5" fill="url(#hc-tactile)" />
      {/* boarding arrows (green, at the sides) and the alighting lane (white, in the middle) */}
      <g fill="#20b25e" opacity=".9">
        <path d="M9 150 l7 -8 7 8 h-4.2 v4.6 h-5.6 v-4.6 z" />
        <path d="M77 150 l7 -8 7 8 h-4.2 v4.6 h-5.6 v-4.6 z" />
      </g>
      <rect x="38" y="141" width="24" height="15" rx="1" fill="none" stroke="#f4f7fb" strokeOpacity=".85" strokeWidth=".7" />
      <path d="M50 143.5 v8 m-3 -3 l3 3 3 -3" stroke="#f4f7fb" strokeOpacity=".85" strokeWidth=".8" fill="none" />
      <text x="16" y="159.4" fontSize="2.8" textAnchor="middle" className="hc-zh" fill="#20b25e">上车</text>
      <text x="84" y="159.4" fontSize="2.8" textAnchor="middle" className="hc-zh" fill="#20b25e">上车</text>
      <text x="50" y="159.4" fontSize="2.8" textAnchor="middle" className="hc-zh" fill="#f4f7fb" fillOpacity=".85">下车</text>

      {/* the hall dims as the eye adjusts to the light beyond the doors */}
      <path className="hc-dim" d="M-2000 -2000 H2100 V2000 H-2000 Z M0 0 H100 V130 H0 Z" fill="#05080f" fillRule="evenodd" />
    </svg>
  );
}

/* ============================== doors and light ============================== */

function Door({ side }: { side: 'l' | 'r' }) {
  return (
    <div className={`hc-door hc-${side}`}>
      <div className="hc-glass"><i className="hc-sheen" /></div>
      <div className="hc-stripe" />
      <div className="hc-stripe-thin" />
      <div className="hc-decal"><b className="hc-zh">请勿倚靠</b><span>{side === 'l' ? '◀' : '▶'}</span></div>
      <div className="hc-grip" />
    </div>
  );
}

function Light() {
  return (
    <svg className="hc-wall hc-light" viewBox="0 0 100 130" overflow="visible" aria-hidden>
      <defs>
        <linearGradient id="hc-pool" x1="0" y1="130" x2="0" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f0f8ff" stopOpacity=".95" />
          <stop offset=".5" stopColor="#bfe0ff" stopOpacity=".3" />
          <stop offset="1" stopColor="#bfe0ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hc-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4faff" stopOpacity=".75" />
          <stop offset="1" stopColor="#cfe6ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon className="hc-pool" points="0,130 100,130 240,280 -140,280" fill="url(#hc-pool)" />
      <g className="hc-beams">
        {['0,4 22,4 -80,260 -180,260', '30,4 48,4 30,270 -30,270', '52,4 70,4 130,270 70,270', '78,4 100,4 280,260 180,260'].map((p) => (
          <polygon key={p} points={p} fill="url(#hc-beam)" />
        ))}
      </g>
    </svg>
  );
}

/* ============================== scene ============================== */

export function HsrCurtain({ opening, title }: CurtainProps) {
  const [zoom, setZoom] = useState(dollyZoom);
  useEffect(() => {
    const on = () => setZoom(dollyZoom());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return (
    <div className={`hc-root${opening ? ' hc-opening' : ''}`} style={{ '--zoom': zoom } as CSSProperties}>
      {/* beyond the doors: cool light, which dissolves into the real board underneath */}
      <div className="hc-focus" />
      <div className="hc-glow"><i /></div>
      <div className="hc-stage">
        <div className="hc-box">
          <Trackway />
          <div className="hc-doors">
            <Door side="l" />
            <Door side="r" />
            <div className="hc-seam" />
          </div>
          <Platform />
          <Light />
        </div>
      </div>

      <div className="hc-tunnel">
        {RAYS.map((r, i) => (
          <i key={i} className="hc-ray" style={{ '--a': `${r.a}deg`, '--d': `${r.d}s` } as CSSProperties} />
        ))}
      </div>

      <div className="hc-board">
        <div className="hc-board-top">
          <span className="hc-lamp" />
          <span className="hc-zh">列车即将进站</span>
          <span className="hc-en">Now boarding</span>
          <span className="hc-tag">G1</span>
        </div>
        <div className="hc-title">{title}</div>
        <div className="hc-board-row">
          <span><b className="hc-zh">站台</b> Platform 1</span>
          <span className="hc-dot" />
          <span><b className="hc-zh">终点</b> 北京南</span>
          <span className="hc-dot" />
          <span className="hc-status"><b className="hc-zh">{opening ? '开门' : '请候车'}</b>{opening ? ' Doors open' : ' Please wait'}</span>
        </div>
      </div>

      <div className="hc-flash" />
      <div className="hc-vignette" />
      <div className="hc-fadein" />
    </div>
  );
}
