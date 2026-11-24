import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { ARMY, isLake, kindOf, TWO_SQUARE_LIMIT, type PlayerID, type Rank } from '@boboland/shared/src/frontline';
import { Chip } from './Tile';
import './briefing.css';

type Tab = 'placement' | 'gameplay';
const TABS: { id: Tab; label: string }[] = [{ id: 'placement', label: 'Placement' }, { id: 'gameplay', label: 'Gameplay' }];

/** The instructions, written as a mission briefing: one tab for deploying, one for playing. */
export function Briefing({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('placement');
  useEffect(() => {
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // a new tab starts at the top
  useEffect(() => { box.current?.scrollTo({ top: 0 }); }, [tab]);
  const onTabKey = (e: ReactKeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = TABS[(TABS.findIndex((t) => t.id === tab) + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length].id;
    setTab(next);
    document.getElementById(`flb-tab-${next}`)?.focus();
  };
  return (
    <div className="flm-modal" onClick={onClose} data-testid="fl-rules-modal">
      <div ref={box} tabIndex={-1} className="flm-brief" role="dialog" aria-modal="true" aria-labelledby="flm-brief-title" onClick={(e) => e.stopPropagation()}>
        <div className="flm-strip"><span>Intel // Eyes only</span><span>Briefing 01</span></div>
        <div className="px-5 pb-6 pt-5 sm:px-8">
          <h2 id="flm-brief-title">Mission Briefing</h2>
          <p className="mt-2">Capture the enemy <b>Command Post</b>. Every enemy unit is hidden until it fights, so read their moves, bluff with yours, and strike when you know what you're hitting.</p>

          <div className="flbr-tabs" role="tablist" aria-label="Briefing sections" onKeyDown={onTabKey}>
            {TABS.map((t) => (
              <button key={t.id} id={`flb-tab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`flb-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1} className="flbr-tab" onClick={() => setTab(t.id)} data-testid={`fl-rules-tab-${t.id}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div id={`flb-panel-${tab}`} role="tabpanel" aria-labelledby={`flb-tab-${tab}`} className="flbr-panel">
            {tab === 'placement' ? <Placement /> : <Gameplay />}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            {tab === 'placement'
              ? <button type="button" className="flbr-next" onClick={() => setTab('gameplay')}>Next: Gameplay</button>
              : <button type="button" className="flbr-next" onClick={() => setTab('placement')}>Back: Placement</button>}
            <button type="button" className="flm-close" onClick={onClose} data-testid="fl-rules-close">Understood</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- placement ---------------- */

const SPECIAL: { rank: Rank; text: ReactNode }[] = [
  { rank: 'F', text: <>Never moves. If it is captured, you lose. Hide it well.</> },
  { rank: 'B', text: <>Never moves. Destroys any attacker except an Engineer, and stays in place.</> },
  { rank: 1, text: <>The weakest unit, but it defeats the Marshal when the Operative attacks.</> },
  { rank: 2, text: <>Runs any distance in a straight line. Cheap and good for probing.</> },
  { rank: 3, text: <>The only unit that can clear a Mine.</> },
];

function Placement() {
  const officers = ARMY.filter((k) => typeof k.rank === 'number' && k.rank >= 4);
  return (
    <>
      <h3>Where you deploy</h3>
      <div className="flbr-split">
        <MiniBoard />
        <ul>
          <li>You place all <b>40 units</b> in your <b>four back rows</b>. The enemy deploys in theirs at the same time and can't see yours.</li>
          <li>The two middle rows are <b>no man's land</b>. Its <b>lakes</b> can't be entered, so the only ways through are the three lanes.</li>
          <li>Nothing is revealed until both sides confirm.</li>
        </ul>
      </div>

      <h3>Order of battle</h3>
      <p className="flbr-note">Special units</p>
      <div className="flbr-special">
        {SPECIAL.map(({ rank, text }) => (
          <div key={String(rank)} className="flbr-unit">
            <Chip owner="0" rank={rank} size={58} />
            <div>
              <b>{kindOf(rank).name}</b> <span className="flbr-count">×{kindOf(rank).count}</span>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="flbr-note">Officers: the higher rank wins a fight</p>
      <div className="flbr-officers">
        {officers.map((k) => (
          <div key={k.code}>
            <Chip owner="0" rank={k.rank} size={58} />
            <span className="flbr-count">×{k.count}</span>
          </div>
        ))}
      </div>

      <h3>Deploying fast</h3>
      <div className="flbr-tools">
        <div><b>Presets</b><span>Ready-made formations such as Fortress or Blitz.</span></div>
        <div><b>Random</b><span>A fresh legal layout every press.</span></div>
        <div><b>Fill rest</b><span>Places what's left in the tray for you.</span></div>
        <div><b>Saved layouts</b><span>Keep up to three of your own.</span></div>
      </div>
      <ul className="mt-2">
        <li>Tap a unit in the tray, then tap a square. Or drag it straight onto the board.</li>
        <li>Tap a placed unit to send it back. Hold and drag one onto another to swap them.</li>
      </ul>
    </>
  );
}

/** The 10x10 field: your rows, no man's land with its lakes, the enemy rows. */
function MiniBoard() {
  const cells = [];
  for (let p = 0; p < 100; p++) {
    const r = Math.floor(p / 10);
    const kind = isLake(p) ? 'lake' : r >= 6 ? 'mine' : r <= 3 ? 'theirs' : 'nml';
    cells.push(<i key={p} className={kind} />);
  }
  return (
    <figure className="flbr-board" aria-label="The board: enemy rows at the top, no man's land with two lakes in the middle, your rows at the bottom">
      <div className="flbr-grid">{cells}</div>
      <figcaption>
        <span className="t">Enemy rows</span>
        <span className="n">No man's land</span>
        <span className="m">Your rows</span>
      </figcaption>
    </figure>
  );
}

/* ---------------- gameplay ---------------- */

type Mark = 'go' | 'no' | 'hit' | 'lake';
/** A small grid with tiles and move marks. */
function Grid({ size, tiles, marks, label }: { size: number; tiles: Record<number, { owner: PlayerID; rank?: Rank }>; marks: Record<number, Mark>; label: string }) {
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    const t = tiles[i];
    const m = marks[i];
    cells.push(
      <div key={i} className={`flbr-c ${m === 'lake' ? 'lake' : ''}`}>
        {t && <span className="flbr-t"><Chip owner={t.owner} rank={t.rank} size={34} /></span>}
        {m === 'go' && <i className="go" />}
        {m === 'no' && <i className="no" />}
        {m === 'hit' && <i className="hit" />}
      </div>,
    );
  }
  return <div className="flbr-mgrid" style={{ gridTemplateColumns: `repeat(${size}, 38px)` }} role="img" aria-label={label}>{cells}</div>;
}

const EXAMPLES: { a: Rank; d: Rank; lose: 'a' | 'd' | 'both'; text: string }[] = [
  { a: 8, d: 5, lose: 'd', text: 'Higher rank wins' },
  { a: 4, d: 4, lose: 'both', text: 'Equal ranks both fall' },
  { a: 6, d: 'B', lose: 'a', text: 'The Mine destroys the attacker' },
  { a: 3, d: 'B', lose: 'd', text: 'An Engineer clears the Mine' },
  { a: 1, d: 10, lose: 'd', text: 'The Operative strikes the Marshal' },
  { a: 10, d: 1, lose: 'd', text: 'But not when the Marshal attacks first' },
];

function Gameplay() {
  return (
    <>
      <h3>Moving</h3>
      <div className="flbr-moves">
        <figure>
          <Grid size={5} label="A unit moves one square up, down, left or right, never diagonally"
            tiles={{ 12: { owner: '0', rank: 6 } }}
            marks={{ 7: 'go', 11: 'go', 13: 'go', 17: 'go', 6: 'no', 8: 'no', 16: 'no', 18: 'no' }} />
          <figcaption>One square at a time, never diagonally.</figcaption>
        </figure>
        <figure>
          <Grid size={5} label="A Scout runs in a straight line until it meets a lake or a unit, and may attack the enemy at the end"
            tiles={{ 16: { owner: '0', rank: 2 }, 1: { owner: '1' }, 17: { owner: '0', rank: 5 } }}
            marks={{ 11: 'go', 6: 'go', 1: 'hit', 15: 'go', 21: 'go', 18: 'lake', 19: 'lake' }} />
          <figcaption>A Scout runs any distance, and can attack at the end.</figcaption>
        </figure>
      </div>
      <ul className="mt-3">
        <li>On your turn, move one unit. Mines and the Command Post never move.</li>
        <li>No unit can shuttle between the same two squares more than {TWO_SQUARE_LIMIT} times in a row, or keep chasing a fleeing unit through positions it has already been in.</li>
      </ul>

      <h3>Attacking</h3>
      <p>Move onto an enemy square to attack. Both units are revealed, and the loser is removed.</p>
      <div className="flbr-fights">
        {EXAMPLES.map((x, i) => (
          <div key={i} className="flbr-fight">
            <span className={`flbr-ft ${x.lose !== 'd' ? 'lost' : ''}`}><Chip owner="0" rank={x.a} size={44} /></span>
            <svg viewBox="0 0 24 12" className="flbr-arrow" aria-hidden="true"><path d="M1 6 H19 M14 1.5 L20 6 L14 10.5" /></svg>
            <span className={`flbr-ft ${x.lose !== 'a' ? 'lost' : ''}`}><Chip owner="1" rank={x.d} size={44} /></span>
            <span className="flbr-ftext">{x.text}</span>
          </div>
        ))}
      </div>

      <h3>What you can see</h3>
      <div className="flbr-reveal">
        <figure><Chip owner="1" size={58} /><figcaption>An enemy you haven't met: only their crest.</figcaption></figure>
        <svg viewBox="0 0 40 20" className="flbr-flip" aria-hidden="true"><path d="M4 14 Q20 -2 36 14" /><path d="M30 13 L36 14 L35 8" /></svg>
        <figure><Chip owner="1" rank={7} size={58} /><figcaption>After a fight it stays revealed for the rest of the game.</figcaption></figure>
      </div>
      <ul className="mt-2">
        <li>A Scout that runs more than one square gives itself away too.</li>
        <li>Your own units that the enemy has seen carry an eye mark, so you know what they know.</li>
      </ul>

      <h3>Victory</h3>
      <div className="flbr-win">
        <span className="flbr-ft"><Chip owner="0" rank={2} size={44} /></span>
        <svg viewBox="0 0 24 12" className="flbr-arrow" aria-hidden="true"><path d="M1 6 H19 M14 1.5 L20 6 L14 10.5" /></svg>
        <span className="flbr-ft lost"><Chip owner="1" rank="F" size={44} /></span>
        <p>Capture the enemy Command Post, or leave them with no legal move. If neither side can move, it's a draw.</p>
      </div>
    </>
  );
}
