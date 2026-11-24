import { useState } from 'react';
import type { SlapRuleId } from '@boboland/shared/src/egyptian';
import { navigate } from '../lib/router';
import { isFollower, usePartyState } from '../lib/party';
import { SettingsDialog } from './KeySettings';
import { loadLocal, saveLocal } from './localSetup';
import { PickerArt } from './PickerArt';
import { RulesChecklist } from './RulesChecklist';
import { HowTo } from './HowTo';
import './menu.css';

/** /egyptian: pass-and-play setup (names and slap rules), hosting online, how to play, settings. */
export function EgyptianMenu() {
  const [mode, setMode] = useState<'pick' | 'local'>('pick');
  const [setup, setSetup] = useState(loadLocal);
  const [settings, setSettings] = useState(false);
  const [howto, setHowto] = useState(false);
  const party = usePartyState();
  const follower = isFollower(party);
  const update = (names: [string, string], rules: SlapRuleId[]) => { const s = { names, rules }; setSetup(s); saveLocal(s); };
  return (
    <main className="egw egw-menu" data-testid="egw-menu">
      <header className="egw-menu-bar">
        <button type="button" className="egw-btn egw-btn-ghost" onClick={() => navigate('/')}>← All games</button>
        <div className="egw-bar-actions">
          <button type="button" className="egw-btn egw-btn-ghost" onClick={() => setHowto(true)} data-testid="egw-howto">How to play</button>
          <button type="button" className="egw-btn egw-btn-ghost" onClick={() => setSettings(true)} data-testid="egw-settings">Settings</button>
        </div>
      </header>

      <section className="egw-hero">
        <div className="egw-hero-art"><PickerArt /></div>
        <p className="egw-eyebrow">A slapping card game · 2 to 5 players</p>
        <h1 className="egw-display egw-hero-title">Egyptian War</h1>
        <p className="egw-hero-line">Flip, challenge, slap. The first valid slap takes the pile. Win all 52 cards.</p>
      </section>

      {follower ? (
        <p className="egw-sub egw-center-text" data-testid="party-waiting">You're in {party.party?.members.find((m) => m.id === party.party?.host)?.name ?? 'the host'}'s party. Your screen follows them.</p>
      ) : mode === 'pick' ? (
        <section className="egw-modes">
          <button type="button" className="egw-mode" data-testid="egw-mode-local" onClick={() => setMode('local')}>
            <span className="egw-mode-kicker">One keyboard</span>
            <span className="egw-mode-name">Pass and play</span>
            <span className="egw-mode-line">Two players face off on one screen. Player 1 on the left with Q and W, player 2 on the right with ] and [.</span>
          </button>
          <button type="button" className="egw-mode" data-testid="egw-host" onClick={() => navigate('/egyptian/host')}>
            <span className="egw-mode-kicker">2 to 5 players</span>
            <span className="egw-mode-name">Online</span>
            <span className="egw-mode-line">Open a waiting room and share the link or QR code. Everyone plays on their own device with F and Space.</span>
          </button>
        </section>
      ) : (
        <section className="egw-panel egw-setup" aria-label="Pass and play setup">
          <div className="egw-setup-names">
            {([0, 1] as const).map((i) => (
              <label key={i} className="egw-field">
                <span>{i === 0 ? 'Player 1 · left · Q / W' : 'Player 2 · right · ] / ['}</span>
                <input value={setup.names[i]} maxLength={20} data-testid={`egw-name-${i}`}
                  onChange={(e) => update(i === 0 ? [e.target.value, setup.names[1]] : [setup.names[0], e.target.value], setup.rules)} />
              </label>
            ))}
          </div>
          <h2 className="egw-eyebrow">Slap rules</h2>
          <RulesChecklist value={setup.rules} onChange={(rules) => update(setup.names, rules)} />
          <div className="egw-result-actions">
            <button type="button" className="egw-btn" onClick={() => setMode('pick')}>Back</button>
            <button type="button" className="egw-btn egw-btn-gold" data-testid="egw-local-start"
              onClick={() => navigate('/egyptian/local')}>Deal the cards</button>
          </div>
        </section>
      )}
      <button type="button" className="egw-link" onClick={() => navigate('/egyptian/deck')}>See the whole deck</button>
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
      {howto && <HowTo onClose={() => setHowto(false)} />}
    </main>
  );
}
