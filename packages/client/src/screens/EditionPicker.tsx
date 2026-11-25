import { useCallback, useEffect, useRef, useState } from 'react';
import { EDITIONS, EDITION_IDS, SKINS, type EditionId } from '@boboland/shared';
import { EDITION, setEdition, urlWithoutEdition } from '../edition';
import { navigate } from '../lib/router';
import { isFollower, usePartyState } from '../lib/party';
import { SeriesArt } from './seriesArt';
import { PickerArt as EgyptianArt } from '../egyptian/PickerArt';
import './EditionPicker.css';
import './series.css';
import { WarfrontCard } from '../warfront/PickerCard'; // Warfront
import { KingdomCard } from '../kingdom/PickerCard'; // Kingdom

/**
 * The first screen. The route-building games sit behind one flagship card, the Ticket to Taitoka series; opening it
 * blurs the page and drops a row of map cards (USA, China, Europe, Singapore) under a banner, and a
 * click anywhere that is not a map card closes it again. Each map card is drawn in its own edition's style with fixed
 * colours and fonts (not the theme tokens), so it looks the same whichever theme the page loaded with.
 * Picking the page's own edition just opens the menu; another one saves the choice and reloads on /menu.
 */
export function EditionPicker() {
  const party = usePartyState();
  const follower = isFollower(party);
  const hostName = party.party?.members.find((m) => m.id === party.party?.host)?.name ?? 'your host';
  const [maps, setMaps] = useState<'closed' | 'open' | 'closing'>('closed');
  const seriesRef = useRef<HTMLButtonElement>(null);
  const pick = (id: EditionId) => {
    if (follower) return;
    if (id === EDITION.id) {
      const url = new URL(urlWithoutEdition(window.location.href, '/menu'));
      navigate(url.pathname + url.search);
    } else {
      setEdition(id, { path: '/menu' });
    }
  };
  const closeMaps = useCallback(() => {
    setMaps((m) => (m === 'open' ? 'closing' : m));
    const quick = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      setMaps('closed');
      seriesRef.current?.focus({ preventScroll: true });
    }, quick ? 0 : 200);
  }, []);
  return (
    <>
    <main className="ep" data-testid="edition-picker" inert={maps !== 'closed' ? true : undefined}>
      <header className="ep-head">
        <h1 className="ep-title">Where to?</h1>
        {follower && <p className="ep-sub" data-testid="party-waiting">You're in {hostName}'s party. They pick the game, and your screen follows.</p>}
      </header>
      <div className="ep-grid">
        <SeriesCard buttonRef={seriesRef} open={maps !== 'closed'} onOpen={() => setMaps('open')} />
        <button type="button" className="ep-card ep-fl" onClick={() => !follower && navigate('/frontline')} data-testid="frontline-card" aria-label="Frontline: two-player strategy">
          <span className="ep-art" aria-hidden>{FrontlineArt}</span>
          <span className="ep-text">
            <span className="ep-fl-to">Classified · 2 players</span>
            <span className="ep-fl-name">Frontline</span>
            <span className="ep-fl-line">Two hidden armies, one front. Outthink the enemy before they read your lines.</span>
            <span className="ep-fl-label">Strategy</span>
          </span>
        </button>
        <button type="button" className="ep-card ep-flt" onClick={() => !follower && navigate('/fleet')} data-testid="fleet-card" aria-label="Fleet: two-player naval battle">
          <span className="ep-art" aria-hidden>{FleetArt}</span>
          <span className="ep-text">
            <span className="ep-flt-to">2 players</span>
            <span className="ep-flt-name">Fleet</span>
            <span className="ep-flt-line">Hide your ships on a 10 by 10 sea and hunt theirs, one shell, salvo or super weapon at a time.</span>
            <span className="ep-flt-label">Naval</span>
          </span>
        </button>
        <button type="button" className="ep-card ep-egw" onClick={() => !follower && navigate('/egyptian')} data-testid="egyptian-card" aria-label="Egyptian War: card slapping for 2 to 5 players">
          <span className="ep-art" aria-hidden><EgyptianArt /></span>
          <span className="ep-text">
            <span className="ep-egw-to">2 to 5 players · real time</span>
            <span className="ep-egw-name">Egyptian War</span>
            <span className="ep-egw-line">Flip, challenge and slap your way to all 52 cards. The quickest hand takes the pile.</span>
            <span className="ep-egw-label">Cards</span>
          </span>
        </button>
        <WarfrontCard follower={follower} /> {/* Warfront */}
        <KingdomCard follower={follower} /> {/* Kingdom */}
      </div>
    </main>
    {maps !== 'closed' && <MapChooser closing={maps === 'closing'} onClose={closeMaps} onPick={pick} />}
    </>
  );
}

const FLAGSHIP = SKINS[EDITIONS.usa.skin].name;
const SERIES = `Ticket to ${FLAGSHIP}`;
const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'][EDITION_IDS.length] ?? String(EDITION_IDS.length);

/** The flagship card: an ivory railway ticket with a printed route map, the title with a "Series" stamp, and a perforated tear line. */
function SeriesCard({ buttonRef, open, onOpen }: { buttonRef: React.Ref<HTMLButtonElement>; open: boolean; onOpen: () => void }) {
  return (
    <button ref={buttonRef} type="button" className="ep-card ep-series" onClick={onOpen} data-testid="series-card"
      aria-haspopup="dialog" aria-expanded={open} aria-label={`${SERIES} series: choose a map`}>
      <span className="ep-art" aria-hidden><SeriesArt /></span>
      <span className="ep-text eps-text">
        <span className="eps-to">Ticket to</span>
        <span className="eps-titlerow">
          <span className="eps-name">{FLAGSHIP}</span>
          <span className="eps-seal">Series</span>
        </span>
        <span className="eps-line">Collect train cards, claim routes and link your cities before the trains run out.</span>
        <span className="eps-foot">
          <span className="eps-cta">Choose a map</span>
          <span className="eps-meta"><span>{COUNT} maps</span><span>2–5 players</span></span>
        </span>
      </span>
    </button>
  );
}

/**
 * The map chooser: a banner for the series casting a warm light down over one card per map, on a blurred page.
 * Only the map cards pick; a click anywhere else (the backdrop, the banner, the gaps) and Escape close it.
 */
function MapChooser({ closing, onClose, onPick }: { closing: boolean; onClose: () => void; onPick: (id: EditionId) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('.ep-mini')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const stops = [...ref.current.querySelectorAll<HTMLButtonElement>('button')];
      const i = stops.indexOf(document.activeElement as HTMLButtonElement);
      const next = e.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : (i + 1) % stops.length;
      e.preventDefault();
      stops[next]?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const n = EDITION_IDS.length;
  return (
    <div ref={ref} className={`ep-maps${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ep-maps-title"
      data-testid="map-chooser" onClick={onClose} style={{ '--n': n } as React.CSSProperties}>
      <div className="ep-maps-inner">
        <div className="ep-maps-lamp">
          <div className="ep-maps-head">
            <span className="eps-to">Ticket to</span>
            <span className="eps-titlerow">
              <span className="eps-name" id="ep-maps-title">{FLAGSHIP}</span>
              <span className="eps-seal">Series</span>
            </span>
            <span className="ep-maps-hint">Choose a map</span>
          </div>
          <div className="ep-maps-cone" aria-hidden><span /></div>
        </div>
        <div className="ep-maps-row">
          {EDITION_IDS.map((id, i) => (
            <div key={id} className="ep-maps-cell" style={{ '--i': i, '--tilt': `${(i - (n - 1) / 2) * 1.6}deg` } as React.CSSProperties}>
              <button type="button" className={`ep-card ep-mini ep-${id}`} onClick={(e) => { e.stopPropagation(); onPick(id); }} data-testid={`pick-${id}`}
                aria-label={`${EDITIONS[id].label}: Ticket to ${SKINS[EDITIONS[id].skin].name}`}>
                <span className="ep-art" aria-hidden>{ART[id]}</span>
                <span className="ep-text">{TEXT[id]}</span>
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="ep-maps-close" data-testid="map-chooser-close">Back</button>
      </div>
    </div>
  );
}

const name = (id: EditionId) => SKINS[EDITIONS[id].skin].name;
const BEIJING_ZH = (SKINS.beijing as { zh?: string }).zh;

const TEXT: Record<EditionId, React.ReactNode> = {
  usa: (
    <>
      <span className="ep-usa-to">Ticket to</span>
      <span className="ep-usa-name">{name('usa')}</span>
      <span className="ep-usa-line">Seattle to Miami, coast to coast</span>
      <span className="ep-usa-label">USA</span>
    </>
  ),
  china: (
    <>
      <span className="ep-china-to">Ticket to</span>
      <span className="ep-china-name">{name('china')}</span>
      {BEIJING_ZH && <span className="ep-china-zh" lang="zh-Hans">开往{BEIJING_ZH}</span>}
      <span className="ep-china-line">Harbin to Haikou by high-speed rail</span>
      <span className="ep-china-label"><span className="ep-china-no">G1</span>China</span>
    </>
  ),
  europe: (
    <>
      <span className="ep-europe-to">Ticket to</span>
      <span className="ep-europe-name">{name('europe')}</span>
      <span className="ep-europe-line">Edinburgh to Constantinople</span>
      <span className="ep-europe-label">Europe</span>
    </>
  ),
  singapore: (
    <>
      <span className="ep-sg-to">Ticket to</span>
      <span className="ep-sg-name">{name('singapore')}</span>
      <span className="ep-sg-line">Tuas to Changi, with Marina Bay, Chinatown and the Gardens in between</span>
      <span className="ep-sg-label">Singapore</span>
    </>
  ),
};

/** Vintage travel poster: a big desert sun, mesas, and a steam train crossing the plain. */
const UsaArt = (
  <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMax slice">
    <rect width="240" height="180" fill="#efe2c4" />
    <g className="ep-usa-rays" fill="#e8c873" opacity=".55">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M120 112 L113 -40 L127 -40 Z" transform={`rotate(${i * 30 - 165} 120 112)`} />
      ))}
    </g>
    <circle cx="120" cy="112" r="46" fill="#e3b23c" stroke="#3b2a1e" strokeWidth="2" />
    <path d="M0 126 L30 104 L44 110 L62 88 H84 L96 104 L118 98 L136 112 L160 94 H178 L190 84 H214 L226 100 L240 92 V180 H0 Z" fill="#c9824f" stroke="#3b2a1e" strokeWidth="2" strokeLinejoin="round" />
    <path d="M0 140 L40 128 L84 136 L130 124 L180 134 L240 122 V180 H0 Z" fill="#a5603b" />
    <rect y="148" width="240" height="32" fill="#d8b98a" />
    <line x1="0" y1="148" x2="240" y2="148" stroke="#3b2a1e" strokeWidth="2" />
    <g className="ep-usa-smoke" fill="#f7f1e3" stroke="#3b2a1e" strokeWidth="1.5">
      <circle cx="74" cy="118" r="6" /><circle cx="62" cy="110" r="8" /><circle cx="46" cy="104" r="9.5" />
    </g>
    {/* the train: tender, boiler, cab, cowcatcher, three cars */}
    <g fill="#3b2a1e">
      <rect x="70" y="124" width="8" height="10" />
      <rect x="62" y="130" width="40" height="14" rx="3" />
      <rect x="96" y="122" width="16" height="22" />
      <path d="M62 144 L54 148 H62 Z" />
      <rect x="116" y="130" width="22" height="14" rx="1.5" />
      <rect x="141" y="128" width="30" height="16" rx="1.5" />
      <rect x="174" y="128" width="30" height="16" rx="1.5" />
    </g>
    <g fill="#e3b23c">
      <rect x="100" y="126" width="8" height="6" />
      {[146, 156, 179, 189].map((x) => <rect key={x} x={x} y="132" width="6" height="5" />)}
    </g>
    <circle cx="65" cy="134" r="2.5" fill="#e3b23c" />
    <rect x="0" y="0" width="240" height="180" fill="none" stroke="#3b2a1e" strokeWidth="6" />
  </svg>
);

/** Modern high-speed rail: a white EMU with the red and blue livery gliding along a viaduct. */
const ChinaArt = (
  <svg viewBox="0 0 240 180" preserveAspectRatio="xMaxYMid slice">
    <defs>
      <linearGradient id="ep-cn-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#dbe8f7" />
        <stop offset="1" stopColor="#f6f9fc" />
      </linearGradient>
      <linearGradient id="ep-cn-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#dfe5ee" />
      </linearGradient>
      <linearGradient id="ep-cn-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#14213d" />
        <stop offset="1" stopColor="#2c4673" />
      </linearGradient>
    </defs>
    <rect width="240" height="180" fill="url(#ep-cn-sky)" />
    <path d="M0 118 V102 h14 v-14 h10 v14 h16 v-26 h12 v26 h18 v-10 h10 v10 h24 v-34 l6 -6 l6 6 v34 h22 v-16 h14 v16 h26 v-22 h12 v22 h20 v-12 h16 v12 H240 V118 Z" fill="#cfdbea" />
    <rect y="126" width="240" height="5" fill="#a8b4c6" />
    <rect y="131" width="240" height="49" fill="#eef2f7" />
    {[30, 110, 190].map((x) => <rect key={x} x={x - 7} y="131" width="14" height="49" fill="#d5dce6" />)}
    <g className="ep-china-speed" stroke="#1d5fbf" strokeLinecap="round" opacity=".45">
      <line x1="0" y1="66" x2="60" y2="66" strokeWidth="1.5" />
      <line x1="10" y1="92" x2="44" y2="92" strokeWidth="2" />
      <line x1="0" y1="112" x2="70" y2="112" strokeWidth="1.2" />
    </g>
    <g className="ep-china-train">
      <path d="M-10 74 H150 C186 74 214 86 234 104 C240 110 238 122 228 122 H-10 Z" fill="url(#ep-cn-body)" stroke="#a8b4c6" strokeWidth="1.2" />
      {[4, 30, 56, 82, 108].map((x) => <rect key={x} x={x} y="83" width="19" height="10" rx="2.5" fill="url(#ep-cn-glass)" />)}
      <path d="M148 82 C178 82 202 90 220 102 L208 103 C190 93 170 89 148 89 Z" fill="url(#ep-cn-glass)" />
      <path d="M-10 100 H156 C184 100 210 106 230 114 L227 117 C206 110 182 106 156 106 H-10 Z" fill="#c8102e" />
      <path d="M-10 110 H152 C178 110 200 113 220 118 L217 119.5 C198 115 176 113 152 113 H-10 Z" fill="#1d5fbf" />
      {[24, 128].map((x) => <rect key={x} x={x} y="121" width="30" height="5" rx="2" fill="#3d4b66" />)}
    </g>
  </svg>
);

/** 1930s continental poster: a streamlined engine head-on under a brass sunburst, rails running to the horizon. */
const EuropeArt = (
  <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice">
    <rect width="240" height="180" fill="#1f4a3a" />
    <g className="ep-europe-burst" fill="#b8903a" opacity=".32">
      {Array.from({ length: 18 }, (_, i) => (
        <path key={i} d="M120 92 L116 -60 L124 -60 Z" transform={`rotate(${i * 20} 120 92)`} />
      ))}
    </g>
    <circle cx="120" cy="92" r="58" fill="none" stroke="#b8903a" strokeWidth="1.5" opacity=".7" />
    <path d="M0 132 H240 V180 H0 Z" fill="#163a2d" />
    <path d="M104 132 L40 180 H58 L110 132 Z M136 132 L200 180 H182 L130 132 Z" fill="#b8903a" />
    {[140, 152, 168].map((y, i) => (
      <rect key={y} x={120 - (22 + i * 16)} y={y} width={2 * (22 + i * 16)} height={3 + i} fill="#2b2620" />
    ))}
    {/* the engine, head-on: a round streamlined face with speed bands and one lamp */}
    <path d="M84 132 V86 C84 60 100 46 120 46 C140 46 156 60 156 86 V132 Z" fill="#26231f" stroke="#b8903a" strokeWidth="2" />
    <path d="M90 132 V88 C90 66 103 54 120 54 C137 54 150 66 150 88 V132 Z" fill="#7b1e2b" />
    {[98, 108, 118].map((y) => <rect key={y} x="90" y={y} width="60" height="3" fill="#f2ead6" opacity=".85" />)}
    <path d="M104 64 C108 59 113 57 120 57 C127 57 132 59 136 64 L132 76 H108 Z" fill="#14281f" stroke="#b8903a" strokeWidth="1.2" />
    <circle cx="120" cy="88" r="5" fill="#f7e7a8" stroke="#b8903a" strokeWidth="1.5" />
    <rect x="80" y="128" width="80" height="6" fill="#b8903a" />
    <rect x="3" y="3" width="234" height="174" fill="none" stroke="#b8903a" strokeWidth="2" />
    <rect x="8" y="8" width="224" height="164" fill="none" stroke="#b8903a" strokeWidth=".8" opacity=".7" />
  </svg>
);

/** Tropical golden hour: the Merlion spouting into Marina Bay, the three towers and SkyPark, an MRT train on a viaduct. */
const SgArt = (
  <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="ep-sg-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6fcbdc" />
        <stop offset=".6" stopColor="#d9f1ee" />
        <stop offset="1" stopColor="#ffe9c4" />
      </linearGradient>
      <linearGradient id="ep-sg-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#58bcc4" />
        <stop offset="1" stopColor="#23868a" />
      </linearGradient>
    </defs>
    <rect width="240" height="180" fill="url(#ep-sg-sky)" />
    <circle cx="190" cy="52" r="26" fill="#ffe08a" opacity=".45" />
    <circle cx="190" cy="52" r="16" fill="#ffd05a" />
    <g fill="#fff" opacity=".85"><ellipse cx="40" cy="30" rx="26" ry="6" /><ellipse cx="58" cy="26" rx="16" ry="6" /><ellipse cx="140" cy="20" rx="22" ry="5" /></g>
    <g fill="#a9d8d6">{[[150, 82, 12], [163, 70, 10], [175, 88, 14], [208, 76, 12], [221, 66, 10], [233, 84, 14]].map(([x, y, w]) => <rect key={x} x={x} y={y} width={w} height={112 - y} />)}</g>
    <rect y="108" width="240" height="72" fill="url(#ep-sg-sea)" />
    <path d="M0 118 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
    <g className="ep-sg-bay" strokeLinejoin="round">
      {[{ x: 112, l: 3 }, { x: 132, l: 0 }, { x: 152, l: -3 }].map(({ x, l }) => (
        <path key={x} d={`M${x - 6},112 L${x - 5 + l * 0.4},50 L${x + 6 + l * 0.4},50 L${x + 6},112Z`} fill="#f4f1ea" stroke="#10343c" strokeWidth="1" />
      ))}
      <path d="M100,50 Q128,46 132,48 Q156,46 168,50 L164,54 Q132,50 104,54Z" fill="#fff" stroke="#10343c" strokeWidth="1" />
      <path d="M150,48 Q160,40 170,48" fill="none" stroke="#17a673" strokeWidth="2" strokeLinecap="round" />
    </g>
    {/* the Merlion */}
    <g strokeLinejoin="round">
      <path d="M44 114 Q82 74 118 112" fill="none" stroke="#e8fbff" strokeWidth="3" strokeLinecap="round" opacity=".95" />
      <rect x="22" y="106" width="26" height="9" rx="2" fill="#d9d3c4" stroke="#10343c" strokeWidth="1" />
      <path d="M26 106 C22 92 26 80 32 74 L48 74 C52 80 52 88 48 94 C54 98 58 102 56 106Z" fill="#f4f6f8" stroke="#10343c" strokeWidth="1.1" />
      {Array.from({ length: 11 }, (_, i) => { const a = (i / 11) * Math.PI * 2; return <circle key={i} cx={(40 + Math.cos(a) * 11.6).toFixed(1)} cy={(64 + Math.sin(a) * 11.6).toFixed(1)} r="4.2" fill="#f3d27a" stroke="#10343c" strokeWidth=".8" />; })}
      <circle cx="40" cy="64" r="10.6" fill="#f7e2a6" stroke="#10343c" strokeWidth="1.1" />
      <circle cx="35.6" cy="61.6" r="1.4" fill="#10343c" /><circle cx="44" cy="61.6" r="1.4" fill="#10343c" />
      <path d="M37.6 66 Q40 64.6 42.4 66 L40 68.6Z" fill="#c9783a" stroke="#10343c" strokeWidth=".7" />
      <path d="M30 69 Q36 74 40 71" fill="#d8453a" stroke="#10343c" strokeWidth=".8" />
    </g>
    {/* the viaduct and train */}
    <rect y="146" width="240" height="6" fill="#cfd9db" stroke="#10343c" strokeWidth="1" />
    {[20, 90, 160, 230].map((x) => <rect key={x} x={x - 4} y="152" width="8" height="28" fill="#e4ecec" stroke="#10343c" strokeWidth="1" />)}
    <g className="ep-sg-train" strokeLinejoin="round">
      <g transform="translate(60 122)">
        <path d="M0 0 H116 C130 0 140 8 144 18 V24 H0Z" fill="#fff" stroke="#10343c" strokeWidth="1.3" />
        {['#d42e12', '#009645', '#9900aa', '#fa9e0d', '#005ec4', '#9d5b25'].map((c, i) => <rect key={c} x="1" y={14.2 + i * 1.6} width="142" height="1.6" fill={c} />)}
        {[6, 24, 42, 60, 78, 96].map((x) => <rect key={x} x={x} y="4" width="13" height="8" rx="1.8" fill="#2b5a78" stroke="#10343c" strokeWidth=".8" />)}
        <path d="M112 4 H118 C125 4 132 8 135 12 H112Z" fill="#2b5a78" stroke="#10343c" strokeWidth=".8" />
        <circle cx="139" cy="20" r="1.8" fill="#ffe27a" stroke="#10343c" strokeWidth=".6" />
        <rect x="0" y="24" width="144" height="2.4" fill="#10343c" />
      </g>
    </g>
  </svg>
);

/** Tactical night map: contour lines, a radar sweep with contacts, the red front line and a tank on the ridge, framed by HUD brackets. */
const FrontlineArt = (
  <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="ep-fl-bg" cx=".7" cy=".35" r=".9">
        <stop offset="0" stopColor="#263222" />
        <stop offset="1" stopColor="#0e120e" />
      </radialGradient>
      <linearGradient id="ep-fl-sweep" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9be06b" stopOpacity="0" />
        <stop offset="1" stopColor="#9be06b" stopOpacity=".55" />
      </linearGradient>
    </defs>
    <rect width="240" height="180" fill="url(#ep-fl-bg)" />
    <g stroke="#9be06b" strokeWidth=".4" opacity=".12">
      {[30, 60, 90, 120, 150, 180, 210].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="180" />)}
      {[30, 60, 90, 120, 150].map((y) => <line key={y} x1="0" y1={y} x2="240" y2={y} />)}
    </g>
    <g fill="none" stroke="#5f7444" strokeWidth="1" opacity=".55">
      <path d="M-10 40 C30 20 60 60 100 44 S160 10 250 30" />
      <path d="M-10 62 C34 44 66 84 108 66 S170 32 250 54" />
      <path d="M-10 150 C40 120 80 140 120 128 S190 150 250 120" />
      <path d="M20 100 C40 84 70 92 72 108 C74 124 40 126 20 100Z" />
      <path d="M32 102 C44 94 60 98 60 106 C60 114 42 116 32 102Z" />
    </g>
    <g transform="translate(170 70)">
      {[16, 32, 48].map((r) => <circle key={r} r={r} fill="none" stroke="#9be06b" strokeWidth=".8" opacity=".45" />)}
      <path d="M-52 0H52M0 -52V52" stroke="#9be06b" strokeWidth=".6" opacity=".35" />
      <g className="ep-fl-sweep"><path d="M0 0 L48 0 A48 48 0 0 0 33.9 -33.9 Z" fill="url(#ep-fl-sweep)" /></g>
      {[[22, -18], [-30, 12], [10, 34]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.2" fill="#d4ff9a" />)}
    </g>
    <path d="M0 118 L40 110 L70 122 L104 104 L140 116 L176 100 L210 112 L240 104" fill="none" stroke="#d6452f" strokeWidth="2.2" strokeDasharray="7 4" />
    <path d="M0 180 V150 L40 138 L90 146 L140 134 L190 144 L240 136 V180Z" fill="#141a13" stroke="#3d4a32" strokeWidth="1" />
    <g className="ep-fl-tank" fill="#2d3826" stroke="#c8ad7f" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M62 128 L118 128 L126 134 L120 142 L58 142 L52 134Z" />
      <path d="M72 128 L76 118 L102 118 L106 128Z" />
      <line x1="104" y1="121" x2="142" y2="117" strokeWidth="2.4" strokeLinecap="round" />
      {[62, 74, 86, 98, 110].map((x) => <circle key={x} cx={x} cy="139" r="3" fill="#1b2218" />)}
    </g>
    <g fill="none" stroke="#c8ad7f" strokeWidth="2">
      <path d="M8 22V8H22M218 8H232V22M232 158V172H218M22 172H8V158" />
    </g>
  </svg>
);

/** Combat plot from above: a lettered grid over dark water, a carrier with its air wing, miss rings, a burning hit, and a reticle locking on. */
const FleetArt = (
  <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="ep-flt-sea" cx=".55" cy=".45" r=".85">
        <stop offset="0" stopColor="#0f2a40" />
        <stop offset="1" stopColor="#050b13" />
      </radialGradient>
      <radialGradient id="ep-flt-fire" cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#ffd27a" />
        <stop offset=".45" stopColor="#ff6a3d" stopOpacity=".85" />
        <stop offset="1" stopColor="#ff4d4d" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="240" height="180" fill="url(#ep-flt-sea)" />
    <g stroke="#38e1ff" strokeWidth=".5" opacity=".18">
      {Array.from({ length: 11 }, (_, i) => 20 + i * 20).map((x) => <line key={`x${x}`} x1={x} y1="20" x2={x} y2="180" />)}
      {Array.from({ length: 9 }, (_, i) => 20 + i * 20).map((y) => <line key={`y${y}`} x1="20" y1={y} x2="240" y2={y} />)}
    </g>
    <g fill="#38e1ff" opacity=".55" fontFamily="ui-monospace, Menlo, monospace" fontSize="8" textAnchor="middle">
      {'ABCDEFGHIJ'.split('').map((c, i) => <text key={c} x={30 + i * 20} y="14">{c}</text>)}
      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <text key={n} x="10" y={33 + (n - 1) * 20}>{n}</text>)}
    </g>
    <g stroke="#cfefff" strokeWidth="1" fill="none" opacity=".35" strokeLinecap="round">
      <path d="M44 104 C32 102 22 98 6 96" />
      <path d="M44 116 C32 118 22 122 6 126" />
    </g>
    <g className="ep-flt-ship">
      <path d="M46 96 L168 92 C184 92 198 100 206 110 C198 120 184 128 168 128 L46 124 Z" fill="#46596b" stroke="#a9c1d6" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M52 99 L166 96 L192 110 L166 124 L52 121 Z" fill="#2c3a48" />
      <path d="M60 116 L150 98" stroke="#ffb547" strokeWidth="1" strokeDasharray="5 4" opacity=".8" />
      <path d="M56 110 H186" stroke="#e8f1f8" strokeWidth=".8" strokeDasharray="3 5" opacity=".55" />
      <rect x="128" y="120" width="22" height="9" rx="1.5" fill="#7d93a7" stroke="#cfe0ee" strokeWidth=".8" />
      <circle cx="136" cy="124.5" r="1.8" fill="#38e1ff" />
      {[[74, 104], [90, 101], [106, 112], [158, 106], [170, 113]].map(([x, y]) => (
        <path key={x} d={`M${x} ${y} l6 -1.5 l-1 1.5 l3 0 l0 1 l-3 0 l1 1.5 Z M${x + 1} ${y - 3} l1 6`} fill="#dbe7f3" stroke="#dbe7f3" strokeWidth=".5" strokeLinejoin="round" />
      ))}
    </g>
    <circle cx="114" cy="110" r="13" fill="url(#ep-flt-fire)" className="ep-flt-fire" />
    <path d="M108 104 L120 116 M120 104 L108 116" stroke="#ff4d4d" strokeWidth="2.6" strokeLinecap="round" />
    {[[70, 50], [150, 150], [210, 70]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="5" fill="none" stroke="#38e1ff" strokeWidth="1.4" opacity=".8" />)}
    <g transform="translate(190 150)">
      <g className="ep-flt-reticle">
        <path d="M-14 -6V-14H-6M6 -14H14V-6M14 6V14H6M-6 14H-14V6" fill="none" stroke="#38e1ff" strokeWidth="1.6" />
        <path d="M-4 0H4M0 -4V4" stroke="#ffb547" strokeWidth="1.2" />
      </g>
    </g>
  </svg>
);

const ART: Record<EditionId, React.ReactNode> = { usa: UsaArt, china: ChinaArt, europe: EuropeArt, singapore: SgArt };
