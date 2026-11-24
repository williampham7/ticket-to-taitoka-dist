import { useState, type ReactNode } from 'react';
import { navigate } from '../lib/router';
import { isFollower, usePartyState } from '../lib/party';
import { FrontlineAudio } from './FrontlineAudio';
import { Briefing } from './Briefing';
import './menu.css';

/** Frontline start menu: a night-ops command console over a tactical map, with the mode choices on one central card. */
export function FrontlineMenu() {
  const party = usePartyState();
  const follower = isFollower(party);
  const [brief, setBrief] = useState(false);
  return (
    <main className="flm" data-testid="frontline-menu">
      <TacticalMap />
      <div className="flm-scan" aria-hidden />
      <div className="flm-vignette" aria-hidden />

      {!follower && (
        <button type="button" className="flm-back" onClick={() => navigate('/')} data-testid="back-to-main" aria-label="Back to Main Menu" title="Back to Main Menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          <span className="max-sm:hidden">Back to Main Menu</span>
        </button>
      )}
      <div className="flm-top-right"><FrontlineAudio /></div>

      <div className="flm-stage">
        <section className="flm-card">
          <span className="flm-bracket tl" aria-hidden /><span className="flm-bracket tr" aria-hidden />
          <span className="flm-bracket bl" aria-hidden /><span className="flm-bracket br" aria-hidden />
          <div className="flm-strip" aria-hidden><span>Classified // Command Console</span><span className="flm-live">Live</span></div>
          <header className="flm-head">
            <div className="flm-op">Operation</div>
            <h1 className="flm-title">Frontline</h1>
            <div className="flm-rule" aria-hidden>
              <svg viewBox="0 0 400 10" preserveAspectRatio="none">
                <path d="M0 5 L60 3 L110 7 L170 2 L230 6 L290 3 L340 7 L400 4" fill="none" stroke="#d6452f" strokeWidth="2" strokeDasharray="9 5" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
            <p className="flm-sub">Two commanders. Forty hidden units each. Find the enemy command post before they find yours.</p>
          </header>

          <nav className="flm-orders" aria-label="Game modes">
            {follower ? <p className="flm-wait" data-testid="party-waiting">Standing by. Your party host is picking the mission…</p> : (<>
              <Order primary code="OP-01" testid="fl-local" icon={IconPass} label="Pass and Play" desc="Two commanders, one screen. A curtain hides your army between turns." onClick={() => navigate('/frontline/local')} />
              <Order code="OP-02" testid="fl-bot" icon={IconBot} label="Play vs Computer" desc="Face an AI commander that only sees what you'd see." onClick={() => navigate('/frontline/bot')} />
              <Order code="OP-03" testid="fl-host" icon={IconRadio} label="Host an Online Game" desc="Open a secure channel and send your opponent the link." onClick={() => navigate('/frontline/host')} />
            </>)}
            <Order ghost code="INTEL" testid="fl-rules" icon={IconFile} label="Instructions" desc="Briefing: the army, combat and how to win." onClick={() => setBrief(true)} />
          </nav>

          <div className="flm-foot" aria-hidden><span>Grid 10 × 10 · 2 lakes</span><span>40 v 40 units</span></div>
        </section>
      </div>
      {brief && <Briefing onClose={() => setBrief(false)} />}
    </main>
  );
}

function Order({ code, label, desc, icon, onClick, testid, primary, ghost }: {
  code: string; label: string; desc: string; icon: ReactNode; onClick: () => void; testid: string; primary?: boolean; ghost?: boolean;
}) {
  return (
    <button type="button" className={`flm-btn${primary ? ' primary' : ''}${ghost ? ' ghost' : ''}`} onClick={onClick} data-testid={testid}>
      <span className="flm-icon" aria-hidden>{icon}</span>
      <span><span className="flm-label">{label}</span><span className="flm-desc">{desc}</span></span>
      <span className="flm-code" aria-hidden>{code}</span>
    </button>
  );
}

const svg = (body: ReactNode) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{body}</svg>;
/** Two opposing arrows: the device changes hands. */
const IconPass = svg(<><path d="M4 8h13l-3-3" /><path d="M20 16H7l3 3" /><circle cx="4" cy="8" r=".6" fill="currentColor" /><circle cx="20" cy="16" r=".6" fill="currentColor" /></>);
/** A targeting reticle: the AI opponent. */
const IconBot = svg(<><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.2" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></>);
/** A field radio mast with signal arcs: hosting online. */
const IconRadio = svg(<><path d="M12 13v8M8.5 21h7" /><circle cx="12" cy="11" r="1.8" /><path d="M8.2 7.2a5.4 5.4 0 0 0 0 7.6M15.8 7.2a5.4 5.4 0 0 1 0 7.6M5.4 4.4a9.4 9.4 0 0 0 0 13.2M18.6 4.4a9.4 9.4 0 0 1 0 13.2" /></>);
/** A dossier folder: the briefing. */
const IconFile = svg(<><path d="M3 6.5V19a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-8l-2-2.5H4A1 1 0 0 0 3 6.5z" /><path d="M7 13h10M7 16h6" /></>);

/** Full-screen backdrop: a night tactical map with contours, a radar sweep, unit markers and the front line. Decoration only. */
function TacticalMap() {
  const blips: [number, number, number][] = [[1240, 260, 0], [1080, 470, 2.4], [1330, 520, 5.1], [1150, 180, 6.6]];
  return (
    <svg className="flm-bg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="flm-sweep-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9be06b" stopOpacity="0" />
          <stop offset="1" stopColor="#9be06b" stopOpacity=".28" />
        </linearGradient>
      </defs>
      <g stroke="#9be06b" strokeWidth=".6" opacity=".07">
        {Array.from({ length: 33 }, (_, i) => <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="1000" />)}
        {Array.from({ length: 21 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 50} x2="1600" y2={i * 50} />)}
      </g>
      <g fill="none" stroke="#5f7444" strokeWidth="1.2" opacity=".35">
        <path d="M-20 140 C200 80 360 220 600 160 S1000 40 1620 120" />
        <path d="M-20 200 C220 140 380 290 640 220 S1040 110 1620 190" />
        <path d="M-20 860 C260 760 520 840 760 800 S1200 880 1620 760" />
        <path d="M-20 920 C280 830 560 900 800 870 S1240 940 1620 840" />
        <path d="M180 520 C260 440 420 470 430 560 C440 650 250 660 180 520Z" />
        <path d="M230 530 C280 480 380 500 380 560 C380 610 270 620 230 530Z" />
        <path d="M290 545 C310 525 350 535 350 556 C350 575 310 580 290 545Z" />
      </g>
      <g transform="translate(1200 360)">
        {[120, 240, 360].map((r) => <circle key={r} r={r} fill="none" stroke="#9be06b" strokeWidth="1" opacity=".16" />)}
        <path d="M-380 0H380M0 -380V380" stroke="#9be06b" strokeWidth=".8" opacity=".12" />
        <g className="flm-sweep"><path d="M0 0 L360 0 A360 360 0 0 1 254.6 254.6 Z" fill="url(#flm-sweep-g)" /></g>
      </g>
      {blips.map(([x, y, d]) => <circle key={x} className="flm-blip" cx={x} cy={y} r="5" fill="#d4ff9a" style={{ animationDelay: `${d}s` }} />)}
      <path d="M-20 640 L160 610 L300 660 L470 600 L640 650 L820 590 L1000 640 L1180 600 L1360 650 L1620 610" fill="none" stroke="#d6452f" strokeWidth="3" strokeDasharray="16 9" opacity=".55" />
      {/* unit markers: friendly (rectangles) south of the line, hostile (diamonds) north */}
      <g fill="none" strokeWidth="2" opacity=".45">
        {[[220, 760], [520, 730], [880, 770]].map(([x, y]) => (
          <g key={x} stroke="#c8ad7f" transform={`translate(${x} ${y})`}><rect x="-22" y="-14" width="44" height="28" /><path d="M-22 -14 L22 14 M22 -14 L-22 14" /></g>
        ))}
        {[[420, 470], [760, 430]].map(([x, y]) => (
          <g key={x} stroke="#d6452f" transform={`translate(${x} ${y})`}><path d="M0 -22 L24 0 L0 22 L-24 0Z" /><ellipse rx="10" ry="6" /></g>
        ))}
      </g>
      <g fontFamily="ui-monospace, Menlo, monospace" fontSize="13" fill="#9be06b" opacity=".3" letterSpacing="2">
        <text x="60" y="900">GRID 34T · SECTOR 7</text>
        <text x="60" y="922">LAT 48.21N  LON 16.37E</text>
        <text x="1400" y="922">FREQ 141.25</text>
      </g>
    </svg>
  );
}
