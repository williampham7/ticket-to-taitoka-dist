import { useMemo, useState } from 'react';
import { LAND_PATHS, MAP_H, MAP_W, START_ARMIES, TERRITORY_GEO, TERRITORY_IDS, TERRITORY_PATHS } from '@boboland/shared/src/warfront';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { MusicButton } from '../lib/AudioButtons';
import { FACTIONS } from './factions';
import { Manual } from './Manual';
import { KIND_LABEL, encodeCfg, lastCfg, rememberCfg, type LocalCfg, type SeatKind } from './setup';
import { WarDefs } from './Units';
import './menu.css';

const SC = 576 / MAP_W;
/** Territories already "held" on the menu's operations map (faction index). */
const HELD: Record<string, number> = { WEU: 0, UK: 0, CEU: 0, MAG: 0, CHN: 1, SEA: 1, IND: 1, JPN: 1, CAP: 2, CON: 2, MAD: 2, HRN: 2, PLN: 3, GUL: 3, ATL: 3, QUE: 3, EEU: 4, URL: 4, SCA: 4, AMZ: 5, AND: 5 };
const PINS: [string, number][] = [['WEU', 0], ['CHN', 1], ['CAP', 2], ['PLN', 3], ['EEU', 4], ['AMZ', 5]];
const geo = (t: string) => TERRITORY_GEO[t] ?? { x: 0, y: 0 };

/** The start menu: an overhead general's desk. The map plans a battle, the phone opens an online war room, the binder is the Field Manual. */
export function WarMenu() {
  const party = usePartyState();
  const [muster, setMuster] = useState(false);
  const [manual, setManual] = useState(false);
  const act = (f: () => void) => ({ onClick: f, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }, role: 'button', tabIndex: 0 });
  return (
    <div className="warfront wf-desk-page" data-testid="wf-menu">
      <header className="wf-menu-head">
        <div className="wf-row wf-menu-tools">
          <button type="button" className="wf-plq" onClick={() => navigate('/')}><i className="wf-plq-screw" aria-hidden /><span>‹ All games</span><i className="wf-plq-screw" aria-hidden /></button>
          <MusicButton className="wf-plq wf-plq-icon" />
        </div>
        <div className="wf-title wf-nameplate">
          <h1>WARFRONT</h1>
          <p><span aria-hidden>★</span> The General's War Table · 2-6 players <span aria-hidden>★</span></p>
        </div>
        <span className="wf-menu-spacer" aria-hidden />
      </header>
      <div className="wf-desk">
        <svg viewBox="0 0 1200 680" className="wf-desk-svg" aria-label="The general's desk">
          <WarDefs />
          <DeskDefs />
          {/* leather blotter with brass corners */}
          <g aria-hidden pointerEvents="none">
            <rect x="226" y="48" width="752" height="470" rx="14" fill="#000" opacity=".28" transform="translate(4,8)" />
            <rect x="226" y="48" width="752" height="470" rx="14" fill="url(#wf-mn-leather)" />
            <rect x="226" y="48" width="752" height="470" rx="14" fill="url(#wf-mn-grain)" opacity=".5" />
            <rect x="240" y="62" width="724" height="442" rx="8" fill="none" stroke="#c9a46a" strokeOpacity=".5" strokeWidth="1.6" strokeDasharray="7 5" />
            {[[226, 48, 0], [978, 48, 90], [978, 518, 180], [226, 518, 270]].map(([x, y, r]) => (
              <path key={r} transform={`translate(${x},${y}) rotate(${r})`} d="M0,0 L46,0 L46,8 Q12,10 8,46 L0,46Z" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth="1" />
            ))}
          </g>
          <LampDecor />
          <PaperDecor />
          {/* the operations map */}
          <g className="wf-obj wf-obj-map" {...act(() => setMuster(true))} aria-label="Plan a battle on this device" data-testid="wf-plan">
            <g transform="translate(300,120) rotate(-2)">
              <rect x="-6" y="0" width="616" height="318" fill="#000" opacity=".32" filter="url(#wf-lift)" />
              <rect width="600" height="304" fill="url(#wf-paperg)" stroke="#b9a476" />
              <rect width="600" height="304" fill="url(#wf-mn-paperfx)" opacity=".55" />
              <g transform={`translate(12,14) scale(${SC})`}>
                <rect width={MAP_W} height={MAP_H} fill="url(#wf-mn-sea)" />
                <g stroke="#7fb1a8" strokeOpacity=".5" strokeWidth="2" strokeDasharray="6 10" fill="none">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => <line key={`v${i}`} x1={i * 200} x2={i * 200} y1="0" y2={MAP_H} />)}
                  {[1, 2, 3].map((i) => <line key={`h${i}`} y1={i * 188} y2={i * 188} x1="0" x2={MAP_W} />)}
                </g>
                {[[34, 0.12], [18, 0.2]].map(([w, o]) => <g key={w} fill="none" stroke="#9fd0c6" strokeWidth={w} opacity={o} strokeLinejoin="round">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>)}
                <g filter="url(#wf-mn-relief)">{LAND_PATHS.map((d, i) => <path key={i} d={d} fill="url(#wf-mn-land)" />)}</g>
                {Object.entries(HELD).map(([t, f]) => TERRITORY_PATHS[t] ? <path key={t} d={TERRITORY_PATHS[t]} fill={FACTIONS[f].color} opacity=".42" /> : null)}
                {Object.entries(HELD).map(([t, f]) => TERRITORY_PATHS[t] ? <path key={`h${t}`} d={TERRITORY_PATHS[t]} fill={`url(#wf-h${f})`} opacity=".3" /> : null)}
                <g fill="none" stroke="#3a3128" strokeWidth="1.6" strokeOpacity=".55" strokeLinejoin="round">{TERRITORY_IDS.map((t) => <path key={t} d={TERRITORY_PATHS[t]} />)}</g>
                <g fill="none" stroke="#5a4526" strokeWidth="3">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
                <MenuFront />
                {PINS.map(([t, f]) => (
                  <g key={t} transform={`translate(${geo(t).x + 22},${geo(t).y + 10})`}>
                    <use href="#wf-u-arm" x="-30" y="-26" width="60" height="60" fill={`url(#wf-m${f})`} stroke="#1d150c" strokeWidth="1.4" filter="url(#wf-shadow)" />
                  </g>
                ))}
              </g>
              {/* creases, coffee ring, cartouche */}
              <g pointerEvents="none">
                {[200, 400].map((x) => <rect key={x} x={x - 3} y="0" width="6" height="304" fill="url(#wf-mn-crease)" opacity=".5" />)}
                <rect x="0" y="149" width="600" height="6" fill="url(#wf-mn-creaseh)" opacity=".45" />
                <circle cx="548" cy="58" r="30" fill="none" stroke="#7a4f22" strokeOpacity=".22" strokeWidth="5" />
                <circle cx="548" cy="58" r="27" fill="none" stroke="#7a4f22" strokeOpacity=".12" strokeWidth="2" />
                <g transform="translate(446,232)">
                  <rect width="132" height="40" fill="#f5ecd2" stroke="#5a4526" strokeWidth="1.2" />
                  <rect x="3" y="3" width="126" height="34" fill="none" stroke="#5a4526" strokeWidth=".6" />
                  <text x="66" y="17" textAnchor="middle" className="wf-mn-cart">THEATRE OF WAR</text>
                  <text x="66" y="30" textAnchor="middle" className="wf-mn-cart-sub">Sheet 1 of 1 · Scale 1:40,000,000</text>
                </g>
              </g>
              {PINS.map(([t, f]) => <PushPin key={t} x={12 + geo(t).x * SC} y={14 + geo(t).y * SC} color={FACTIONS[f].color} />)}
              {[[6, 6], [594, 6], [6, 298], [594, 298]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="url(#wf-brass)" stroke="#4d3510" />)}
              <text x="300" y="298" textAnchor="middle" className="wf-desk-cap">OPERATIONS MAP · CLASSIFIED</text>
            </g>
            <Tag x={600} y={458} chain={-26} text="Plan a battle" sub="vs Computer · Pass and play" icon="map" />
          </g>
          {/* field telephone */}
          <g className="wf-obj wf-obj-phone" {...act(() => navigate('/warfront/host'))} aria-label="Open an online war room" data-testid="wf-online">
            <Phone />
            <Tag x={1010} y={476} chain={-40} text="Online war room" sub="Invite up to 5 generals" icon="phone" />
          </g>
          {/* field manual */}
          <g className="wf-obj wf-obj-binder" {...act(() => setManual(true))} aria-label="Read the Field Manual" data-testid="wf-manual">
            <Binder />
            <Tag x={232} y={640} chain={-28} text="Field Manual" sub="Rules and controls" icon="book" />
          </g>
          <DeskDecor />
        </svg>
      </div>
      <nav className="wf-desk-quick" aria-label="Warfront menu">
        <button type="button" className="wf-plq" onClick={() => setMuster(true)}><i className="wf-plq-screw" aria-hidden /><span><b>Plan a battle</b><small>vs Computer · Pass and play</small></span><i className="wf-plq-screw" aria-hidden /></button>
        <button type="button" className="wf-plq" onClick={() => navigate('/warfront/host')}><i className="wf-plq-screw" aria-hidden /><span><b>Online war room</b><small>Invite up to 5 generals</small></span><i className="wf-plq-screw" aria-hidden /></button>
        <button type="button" className="wf-plq" onClick={() => setManual(true)}><i className="wf-plq-screw" aria-hidden /><span><b>Field Manual</b><small>Rules and controls</small></span><i className="wf-plq-screw" aria-hidden /></button>
      </nav>
      {muster && <Muster onClose={() => setMuster(false)} name={party.name?.trim() || 'You'} />}
      {manual && <Manual onClose={() => setManual(false)} />}
    </div>
  );
}

function DeskDefs() {
  return (
    <defs>
      <linearGradient id="wf-paperg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f7efd8" /><stop offset=".6" stopColor="#efe2bd" /><stop offset="1" stopColor="#dcc99b" /></linearGradient>
      <radialGradient id="wf-mn-paperfx" cx=".5" cy=".5" r=".75"><stop offset=".6" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#8a6a32" stopOpacity=".55" /></radialGradient>
      <linearGradient id="wf-mn-crease" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".45" stopColor="#fff" stopOpacity=".7" /><stop offset=".55" stopColor="#6b5530" stopOpacity=".35" /><stop offset="1" stopColor="#6b5530" stopOpacity="0" /></linearGradient>
      <linearGradient id="wf-mn-creaseh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".45" stopColor="#fff" stopOpacity=".7" /><stop offset=".55" stopColor="#6b5530" stopOpacity=".35" /><stop offset="1" stopColor="#6b5530" stopOpacity="0" /></linearGradient>
      <linearGradient id="wf-mn-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cfe3da" /><stop offset="1" stopColor="#b5d2c9" /></linearGradient>
      <linearGradient id="wf-mn-land" x1="0" y1="0" x2="0" y2={MAP_H} gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#eef0ea" /><stop offset=".12" stopColor="#c8ceb0" /><stop offset=".25" stopColor="#a9ba86" /><stop offset=".42" stopColor="#c2b67e" />
        <stop offset=".5" stopColor="#dcc591" /><stop offset=".6" stopColor="#a5b273" /><stop offset=".78" stopColor="#c4b27e" /><stop offset="1" stopColor="#d9d8c8" />
      </linearGradient>
      <filter id="wf-mn-relief" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="5" result="n" />
        <feDiffuseLighting in="n" surfaceScale="3" lightingColor="#fff6e2" result="l"><feDistantLight azimuth="225" elevation="45" /></feDiffuseLighting>
        <feComposite in="l" in2="SourceGraphic" operator="in" result="lc" />
        <feBlend in="SourceGraphic" in2="lc" mode="multiply" />
      </filter>
      <linearGradient id="wf-mn-leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2f4a36" /><stop offset=".55" stopColor="#233a2a" /><stop offset="1" stopColor="#16261b" /></linearGradient>
      <pattern id="wf-mn-grain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".7" fill="#000" opacity=".35" /><circle cx="4.5" cy="4" r=".5" fill="#fff" opacity=".08" /></pattern>
      <linearGradient id="wf-leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b3a1f" /><stop offset="1" stopColor="#3e1f0f" /></linearGradient>
      <linearGradient id="wf-bake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#525a45" /><stop offset=".5" stopColor="#3b4233" /><stop offset="1" stopColor="#1f241b" /></linearGradient>
      <linearGradient id="wf-mn-canvas" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a6141" /><stop offset="1" stopColor="#2a3b26" /></linearGradient>
      <pattern id="wf-mn-weave" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0,0 H4 M0,2 H4" stroke="#000" strokeOpacity=".18" strokeWidth=".6" /><path d="M0,0 V4 M2,0 V4" stroke="#fff" strokeOpacity=".06" strokeWidth=".6" /></pattern>
      <linearGradient id="wf-mn-manila" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e7cf94" /><stop offset="1" stopColor="#c7a764" /></linearGradient>
      <linearGradient id="wf-mn-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c58b4a" /><stop offset="1" stopColor="#7a4a1e" /></linearGradient>
      <radialGradient id="wf-mn-cone" cx=".5" cy="0" r="1"><stop offset="0" stopColor="#fff1c0" stopOpacity=".5" /><stop offset=".6" stopColor="#ffdf8f" stopOpacity=".12" /><stop offset="1" stopColor="#ffdf8f" stopOpacity="0" /></radialGradient>
      <radialGradient id="wf-mn-bulb" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fffbe8" /><stop offset=".5" stopColor="#ffe9a6" stopOpacity=".8" /><stop offset="1" stopColor="#ffd56b" stopOpacity="0" /></radialGradient>
      <radialGradient id="wf-mn-coffee" cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#6b4022" /><stop offset=".7" stopColor="#3a2112" /><stop offset="1" stopColor="#24140a" /></radialGradient>
      <linearGradient id="wf-mn-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset=".4" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
  );
}

function PushPin({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <ellipse cx="3" cy="2" rx="4" ry="1.6" fill="#000" opacity=".3" />
      <line x1="0" y1="0" x2="-2" y2="-9" stroke="#8a8f96" strokeWidth="1.2" />
      <circle cx="-2.5" cy="-11" r="5" fill={color} stroke="#1d150c" strokeWidth=".7" />
      <circle cx="-4" cy="-12.5" r="1.6" fill="#fff" opacity=".6" />
    </g>
  );
}

function Tag({ x, y, text, sub, chain, icon }: { x: number; y: number; text: string; sub: string; chain: number; icon: 'map' | 'phone' | 'book' }) {
  return (
    <g transform={`translate(${x},${y})`} className="wf-tag">
      {/* ball chain to the object */}
      {Array.from({ length: Math.max(2, Math.round(-chain / 6)) }, (_, i) => <circle key={i} cx="0" cy={-26 + chain + i * 6 + 6} r="1.7" fill="url(#wf-steel)" stroke="#3e444b" strokeWidth=".4" />)}
      <rect x="-132" y="-24" width="264" height="52" rx="5" fill="#000" opacity=".35" transform="translate(2,4)" />
      <rect x="-132" y="-24" width="264" height="52" rx="5" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth="1.2" />
      <rect x="-126" y="-18" width="252" height="40" rx="3" fill="none" stroke="#fff3c9" strokeOpacity=".55" />
      <rect x="-125" y="-17" width="250" height="38" rx="3" fill="none" stroke="#5a3e12" strokeOpacity=".5" />
      <circle cx="0" cy="-24" r="4" fill="#3b2606" stroke="url(#wf-brass)" strokeWidth="1.4" />
      {[-120, 120].map((sx) => <g key={sx} transform={`translate(${sx},2)`}><circle r="4" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth=".8" /><line x1="-2.6" y1="-1" x2="2.6" y2="1" stroke="#4d3510" strokeWidth="1" /></g>)}
      <g transform="translate(-98,2)" className="wf-tag-icon">
        <circle r="13" fill="#3b2606" opacity=".18" />
        {icon === 'map' && <path d="M-8,-6 L-3,-8 L3,-6 L8,-8 L8,6 L3,8 L-3,6 L-8,8Z M-3,-8 V6 M3,-6 V8" fill="none" stroke="#3b2606" strokeWidth="1.6" strokeLinejoin="round" />}
        {icon === 'phone' && <path d="M-8,-4 Q-8,-9 -3,-9 L3,-9 Q8,-9 8,-4 L5,-4 L4,-6 L-4,-6 L-5,-4Z M-6,-2 L6,-2 L8,8 L-8,8Z" fill="#3b2606" />}
        {icon === 'book' && <path d="M-8,-8 L5,-8 Q8,-8 8,-5 L8,8 L-5,8 Q-8,8 -8,5Z M-4,-8 V8 M-1,-3 H5 M-1,1 H5" fill="none" stroke="#3b2606" strokeWidth="1.6" strokeLinejoin="round" />}
      </g>
      <text x="2" y="0" textAnchor="middle" className="wf-tag-text">{text}</text>
      <text x="2" y="16" textAnchor="middle" className="wf-tag-sub">{sub}</text>
      <path className="wf-tag-go" d="M96,-6 L104,2 L96,10" fill="none" stroke="#3b2606" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function LampDecor() {
  return (
    <g aria-hidden pointerEvents="none">
      <path d="M262,104 L560,330 L150,420 Z" fill="url(#wf-mn-cone)" className="wf-mn-cone" />
      <ellipse cx="110" cy="124" rx="78" ry="22" fill="#000" opacity=".35" />
      <ellipse cx="110" cy="114" rx="66" ry="19" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth="1.2" />
      <ellipse cx="110" cy="110" rx="50" ry="12" fill="none" stroke="#fff3c9" strokeOpacity=".5" />
      <circle cx="110" cy="108" r="9" fill="url(#wf-brass)" stroke="#4d3510" />
      <path d="M110,106 L160,32" stroke="#6f5a32" strokeWidth="8" strokeLinecap="round" />
      <path d="M160,32 L226,68" stroke="#6f5a32" strokeWidth="7" strokeLinecap="round" />
      <path d="M118,96 L152,44" stroke="#c9c2ad" strokeWidth="1.6" strokeDasharray="2 2" />
      <circle cx="160" cy="32" r="7" fill="url(#wf-brass)" stroke="#4d3510" />
      <circle cx="226" cy="68" r="6" fill="url(#wf-brass)" stroke="#4d3510" />
      <g transform="translate(250,82) rotate(18)">
        <path d="M-30,-20 L28,-26 L46,26 L-46,34 Z" fill="#2f5a3a" stroke="#14261a" strokeWidth="2" />
        <path d="M-26,-16 L-34,30" stroke="#5a8a62" strokeWidth="3" strokeOpacity=".6" />
        <path d="M-46,34 Q0,46 46,26" fill="none" stroke="#c99a3c" strokeWidth="3" />
        <ellipse cx="0" cy="32" rx="44" ry="8" transform="rotate(-6)" fill="url(#wf-mn-bulb)" />
      </g>
    </g>
  );
}

/** Papers under the map: a stamped dossier and a telegram. */
function PaperDecor() {
  return (
    <g aria-hidden pointerEvents="none">
      <g transform="translate(756,62) rotate(7)">
        <rect x="4" y="8" width="250" height="170" fill="#000" opacity=".3" />
        <path d="M0,10 L70,10 L80,0 L150,0 L160,10 L250,10 L250,176 L0,176Z" fill="url(#wf-mn-manila)" stroke="#8a6a32" />
        <rect x="16" y="24" width="220" height="140" fill="#f8f1dc" opacity=".9" />
        {[44, 56, 68, 80].map((y, i) => <rect key={y} x="28" y={y} width={[150, 180, 120, 160][i]} height="4" fill="#6b5a44" opacity=".35" />)}
        <g transform="translate(196,118) rotate(-12)">
          <rect x="-50" y="-14" width="100" height="28" fill="none" stroke="#c62f2f" strokeWidth="2.4" opacity=".75" />
          <text textAnchor="middle" y="6" className="wf-mn-stamp">TOP SECRET</text>
        </g>
        <path d="M200,-6 L200,30 Q200,38 208,38 Q216,38 216,30 L216,-2" fill="none" stroke="#9aa1a8" strokeWidth="2.4" />
      </g>
      <g transform="translate(236,376) rotate(-9)">
        <rect x="4" y="6" width="190" height="130" fill="#000" opacity=".3" />
        <rect width="190" height="130" fill="#f3ebd2" stroke="#b9a476" />
        <rect x="0" y="0" width="190" height="22" fill="#d9c58f" />
        <text x="12" y="16" className="wf-mn-telegram">TELEGRAM · URGENT</text>
        {[36, 48, 60, 72, 84, 96, 108].map((y, i) => <rect key={y} x="12" y={y} width={[160, 140, 166, 120, 150, 100, 130][i]} height="3.4" fill="#2b2116" opacity=".42" />)}
      </g>
    </g>
  );
}

function Phone() {
  return (
    <g transform="translate(1000,300)">
      <ellipse cx="0" cy="98" rx="104" ry="18" fill="#000" opacity=".35" />
      {/* leather carry strap */}
      <path d="M-86,10 Q-112,-70 0,-82 Q112,-70 86,10" fill="none" stroke="#5a3418" strokeWidth="10" />
      <path d="M-86,10 Q-112,-70 0,-82 Q112,-70 86,10" fill="none" stroke="#c9a46a" strokeWidth="1" strokeDasharray="4 3" strokeOpacity=".7" />
      <rect x="-86" y="-12" width="172" height="108" rx="12" fill="url(#wf-bake)" stroke="#11130f" strokeWidth="2" />
      <rect x="-86" y="-12" width="172" height="108" rx="12" fill="url(#wf-mn-weave)" opacity=".5" />
      <rect x="-74" y="0" width="148" height="84" rx="8" fill="none" stroke="#6c735f" strokeWidth="1.4" />
      {[[-78, -4], [78, -4], [-78, 88], [78, 88]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill="url(#wf-steel)" />)}
      {/* side crank */}
      <rect x="86" y="30" width="10" height="20" rx="3" fill="#2a2d26" />
      <path d="M96,40 L114,40 L114,64" stroke="url(#wf-steel)" strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x="108" y="62" width="12" height="18" rx="5" fill="#5a3418" stroke="#2a1508" />
      {/* dial */}
      <circle cx="-14" cy="44" r="32" fill="#1f221d" stroke="url(#wf-brass)" strokeWidth="3" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = i * 0.52 - 2.5;
        return <g key={i}><circle cx={-14 + Math.cos(a) * 21} cy={44 + Math.sin(a) * 21} r="5" fill="#e9e3cf" stroke="#11130f" /><text x={-14 + Math.cos(a) * 21} y={44 + Math.sin(a) * 21 + 2.4} textAnchor="middle" className="wf-mn-dial">{(i + 1) % 10}</text></g>;
      })}
      <circle cx="-14" cy="44" r="10" fill="url(#wf-brass)" stroke="#4d3510" />
      <path d="M8,22 L18,10" stroke="url(#wf-steel)" strokeWidth="3" strokeLinecap="round" />
      {/* nameplate and lamp */}
      <rect x="28" y="16" width="44" height="16" rx="2" fill="url(#wf-brass)" stroke="#4d3510" />
      <text x="50" y="27.5" textAnchor="middle" className="wf-mn-plate">FIELD TEL</text>
      <circle cx="50" cy="52" r="9" fill="#2a0c0c" stroke="url(#wf-brass)" strokeWidth="2" />
      <circle cx="50" cy="52" r="6" fill="#ff4a3c" className="wf-phone-lamp" />
      <text x="50" y="76" textAnchor="middle" className="wf-mn-plate wf-mn-plate-dim">LINE</text>
      {/* handset on the cradle */}
      <g className="wf-handset">
        <path d="M-80,-16 Q-90,-56 -44,-62 L44,-62 Q90,-56 80,-16 L60,-16 Q62,-40 38,-42 L-38,-42 Q-62,-40 -60,-16Z" fill="url(#wf-bake)" stroke="#11130f" strokeWidth="2" />
        <ellipse cx="-70" cy="-18" rx="16" ry="8" fill="#2a2d26" stroke="#11130f" strokeWidth="1.5" />
        <ellipse cx="70" cy="-18" rx="16" ry="8" fill="#2a2d26" stroke="#11130f" strokeWidth="1.5" />
        <path d="M-40,-56 L40,-56" stroke="#6c735f" strokeWidth="1.5" strokeOpacity=".7" />
      </g>
      {/* coiled cord */}
      <path d="M-86,60 C-120,60 -126,96 -100,110 C-90,116 -80,118 -70,124" fill="none" stroke="#1b1d18" strokeWidth="5" strokeDasharray="2 3" strokeLinecap="round" />
    </g>
  );
}

function Binder() {
  return (
    <g transform="translate(140,436) rotate(-8)">
      <rect x="-4" y="8" width="196" height="156" rx="6" fill="#000" opacity=".35" />
      {/* pages peeking out */}
      <rect x="18" y="4" width="168" height="146" rx="3" fill="#efe6cc" stroke="#b9a476" />
      <rect x="18" y="8" width="170" height="146" rx="3" fill="#e4d9b8" stroke="#b9a476" />
      <rect width="184" height="152" rx="6" fill="url(#wf-mn-canvas)" stroke="#1a2418" strokeWidth="2" />
      <rect width="184" height="152" rx="6" fill="url(#wf-mn-weave)" />
      <rect x="6" y="6" width="172" height="140" rx="4" fill="none" stroke="#c9b98a" strokeOpacity=".55" strokeDasharray="4 3" />
      <rect x="0" width="24" height="152" rx="4" fill="#22301d" />
      {[24, 76, 128].map((y) => <g key={y}><circle cx="12" cy={y} r="5" fill="url(#wf-steel)" stroke="#3e444b" /><circle cx="12" cy={y} r="2" fill="#22301d" /></g>)}
      {[28, 58, 88].map((y, i) => <g key={y}><rect x="182" y={y} width="18" height="24" rx="3" fill={['#c8323c', '#e2a01a', '#2f63d6'][i]} stroke="#1a0f06" strokeWidth=".6" /><rect x="185" y={y + 4} width="10" height="2" fill="#fff" opacity=".5" /></g>)}
      <path d="M130,152 L130,182 L138,174 L146,182 L146,152" fill="#c8323c" stroke="#5a1015" strokeWidth=".8" />
      <rect x="42" y="30" width="122" height="78" fill="#efe9d6" stroke="#1a2418" />
      <rect x="46" y="34" width="114" height="70" fill="none" stroke="#1a2418" strokeWidth=".6" />
      <text x="103" y="58" textAnchor="middle" className="wf-desk-stencil">FIELD</text>
      <text x="103" y="82" textAnchor="middle" className="wf-desk-stencil">MANUAL</text>
      <text x="103" y="98" textAnchor="middle" className="wf-mn-fm">FM 1-01 · STANDING ORDERS</text>
      <path d="M40,124 L170,124" stroke="#c9b98a" strokeOpacity=".5" />
      <text x="103" y="140" textAnchor="middle" className="wf-mn-fm wf-mn-fm-light">PROPERTY OF THE GENERAL STAFF</text>
    </g>
  );
}

/** Cap, medals, coffee, clock, pencils, protractor, ruler, dog tags, telegraph key, loose pins. */
function DeskDecor() {
  return (
    <g aria-hidden pointerEvents="none">
      {/* officer's cap */}
      <g transform="translate(1050,108) rotate(12)">
        <ellipse cx="0" cy="34" rx="94" ry="24" fill="#000" opacity=".32" />
        <ellipse cx="0" cy="18" rx="88" ry="42" fill="#3e4a32" stroke="#1d2418" strokeWidth="2" />
        <ellipse cx="0" cy="18" rx="88" ry="42" fill="url(#wf-mn-weave)" opacity=".6" />
        <path d="M-64,20 Q0,78 64,20 Q0,52 -64,20Z" fill="#14140f" />
        <path d="M-50,28 Q0,62 50,28" fill="none" stroke="#fff" strokeOpacity=".15" strokeWidth="2" />
        <ellipse cx="0" cy="12" rx="56" ry="24" fill="#4a5a3b" />
        <ellipse cx="0" cy="12" rx="56" ry="24" fill="none" stroke="#2c3622" strokeWidth="1.5" />
        <path d="M-44,10 Q0,-8 44,10" stroke="url(#wf-brass)" strokeWidth="5" fill="none" />
        <path d="M-44,16 Q0,-2 44,16" stroke="url(#wf-brass)" strokeWidth="2" fill="none" />
        <g transform="translate(0,-4) scale(1.7)"><path d="M0,-7 L2,-2 L7,-2 L3,1.5 L4.5,7 L0,3.6 L-4.5,7 L-3,1.5 L-7,-2 L-2,-2Z" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth=".4" /></g>
        {[-30, -22, 22, 30].map((x) => <path key={x} d={`M${x},6 l${x < 0 ? -4 : 4},-4`} stroke="url(#wf-brass)" strokeWidth="2" />)}
      </g>
      {/* grease pencils */}
      <g transform="translate(470,96) rotate(-3)">
        {[['#c8323c', 0], ['#2f63d6', 14]].map(([c, dy]) => (
          <g key={c} transform={`translate(0,${dy})`}>
            <rect x="0" y="-4" width="110" height="8" rx="2" fill={c as string} stroke="#1a0f06" strokeWidth=".6" />
            <rect x="0" y="-4" width="110" height="3" fill="#fff" opacity=".2" />
            <path d="M110,-4 L126,0 L110,4Z" fill="#e8d2a6" stroke="#1a0f06" strokeWidth=".6" />
            <path d="M121,-1.2 L126,0 L121,1.2Z" fill={c as string} />
            {[20, 44, 68].map((x) => <line key={x} x1={x} y1="-4" x2={x + 6} y2="4" stroke="#fff" strokeOpacity=".35" />)}
          </g>
        ))}
      </g>
      {/* protractor on the map corner */}
      <g transform="translate(324,428) rotate(-6)" opacity=".9">
        <path d="M-64,0 A64,64 0 0,1 64,0 Z" fill="#f2c14e" fillOpacity=".25" stroke="#8a5a00" strokeWidth="1.4" />
        <path d="M-40,0 A40,40 0 0,1 40,0" fill="none" stroke="#8a5a00" strokeWidth=".8" />
        {Array.from({ length: 19 }, (_, i) => { const a = Math.PI - (i * Math.PI) / 18; return <line key={i} x1={Math.cos(a) * 64} y1={-Math.sin(a) * 64} x2={Math.cos(a) * (i % 3 ? 58 : 52)} y2={-Math.sin(a) * (i % 3 ? 58 : 52)} stroke="#8a5a00" strokeWidth=".9" />; })}
        <path d="M-64,0 A64,64 0 0,1 0,-64" fill="url(#wf-mn-glass)" />
        <circle r="2.4" fill="#8a5a00" />
      </g>
      {/* ruler */}
      <g transform="translate(538,500) rotate(-3)">
        <rect x="2" y="4" width="150" height="20" fill="#000" opacity=".3" />
        <rect width="150" height="20" rx="1.5" fill="url(#wf-mn-wood)" stroke="#4d2f12" />
        {Array.from({ length: 29 }, (_, i) => <line key={i} x1={5 + i * 5} y1="0" x2={5 + i * 5} y2={i % 2 ? 5 : 9} stroke="#2b1a08" strokeWidth=".8" />)}
        <rect x="128" y="3" width="18" height="14" rx="1" fill="url(#wf-brass)" opacity=".85" />
      </g>
      {/* coffee */}
      <g transform="translate(462,580)">
        <circle cx="10" cy="18" r="46" fill="none" stroke="#5a3418" strokeOpacity=".25" strokeWidth="4" />
        <ellipse cx="0" cy="44" rx="56" ry="14" fill="#000" opacity=".32" />
        <ellipse cx="0" cy="40" rx="56" ry="13" fill="#e9e3cf" stroke="#9c8f6e" />
        <circle r="40" fill="#e9e3cf" stroke="#9c8f6e" strokeWidth="3" />
        <circle r="40" fill="none" stroke="#2f5a3a" strokeWidth="3" strokeDasharray="10 6" opacity=".6" />
        <circle r="31" fill="url(#wf-mn-coffee)" />
        <ellipse cx="-8" cy="-10" rx="12" ry="5" fill="#fff" opacity=".12" />
        <path d="M38,-6 Q66,-4 60,18 Q56,30 34,20" fill="none" stroke="#e9e3cf" strokeWidth="8" />
        {[0, 1, 2].map((i) => <path key={i} className={`wf-steam wf-steam-${i}`} d={`M${i * 12 - 12},-20 q-10,-16 0,-30 q10,-14 0,-30`} fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />)}
      </g>
      {/* clock */}
      <g transform="translate(700,592)">
        <ellipse cx="0" cy="46" rx="54" ry="12" fill="#000" opacity=".32" />
        <circle r="48" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth="2" />
        <circle r="43" fill="none" stroke="#fff3c9" strokeOpacity=".5" />
        <circle r="39" fill="#fbf4df" />
        <circle r="39" fill="url(#wf-mn-glass)" />
        {Array.from({ length: 60 }, (_, i) => <line key={i} x1="0" y1="-36" x2="0" y2={i % 5 ? -34 : -30} stroke="#2b2116" strokeWidth={i % 15 ? (i % 5 ? 0.6 : 1.4) : 2.6} transform={`rotate(${i * 6})`} />)}
        <text y="-17" textAnchor="middle" className="wf-mn-clock">ZULU</text>
        <line x1="0" y1="4" x2="0" y2="-20" stroke="#2b2116" strokeWidth="3.4" strokeLinecap="round" transform="rotate(-50)" />
        <line x1="0" y1="4" x2="0" y2="-28" stroke="#2b2116" strokeWidth="2.2" strokeLinecap="round" transform="rotate(64)" />
        <line x1="0" y1="8" x2="0" y2="-32" stroke="#c8323c" strokeWidth="1.2" className="wf-second" />
        <circle r="3" fill="#c8323c" />
        <rect x="-6" y="-58" width="12" height="9" rx="2" fill="url(#wf-brass)" stroke="#4d3510" />
      </g>
      {/* medals */}
      <g transform="translate(860,566)">
        {[0, 1, 2].map((i) => {
          const f = [FACTIONS[1], FACTIONS[0], FACTIONS[3]][i];
          return (
            <g key={i} transform={`translate(${i * 46},${i % 2 ? 8 : 0}) rotate(${i * 6 - 6})`}>
              <path d="M-11,-36 L11,-36 L6,-4 L-6,-4Z" fill={f.color} stroke="#2a1d0c" />
              <path d="M-4,-36 L-2,-4 M4,-36 L2,-4" stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
              <rect x="-12" y="-38" width="24" height="5" rx="1" fill="url(#wf-brass)" />
              <circle cy="12" r="17" fill="#000" opacity=".3" transform="translate(2,3)" />
              <path d={Array.from({ length: 16 }, (_, k) => { const a = (k * Math.PI) / 8, r = k % 2 ? 13 : 17; return `${k ? 'L' : 'M'}${Math.sin(a) * r},${12 - Math.cos(a) * r}`; }).join('') + 'Z'} fill="url(#wf-brass)" stroke="#4d3510" />
              <circle cy="12" r="8" fill="#5d4214" />
              <path d={FACTIONS[i * 2].emblem} transform="translate(0,12) scale(.9)" fill="url(#wf-brass)" />
            </g>
          );
        })}
      </g>
      {/* dog tags */}
      <g transform="translate(1028,590) rotate(-18)">
        <path d="M-40,-30 Q-10,-60 30,-36 Q50,-20 40,0" fill="none" stroke="url(#wf-steel)" strokeWidth="2" strokeDasharray="2 2" />
        {[[0, 0, -6], [14, 8, 10]].map(([x, y, r]) => (
          <g key={x} transform={`translate(${x},${y}) rotate(${r})`}>
            <rect x="-16" y="-10" width="32" height="22" rx="8" fill="url(#wf-steel)" stroke="#3e444b" />
            <circle cx="-11" cy="1" r="1.6" fill="#3e444b" />
            {[-3, 2, 7].map((ly) => <rect key={ly} x="-6" y={ly - 1} width={ly === 7 ? 10 : 16} height="1.6" fill="#3e444b" opacity=".6" />)}
          </g>
        ))}
      </g>
      {/* telegraph key */}
      <g transform="translate(1126,560)">
        <ellipse cx="0" cy="30" rx="44" ry="10" fill="#000" opacity=".32" />
        <rect x="-40" y="4" width="80" height="24" rx="3" fill="url(#wf-mn-wood)" stroke="#4d2f12" />
        <rect x="-30" y="-2" width="12" height="8" fill="url(#wf-brass)" />
        <path d="M-24,-2 L30,-8" stroke="url(#wf-brass)" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="32" cy="-10" rx="10" ry="5" fill="#1b1d18" />
        <circle cx="18" cy="12" r="3" fill="url(#wf-brass)" /><circle cx="-26" cy="16" r="3" fill="url(#wf-brass)" />
      </g>
      {/* loose push pins */}
      <PushPin x={350} y={620} color={FACTIONS[2].color} />
      <PushPin x={372} y={642} color={FACTIONS[4].color} />
      <PushPin x={990} y={420} color={FACTIONS[0].color} />
    </g>
  );
}

/** Grease-pencil fronts on the menu map. */
function MenuFront() {
  const arrows: [string, string, number][] = [['WEU', 'MAG', 0], ['CHN', 'SEA', 1], ['PLN', 'GUL', 3], ['EEU', 'URL', 4], ['CAP', 'MAD', 2]];
  return (
    <g filter="url(#wf-pencil)">
      {arrows.map(([a, b, f]) => {
        const p = geo(a), q = geo(b);
        const mx = (p.x + q.x) / 2 + 30, my = (p.y + q.y) / 2 - 40, ang = Math.atan2(q.y - my, q.x - mx);
        const head = [ang + 2.6, ang - 2.6].map((r) => `${q.x + Math.cos(r) * 30},${q.y + Math.sin(r) * 30}`);
        return (
          <g key={a}>
            <path d={`M${p.x},${p.y} Q${mx},${my} ${q.x},${q.y}`} fill="none" stroke={FACTIONS[f].color} strokeWidth="9" strokeLinecap="round" className="wf-menu-arrow" />
            <path d={`M${head[0]} L${q.x},${q.y} L${head[1]}`} fill="none" stroke={FACTIONS[f].color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" className="wf-mn-head" />
          </g>
        );
      })}
    </g>
  );
}

/* ---------- muster sheet ---------- */
const RANK_TITLE: Record<SeatKind, string> = { human: 'Human general', easy: 'Computer · Cadet', medium: 'Computer · Colonel', hard: 'Computer · Field Marshal' };
function Insignia({ kind }: { kind: SeatKind }) {
  return (
    <span className={`wf-ins wf-ins-${kind}`} title={RANK_TITLE[kind]} aria-hidden>
      <svg viewBox="-12 -12 24 24">
        {kind === 'human' && <><circle cy="-4" r="4.4" fill="currentColor" /><path d="M-8,9 Q-8,1 0,1 Q8,1 8,9Z" fill="currentColor" /></>}
        {kind === 'easy' && <path d="M-8,-1 L0,-7 L8,-1 L8,3 L0,-3 L-8,3Z" fill="currentColor" />}
        {kind === 'medium' && [-6, 0, 6].map((y) => <path key={y} d={`M-8,${y + 1} L0,${y - 4} L8,${y + 1} L8,${y + 4} L0,${y - 1} L-8,${y + 4}Z`} fill="currentColor" />)}
        {kind === 'hard' && [[-6, 3], [6, 3], [0, -5]].map(([x, y]) => <path key={`${x}${y}`} transform={`translate(${x},${y}) scale(.62)`} d="M0,-7 L2,-2 L7,-2 L3,1.5 L4.5,7 L0,3.6 L-4.5,7 L-3,1.5 L-7,-2 L-2,-2Z" fill="currentColor" />)}
      </svg>
    </span>
  );
}

/** Muster the armies: seats (human or computer), names, factions, mode and deployment. */
function Muster({ onClose, name }: { onClose: () => void; name: string }) {
  const [cfg, setCfg] = useState<LocalCfg>(() => lastCfg(name));
  const humans = cfg.seats.filter((s) => s.kind === 'human').length;
  const bots = cfg.seats.length - humans;
  const two = cfg.seats.length === 2;
  const used = useMemo(() => new Set(cfg.seats.map((s) => s.faction)), [cfg.seats]);
  const set = (i: number, patch: Partial<LocalCfg['seats'][number]>) => setCfg((c) => ({ ...c, seats: c.seats.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  const add = () => setCfg((c) => {
    const faction = [0, 1, 2, 3, 4, 5].find((f) => !c.seats.some((s) => s.faction === f))!;
    return { ...c, seats: [...c.seats, { kind: 'medium', name: `Colonel ${c.seats.length}`, faction }] };
  });
  const launch = () => {
    const c = { ...cfg, mode: two ? 'domination' as const : cfg.mode };
    rememberCfg(c);
    navigate(`/warfront/${humans > 1 ? 'local' : 'bot'}?s=${encodeCfg(c)}`);
  };
  const mode = two ? 'domination' : cfg.mode;
  return (
    <div className="wf-modal wf-mu-modal" role="dialog" aria-label="Muster the armies" onClick={onClose}>
      <div className="wf-sheet wf-muster wf-mu" onClick={(e) => e.stopPropagation()}>
        <span className="wf-mu-clip" aria-hidden />
        <header className="wf-mu-head">
          <div>
            <span className="wf-mu-no">Operation order Nº {String(cfg.seats.length * 7 + 101)}</span>
            <h2 className="wf-stencil">Muster the armies</h2>
            <p>Choose who fights, how the war is won, and how the world is shared out. Then launch the operation.</p>
          </div>
          <span className="wf-mu-stamp" aria-hidden>Top secret</span>
          <button type="button" className="wf-x" onClick={onClose} aria-label="Close">×</button>
        </header>

        <section className="wf-mu-sec">
          <h3><b>1</b> Commanders <small>{cfg.seats.length} of 6 · {humans} human{humans === 1 ? '' : 's'}{bots ? ` · ${bots} computer` : ''}</small></h3>
          <ol className="wf-roster wf-mu-roster">
            {cfg.seats.map((s, i) => {
              const f = FACTIONS[s.faction];
              return (
                <li key={i} className="wf-roster-row wf-mu-row" style={{ ['--fc' as string]: f.color, ['--fd' as string]: f.deep }} data-testid={`wf-muster-${i}`}>
                  <span className="wf-mu-flag" aria-hidden>
                    <svg viewBox="-9 -9 18 18"><path d={f.emblem} fill="#fff" stroke="#fff" strokeWidth=".5" /></svg>
                  </span>
                  <span className="wf-mu-who">
                    <small>No. {i + 1} · {f.name}</small>
                    <input value={s.name} maxLength={24} aria-label={`General ${i + 1} name`} onChange={(e) => set(i, { name: e.target.value })} />
                  </span>
                  <span className="wf-mu-kind">
                    <Insignia kind={s.kind} />
                    <select value={s.kind} aria-label={`General ${i + 1} commander`} onChange={(e) => {
                      const kind = e.target.value as SeatKind;
                      set(i, { kind, ...(kind !== 'human' && s.kind === 'human' ? { name: KIND_LABEL[kind].split(' ')[0] } : {}) });
                    }}>
                      {(Object.keys(KIND_LABEL) as SeatKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </select>
                  </span>
                  <span className="wf-swatches wf-mu-swatches" role="group" aria-label="Faction">
                    {FACTIONS.map((ff, k) => (
                      <button key={k} type="button" style={{ background: ff.color }} aria-label={ff.name} title={ff.name} aria-pressed={s.faction === k} disabled={used.has(k) && s.faction !== k} onClick={() => set(i, { faction: k })}>
                        <svg viewBox="-9 -9 18 18" aria-hidden><path d={ff.emblem} fill="#fff" stroke="#fff" strokeWidth=".5" /></svg>
                      </button>
                    ))}
                  </span>
                  <button type="button" className="wf-x" aria-label="Remove" disabled={cfg.seats.length <= 2 || (s.kind === 'human' && humans === 1)} onClick={() => setCfg((c) => ({ ...c, seats: c.seats.filter((_, k) => k !== i) }))}>×</button>
                </li>
              );
            })}
          </ol>
          <button type="button" className="wf-btn wf-mu-add" onClick={add} disabled={cfg.seats.length >= 6} data-testid="wf-add-seat">+ Add a general</button>
          <p className="wf-mu-note">
            <b>Computer ranks:</b> Cadet plays loosely, Colonel plays a sound game, Field Marshal plays to win. {humans > 1 ? `${humans} humans share this device: a map case hides each general's turn.` : 'Add a second human for pass and play on one device.'}
          </p>
        </section>

        <section className="wf-mu-sec">
          <h3><b>2</b> Rules of engagement</h3>
          <div className="wf-mu-opts">
            <label className={`wf-mu-opt${mode === 'domination' ? ' wf-on' : ''}`}>
              <input type="radio" name="wf-mode" checked={mode === 'domination'} onChange={() => setCfg({ ...cfg, mode: 'domination' })} />
              <span><b>World Domination</b><small>Take all 42 territories. A general who loses every army is out.</small></span>
            </label>
            <label className={`wf-mu-opt${mode === 'mission' ? ' wf-on' : ''}${two ? ' wf-off' : ''}`}>
              <input type="radio" name="wf-mode" disabled={two} checked={mode === 'mission'} onChange={() => setCfg({ ...cfg, mode: 'mission' })} />
              <span><b>Secret Mission</b><small>{two ? 'Needs 3 or more generals.' : 'Each general gets a sealed objective, like holding two continents. First to complete it wins.'}</small></span>
            </label>
          </div>
        </section>

        <section className="wf-mu-sec">
          <h3><b>3</b> Deployment</h3>
          <label className={`wf-mu-opt wf-mu-check${cfg.autoDeploy || two ? ' wf-on' : ''}`}>
            <input type="checkbox" checked={cfg.autoDeploy || two} disabled={two} onChange={(e) => setCfg({ ...cfg, autoDeploy: e.target.checked })} />
            <span><b>Deal territories at random</b><small>{two ? 'Always on with two generals: the map is dealt between you and a neutral army.' : cfg.autoDeploy ? 'The 42 territories are dealt out by lot, then everyone places their starting armies.' : 'Off: generals take turns claiming empty territories one at a time, then place their armies.'}</small></span>
          </label>
          <p className="wf-mu-note">Each general starts with <b>{START_ARMIES[cfg.seats.length]} armies</b>. One goes on every territory you hold; you place the rest one at a time, in turns.</p>
        </section>

        <button type="button" className="wf-key wf-mu-launch" onClick={launch} data-testid="wf-launch">Launch the operation</button>
      </div>
    </div>
  );
}
