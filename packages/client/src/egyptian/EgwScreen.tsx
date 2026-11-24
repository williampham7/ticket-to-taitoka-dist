/**
 * The Egyptian War game screen for every mode: pass and play (two players, one keyboard, P1 left / P2 right),
 * online (my seat at the bottom) and spectators. It drives the server's timed events (useTimers), sends `ready`,
 * maps keys to moves, and announces events for screen readers.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { EgwEvent, EgwView, PlayerID } from '@boboland/shared/src/egyptian';
import { ChatPanel, type ChatProps } from '../game/ChatPanel';
import { useTimers, type EgwControls } from './controls';
import { useFx } from './fx';
import { actionFor, keyLabel, type KeyAction } from './keys';
import { capturing, SettingsDialog, useKeys } from './KeySettings';
import { Legend } from './Legend';
import { Result, type Again } from './Result';
import { describeEvent, seatBadges, statusLine, type Names } from './screenLogic';
import { Table } from './table/Table';
import { useServerNow, useTableFx } from './table/useTableFx';
import { HandArt } from './table/art';
import { CardView } from './CardView';
import { egwSoundFor } from './sound';
import './table/table.css';
import './screen.css';

export type EgwMode = 'local' | 'online' | 'watch';

export interface EgwScreenProps {
  view: EgwView;
  /** my seat online; null for pass and play and spectators */
  me: PlayerID | null;
  mode: EgwMode;
  names: Names;
  colors: Record<PlayerID, string>;
  /** local: [seat 0, seat 1]; online: [mine]; watch: [] */
  controls: EgwControls[];
  chat?: ChatProps;
  notice?: ReactNode;
  again?: Again;
  onExit: () => void;
  /** online: the link a spectator opens */
  watchUrl?: string;
}

export function EgwScreen({ view, me, mode, names, colors, controls, chat, notice, again, onExit, watchUrl }: EgwScreenProps) {
  const fx = useFx();
  const now = useServerNow(view);
  const [announce, setAnnounce] = useState('');
  const onEvent = useCallback((e: EgwEvent) => {
    egwSoundFor(e, me);
    const line = describeEvent(e, names);
    if (line) setAnnounce(line);
  }, [names, me]);
  const effects = useTableFx(view, fx, onEvent);
  const [settings, setSettings] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const keys = useKeys();
  const local = mode === 'local';
  const seated = mode === 'online' && me !== null;
  const driver = controls[0];

  // the deal waits until every seat has said it is here
  useEffect(() => {
    if (view.stage !== 'ready') return;
    if (local) controls.forEach((c) => c.ready());
    else if (seated && !view.ready[me!]) driver.ready();
  }, [view.stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const tick = useCallback(() => driver?.tick(), [driver]);
  useTimers(view, tick, (local || seated) && !view.result && view.stage !== 'waiting', seated ? Number(me) * 140 : 0);

  // keys: the latest view's round goes with every slap
  const round = useRef(view.round);
  round.current = view.round;
  const act = useCallback((a: KeyAction) => {
    const seat = a === 'p2Flip' || a === 'p2Slap' ? controls[1] : controls[0];
    if (!seat) return;
    if (a === 'p1Flip' || a === 'p2Flip' || a === 'flip') seat.flip();
    else seat.slap(round.current);
  }, [controls]);
  useEffect(() => {
    if (mode === 'watch' || settings || leaving) return;
    const onKey = (e: KeyboardEvent) => {
      if (capturing) return;
      const a = actionFor(keys, local ? 'local' : 'online', e);
      if (!a) return;
      e.preventDefault();
      act(a);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, local, mode, settings, leaving, act]);

  const playing = view.stage === 'play' && !view.result;
  const canFlip = (p: PlayerID) => playing && view.turn === p && !view.timer;
  const ctl = (p: PlayerID, flipKey: KeyAction, slapKey: KeyAction, side?: 'left' | 'right') => {
    const b = seatBadges(view, p, now());
    return (
      <div className={`egw-ctl ${side ? `side-${side}` : ''}`} style={{ '--seat': colors[p] } as React.CSSProperties}>
        {side && <span className="egw-ctl-who">{names[p]}</span>}
        <button type="button" className={`egw-act egw-act-flip ${canFlip(p) ? 'is-ready' : ''}`} disabled={!canFlip(p)} data-testid={`egw-flip-${p}`}
          onClick={() => act(flipKey)}>
          <span className="egw-act-icon" aria-hidden><CardView back width={22} /></span>
          <span className="egw-act-label">Flip</span>
          <span className="egw-key">{keyLabel(keys[flipKey])}</span>
        </button>
        <button type="button" className="egw-act egw-act-slap" disabled={!playing || b.left || b.spent} data-testid={`egw-slap-${p}`}
          onClick={() => act(slapKey)}>
          <span className="egw-act-icon" aria-hidden><HandArt ok /></span>
          <span className="egw-act-label">Slap</span>
          <span className="egw-key">{keyLabel(keys[slapKey])}</span>
        </button>
      </div>
    );
  };

  const leave = () => {
    if (view.result || mode !== 'online') return onExit();
    setLeaving(true);
  };

  return (
    <main className={`egw egw-game is-${mode}`} data-testid="egw-game" data-stage={view.stage} data-round={view.round}>
      <header className="egw-bar">
        <div className="egw-brand"><span className="egw-display">Egyptian War</span><span className="egw-round">Round {view.round}</span></div>
        <div className="egw-bar-actions">
          {mode === 'watch' && <span className="egw-tag gold">Watching</span>}
          <button type="button" className="egw-btn egw-btn-ghost" onClick={() => setSettings(true)} data-testid="egw-settings">Settings</button>
          <button type="button" className="egw-btn" onClick={leave} data-testid="egw-leave">{mode === 'online' && !view.result ? 'Leave' : 'Menu'}</button>
        </div>
      </header>

      <div className={`egw-stage ${local ? 'is-local' : ''}`}>
        {local && ctl('0', 'p1Flip', 'p1Slap', 'left')}
        <div className="egw-center">
          {notice}
          <Table view={view} me={me} local={local} names={names} colors={colors} fx={fx} effects={effects} now={now} />
          <p className="egw-status" data-testid="egw-status">{statusLine(view, names)}</p>
          {seated && ctl(me!, 'flip', 'slap')}
          {local && <Legend rules={view.rules} compact />}
        </div>
        {local && ctl('1', 'p2Flip', 'p2Slap', 'right')}
        {!local && (
          <aside className="egw-side">
            <Legend rules={view.rules} />
            {watchUrl && (
              <section className="egw-watch-link" data-testid="egw-watch-link">
                <span className="egw-eyebrow">Spectators</span>
                <button type="button" className="egw-btn egw-btn-ghost" onClick={() => navigator.clipboard?.writeText(watchUrl)} title={watchUrl}>Copy watch link</button>
              </section>
            )}
            {chat && seated && (
              <section className="egw-panel egw-chat"><ChatPanel {...chat} me={me!} names={names} fills={colors} /></section>
            )}
          </aside>
        )}
      </div>

      <p className="sr-only" aria-live="polite" data-testid="egw-announce">{announce}</p>
      {view.result && <Result view={view} names={names} colors={colors} me={me} again={again} onExit={onExit} />}
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
      {leaving && (
        <div className="egw-modal" role="alertdialog" aria-label="Leave the game?">
          <div className="egw-panel egw-confirm">
            <h2 className="egw-display">Leave the game?</h2>
            <p className="egw-sub">Your cards go under the pile and you are out for good.</p>
            <div className="egw-result-actions">
              <button type="button" className="egw-btn egw-btn-danger" data-testid="egw-leave-yes" onClick={() => { driver?.leave(); onExit(); }}>Leave</button>
              <button type="button" className="egw-btn" onClick={() => setLeaving(false)}>Stay</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
