import { EDITIONS, EDITION_IDS, SKINS, type EditionId } from '@boboland/shared';
import { EDITION, setEdition, urlWithoutEdition } from '../edition';
import { navigate } from '../lib/router';
import './EditionPicker.css';

/**
 * The first screen: pick an edition (USA, China or Europe). Each card is drawn in its own edition's style
 * with fixed colours and fonts (not the theme tokens), so it looks the same whichever theme the page loaded with.
 * Picking the page's own edition just opens the menu; another one saves the choice and reloads on /menu.
 */
export function EditionPicker() {
  const pick = (id: EditionId) => {
    if (id === EDITION.id) {
      const url = new URL(urlWithoutEdition(window.location.href, '/menu'));
      navigate(url.pathname + url.search);
    } else {
      setEdition(id, { path: '/menu' });
    }
  };
  return (
    <main className="ep" data-testid="edition-picker">
      <header className="ep-head">
        <h1 className="ep-title">Where to?</h1>
        <p className="ep-sub">Pick a map. You can switch maps later from the menu.</p>
      </header>
      <div className="ep-grid">
        {EDITION_IDS.map((id) => (
          <button key={id} type="button" className={`ep-card ep-${id}`} onClick={() => pick(id)} data-testid={`pick-${id}`}
            aria-label={`${EDITIONS[id].label}: Ticket to ${SKINS[EDITIONS[id].skin].name}`}>
            <span className="ep-art" aria-hidden>{ART[id]}</span>
            <span className="ep-text">{TEXT[id]}</span>
          </button>
        ))}
      </div>
    </main>
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

const ART: Record<EditionId, React.ReactNode> = { usa: UsaArt, china: ChinaArt, europe: EuropeArt };
