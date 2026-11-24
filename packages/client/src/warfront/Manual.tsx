import { useState } from 'react';
import { Die } from './Dice';

const TABS = ['Briefing', 'Your turn', 'Battle', 'Intel cards', 'Missions', 'Controls'] as const;

/** The Field Manual: illustrated tabs with small diagrams. */
export function Manual({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Briefing');
  return (
    <div className="wf-modal" role="dialog" aria-label="Field Manual" onClick={onClose}>
      <div className="wf-manual" onClick={(e) => e.stopPropagation()}>
        <div className="wf-manual-spine" aria-hidden />
        <header><span className="wf-manual-title">FIELD MANUAL</span><small>FM-42 · Theatre Operations</small><button type="button" className="wf-x" onClick={onClose} aria-label="Close">×</button></header>
        <nav role="tablist">{TABS.map((t) => <button key={t} role="tab" type="button" aria-selected={tab === t} className={tab === t ? 'wf-on' : ''} onClick={() => setTab(t)}>{t}</button>)}</nav>
        <div className="wf-manual-page">
          {tab === 'Briefing' && (
            <>
              <h3>Command the world</h3>
              <p>2 to 6 generals fight over 42 territories in 6 continents. In <b>World Domination</b> you win by wiping every rival off the map. In <b>Secret Mission</b> you win the moment you complete your sealed orders.</p>
              <p>Start: armies by player count (3: 35, 4: 30, 5: 25, 6: 20). Territories are dealt or claimed one at a time, then everyone places their remaining armies one at a time.</p>
              <p>Two generals: each has 40 and a grey <b>neutral army</b> holds a third of the world. Every setup turn you place 2 of your own and 1 neutral. Neutrals defend but never attack.</p>
            </>
          )}
          {tab === 'Your turn' && (
            <>
              <h3>Reinforce → Attack → Fortify</h3>
              <svg viewBox="0 0 300 70" className="wf-diagram" aria-hidden>
                {['Reinforce', 'Attack', 'Fortify'].map((p, i) => <g key={p} transform={`translate(${20 + i * 98},14)`}><rect width="80" height="40" rx="5" fill="url(#wf-brass)" stroke="#5a3e12" /><text x="40" y="25" textAnchor="middle">{p}</text>{i < 2 && <path d="M84,20 L94,20 M90,16 L94,20 L90,24" stroke="#2b2a26" strokeWidth="2" fill="none" />}</g>)}
              </svg>
              <p><b>Reinforce:</b> territories ÷ 3 (rounded down, at least 3), plus each continent you hold completely, plus any card sets you trade.</p>
              <p><b>Attack:</b> from a territory with 2+ armies to a neighbour (sea lanes count). Attack as often as you like.</p>
              <p><b>Fortify:</b> one move from one of your territories to another connected through your own territories. At least 1 army always stays.</p>
            </>
          )}
          {tab === 'Battle' && (
            <>
              <h3>The dice</h3>
              <div className="wf-diag-dice">
                <span><Die v={6} metal="brass" i={0} /><Die v={4} metal="brass" i={1} /><Die v={2} metal="brass" i={2} lost /></span>
                <span className="wf-diag-vs">vs</span>
                <span><Die v={5} metal="steel" i={3} lost /><Die v={4} metal="steel" i={4} /></span>
              </div>
              <p>The attacker rolls 1-3 dice (at most one fewer than their armies). The defender rolls up to 2. Pair the highest with the highest, then the next. Each pair costs the lower side one army. <b>Ties go to the defender.</b> Above: 6 beats 5, and the 4s tie, so each side loses one.</p>
              <p>Take a territory and you must move in at least as many armies as dice you rolled. <b>Blitz</b> keeps rolling until the territory falls or you have 1 army left.</p>
            </>
          )}
          {tab === 'Intel cards' && (
            <>
              <h3>Cards and sets</h3>
              <p>Take at least one territory on your turn and you receive one card. Each card shows Infantry, Armor or Artillery; there are 2 wilds.</p>
              <p>A set is three alike, one of each, or any two with a wild. Sets are worth <b>4, 6, 8, 10, 12, 15</b>, then 5 more each time, counted across the whole table. If a card shows a territory you hold, 2 extra armies go straight there.</p>
              <p>Five or more cards at the start of your turn: you must trade. Knock out a general and you take their cards; with six or more you trade at once, place the armies, and keep fighting.</p>
            </>
          )}
          {tab === 'Missions' && (
            <>
              <h3>Secret Mission mode (3+ generals)</h3>
              <p>Everyone gets sealed orders: hold two named continents (sometimes plus one of your choice), hold 24 territories, hold 18 with 2+ armies each, or destroy one rival. If your target is you, or someone else destroys them first, your orders become 24 territories.</p>
              <p>You win the moment your orders are complete on your own turn.</p>
            </>
          )}
          {tab === 'Controls' && (
            <>
              <h3>Controls</h3>
              <ul className="wf-keys">
                <li><kbd>Click</kbd> select a territory, then a target. Glowing territories are the ones you can pick.</li>
                <li><kbd>Shift</kbd>+click remove a deployed army before you confirm. <kbd>U</kbd> undo, <kbd>A</kbd> all here, <kbd>Enter</kbd> confirm.</li>
                <li><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> dice, <kbd>R</kbd> roll, <kbd>B</kbd> blitz, <kbd>F</kbd> fortify, <kbd>E</kbd> end turn, <kbd>Esc</kbd> cancel.</li>
                <li>Drag to pan, scroll or pinch to zoom; the ⤢ button fits the whole map.</li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
