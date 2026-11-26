import { useState, type ReactNode } from 'react';
import { PieceArt } from './art/blocks';
import { Sigil } from './art/plateau';
import { Icon } from './art/icons';

/** A small board for the demos: cream sockets in cell units. */
function Mini({ size = 6, children }: { size?: number; children: ReactNode }) {
  const cells = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push(<rect key={`${r},${c}`} x={c + 0.06} y={r + 0.06} width=".88" height=".88" rx=".2" fill="#efe8d8" stroke="#2b3550" strokeOpacity=".08" strokeWidth=".04" />);
  return (
    <svg className="bly-demo" viewBox={`-.6 -1.2 ${size + 1.2} ${size + 1.8}`} aria-hidden>
      <rect x="-.4" y="-.4" width={size + 0.8} height={size + 0.8} rx=".4" fill="#e6dcc6" stroke="#8c7e66" strokeWidth=".08" />
      {cells}
      {children}
    </svg>
  );
}

const PAGES: { title: string; text: ReactNode; demo: ReactNode }[] = [
  {
    title: 'Start in your corner',
    text: <>Each guild begins at its glowing start sigil. Your first piece must cover it. Big pieces first: they are the hardest to fit later.</>,
    demo: <Mini><Sigil guild="sun" r={0} c={0} /><g className="bly-demo-drop"><PieceArt guild="sun" piece="L5" orient={0} x={0} y={0} /></g></Mini>,
  },
  {
    title: 'Touch your guild only at the corners',
    text: <>Every new piece must touch a piece of your own guild <b>corner to corner</b>. The glowing diamonds show your open corners.</>,
    demo: (
      <Mini>
        <PieceArt guild="tide" piece="L4" orient={0} x={0} y={0} />
        <g className="bly-demo-anchor"><path d="M2.5,2.18 L2.82,2.5 L2.5,2.82 L2.18,2.5Z" fill="#3a8aa0" stroke="#123c48" strokeWidth=".06" /></g>
        <g className="bly-demo-drop bly-demo-late"><PieceArt guild="tide" piece="T4" orient={0} x={2} y={3} /></g>
        <g className="bly-demo-ok"><circle cx="2" cy="3" r=".35" fill="#fff" /><path d="M1.82,3 l.13,.14 l.26,-.3" stroke="#3f9f62" strokeWidth=".1" fill="none" strokeLinecap="round" /></g>
      </Mini>
    ),
  },
  {
    title: 'Never along an edge',
    text: <>Your pieces may never share an edge with your own guild. Touching <b>other</b> guilds is fine, so squeeze in and block their corners!</>,
    demo: (
      <Mini>
        <PieceArt guild="ember" piece="O4" orient={0} x={0} y={0} />
        <PieceArt guild="grove" piece="I3" orient={1} x={4} y={0} />
        <g className="bly-demo-slide bly-g-none"><PieceArt guild="ember" piece="I3" orient={0} x={2} y={0} className="bly-g-none" /></g>
        <g className="bly-demo-no"><circle cx="2" cy=".5" r=".36" fill="#fff" stroke="#d9455b" strokeWidth=".06" /><path d="M1.84,.34 l.32,.32 M2.16,.34 l-.32,.32" stroke="#d9455b" strokeWidth=".1" strokeLinecap="round" /></g>
        <text x="3" y="-.45" className="bly-demo-cap">Can’t touch your own guild along an edge</text>
      </Mini>
    ),
  },
  {
    title: 'Scoring',
    text: <>When no guild can build, every square left on your shelf costs <b>1 point</b>. Build all 21 pieces for <b>+15</b>, or <b>+20</b> if your last piece was the one-square Keystone. The highest score wins.</>,
    demo: (
      <svg className="bly-demo" viewBox="-.5 -1.4 8 6" aria-hidden>
        <rect x="-.3" y="-.2" width="7.6" height="3.2" rx=".3" fill="#b47f4b" stroke="#5e3b1f" strokeWidth=".06" />
        <g className="bly-demo-tick1"><PieceArt guild="grove" piece="I3" orient={0} x={0.3} y={0.5} details={false} /></g>
        <g className="bly-demo-tick2"><PieceArt guild="grove" piece="V3" orient={0} x={3.8} y={0.5} details={false} /></g>
        <g className="bly-demo-tick3"><PieceArt guild="grove" piece="I1" orient={0} x={6} y={1.4} details={false} /></g>
        <text x="3.5" y="4.3" className="bly-demo-score">−7 left over · +15 all built · +20 last is the Keystone</text>
      </svg>
    ),
  },
];

/** How to play: four illustrated pages, each with a small looping demo. */
export function HowTo({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const p = PAGES[i];
  return (
    <div className="bly-modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bly-modal-card bly-stone bly-howto">
        <header><h2><Icon name="suggest" size={26} /> How to play</h2><button type="button" className="bly-key bly-key-sm bly-key-icon" aria-label="Close" onClick={onClose}><Icon name="cancel" size={18} /></button></header>
        <div className="bly-howto-page" key={i}>
          <div className="bly-howto-art">{p.demo}</div>
          <div className="bly-howto-text"><h3>{i + 1}. {p.title}</h3><p>{p.text}</p></div>
        </div>
        <footer>
          <button type="button" className="bly-key" disabled={i === 0} onClick={() => setI(i - 1)}>‹ Back</button>
          <span className="bly-dotsnav" aria-label={`Page ${i + 1} of ${PAGES.length}`}>{PAGES.map((_, k) => <button key={k} type="button" aria-label={`Page ${k + 1}`} aria-current={k === i} onClick={() => setI(k)} />)}</span>
          {i < PAGES.length - 1 ? <button type="button" className="bly-key bly-key-go" onClick={() => setI(i + 1)} data-testid="bly-howto-next">Next ›</button> : <button type="button" className="bly-key bly-key-go" onClick={onClose}>Let’s build!</button>}
        </footer>
      </div>
    </div>
  );
}
