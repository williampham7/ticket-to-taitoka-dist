import type { CurtainProps } from '../../EnterCurtain';
import './rail.css';

/**
 * 'rail' (Europe) curtain: a pair of lacquered art-deco carriage doors with brass inlay and an enamel plaque.
 * Closed, the doors fill the screen and the plaque shows the title. Opening: the brass catch turns, the doors
 * swing inward on their hinges (the plaque splits at the seam), warm light floods through and steam billows,
 * then everything fades to the board. CSS-only; closed build ~2.8 s (HOLD_MS 3.2 s), opening beats inside OPEN_MS (5.2 s).
 */

/** Sunburst rays fanning out from the seam (x = 500, y = 500); the right door mirrors the whole face. */
const RAYS = Array.from({ length: 17 }, (_, i) => {
  const deg = 100 + i * 10;
  const half = i % 2 ? 1.1 : 2.4;
  const pt = (a: number) => {
    const r = (a * Math.PI) / 180;
    return `${(500 + 1300 * Math.cos(r)).toFixed(1)},${(500 + 1300 * Math.sin(r)).toFixed(1)}`;
  };
  return { d: `500,500 ${pt(deg - half)} ${pt(deg + half)}`, thin: i % 2 === 1, i };
});

function Sunburst() {
  return (
    <svg className="rc-sun" viewBox="0 0 500 1000" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <defs>
        <linearGradient id="rc-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dc9a" />
          <stop offset=".45" stopColor="#c9a24e" />
          <stop offset="1" stopColor="#7d5a22" />
        </linearGradient>
      </defs>
      {RAYS.map((r) => (
        <polygon key={r.i} points={r.d} fill="url(#rc-brass)" opacity={r.thin ? 0.35 : 0.6} />
      ))}
      {[170, 230, 300].map((r) => (
        <circle key={r} cx="500" cy="500" r={r} fill="none" stroke="#c9a24e" strokeWidth={r === 230 ? 5 : 2} opacity=".7" />
      ))}
      <circle cx="500" cy="500" r="120" fill="#16362a" stroke="#d9b866" strokeWidth="4" />
    </svg>
  );
}

function WingedWheel() {
  const wing = 'M37 22 C 28 13 14 12 2 15 C 13 17 22 18 37 24 Z M37 26 C 28 20 17 20 7 22 C 16 24 25 25 37 28 Z M38 30 C 30 27 21 28 13 30 C 21 31 29 32 38 32 Z';
  return (
    <svg className="rc-wheel" viewBox="0 0 100 46" aria-hidden>
      <g fill="currentColor">
        <path d={wing} />
        <path d={wing} transform="translate(100 0) scale(-1 1)" />
      </g>
      <g className="rc-wheel-spin" fill="none" stroke="currentColor">
        <circle cx="50" cy="25" r="12" strokeWidth="2.6" />
        <circle cx="50" cy="25" r="3" fill="currentColor" stroke="none" />
        {[0, 45, 90, 135].map((a) => <line key={a} x1="50" y1="13" x2="50" y2="37" strokeWidth="1.6" transform={`rotate(${a} 50 25)`} />)}
      </g>
    </svg>
  );
}

function Plaque({ title }: { title: string }) {
  return (
    <div className="rc-plaque">
      <div className="rc-plaque-in">
        <WingedWheel />
        <div className="rc-kicker">Société des Voyages Continentaux</div>
        <div className="rc-title">{title}</div>
        <div className="rc-rule"><span /><i /><span /></div>
        <div className="rc-sub">Départ&nbsp;·&nbsp;Voie&nbsp;1&nbsp;·&nbsp;Toutes Directions</div>
      </div>
    </div>
  );
}

function Door({ side, title }: { side: 'l' | 'r'; title: string }) {
  return (
    <div className={`rc-door rc-door-${side}`}>
      <div className="rc-face">
        <div className="rc-frame">
          <div className="rc-chev rc-chev-top" />
          <div className="rc-enamel"><Sunburst /><div className="rc-glint" /></div>
          <div className="rc-chev rc-chev-bot" />
        </div>
        <div className="rc-seam" />
        <div className="rc-handle" />
        <div className="rc-hinge" style={{ top: '12%' }} />
        <div className="rc-hinge" style={{ top: '48%' }} />
        <div className="rc-hinge" style={{ top: '84%' }} />
      </div>
      <Plaque title={title} />
      <div className="rc-shade" />
    </div>
  );
}

export function RailCurtain({ opening, title }: CurtainProps) {
  return (
    <div className={`rc-root${opening ? ' rc-open' : ''}`}>
      <div className="rc-backing" />
      <div className="rc-light" />
      <div className="rc-stage">
        <Door side="l" title={title} />
        <Door side="r" title={title} />
      </div>
      <div className="rc-crack" />
      <div className="rc-latch"><div className="rc-latch-bar" /><div className="rc-latch-boss" /></div>
      <div className="rc-steam">
        {Array.from({ length: 8 }, (_, i) => <span key={i} className={`rc-puff rc-puff-${i}`} />)}
      </div>
      <div className="rc-vignette" />
    </div>
  );
}
