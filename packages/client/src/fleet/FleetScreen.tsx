import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fleetFor, other, type BotLevel, type FleetView, type Mode, type PlayerID, type WeaponId } from '@boboland/shared/src/fleet';
import type { ChatLine } from '../lib/chat';
import { ChatPanel, type ChatProps } from '../game/ChatPanel';
import { load, save } from '../lib/storage';
import type { FleetControls } from './controls';
import { LoadoutPicker } from './LoadoutPicker';
import { Placement } from './Placement';
import { loadProgress } from './progress';
import { btn } from './ui';
import { Battle } from './Battle';
import { RoundResult } from './RoundResult';
import { FX_SETTINGS, setFx, useFx } from './fx';
import { throughDoors } from './Doors';
import { MusicButton, VolumeSlider } from '../lib/AudioButtons';
import { PartyButton } from '../components/Party';
import './screen.css';
import './battle.css';

/** Where a match is played: decides progression (vs Computer and online only) and the pass-and-play curtain. */
export type FleetKind = 'online' | 'bot' | 'local' | 'watch';

export interface FleetScreenProps {
  view: FleetView;
  /** the seat this screen is for (a spectator watches from seat 0, with nothing secret) */
  me: PlayerID;
  spectator?: boolean;
  kind: FleetKind;
  botLevel?: BotLevel;
  /** Super Weapons: every weapon may be picked regardless of unlocks */
  allUnlocked?: boolean;
  controls: FleetControls;
  names: Record<string, string>;
  notice?: ReactNode;
  invite?: ReactNode;
  chat?: ChatProps;
  chatLines?: ChatLine[];
  onExit: () => void;
  rematch?: { waiting?: boolean; onClick: () => void };
  /** last report already shown on this seat's screen (pass and play hands over between seats) */
  revealFrom?: number;
  /** results are landing (busy) or all shown */
  onReveal?: (busy: boolean, seq: number) => void;
  /** identifies the match for progression (credited once per device) */
  matchKey?: string;
  /** pass and play: the screen is hidden behind the curtain */
  curtainUp?: boolean;
}

export const MODE_NAME: Record<Mode, string> = { classic: 'Classic', salvo: 'Salvo', super: 'Super Weapons' };

/** The Fleet game screen: top bar, then placement, battle or the round/match result. */
export function FleetScreen(props: FleetScreenProps) {
  const { view, me, spectator, names, notice, invite, chat, chatLines, onExit, controls } = props;
  const nameOf = (p: PlayerID) => names[p] || (p === '0' ? 'Player 1' : 'Player 2');
  const you = spectator ? nameOf('0') : nameOf(me);
  const them = spectator ? nameOf('1') : nameOf(other(me));
  const placing = view.stage === 'placement';
  const [leaving, setLeaving] = useState(false);
  const leave = () => {
    if (!spectator && !view.result && props.kind !== 'watch') setLeaving(true);
    else onExit();
  };
  return (
    <main className="fleet fleet-game" data-testid="fleet-screen" data-stage={view.stage}>
      <header className="fleet-bar">
        <span className="fleet-bar-mark"><span className="dot" aria-hidden />Fleet</span>
        <span className="fleet-bar-match">
          <span>{MODE_NAME[view.mode]}</span>
          {view.bestOf > 1 && <span className="fleet-mono" data-testid="fleet-score">Round {view.round}: {you} {view.wins[spectator ? '0' : me]} – {view.wins[spectator ? '1' : other(me)]} {them}</span>}
        </span>
        <span className="fleet-bar-tools">
          <span className="fleet-audio"><VolumeSlider /><MusicButton /></span>
          <FxButton />
          <PartyButton inline />
          <button type="button" className={`${btn} fleet-bar-leave`} onClick={leave} data-testid="fleet-exit">Leave</button>
        </span>
      </header>
      {leaving && (
        <div className="fleet-confirm" role="alertdialog" aria-label="Leave the game?">
          <p>Leave the game? That counts as resigning the match.</p>
          <div className="flex gap-2">
            <button type="button" className={`${btn} danger`} data-testid="fleet-leave-yes" onClick={() => { controls.resign(); onExit(); }}>Resign and leave</button>
            <button type="button" className={btn} onClick={() => setLeaving(false)}>Stay</button>
          </div>
        </div>
      )}
      {invite && <div className={`fleet-comms-top ${placing ? 'narrow' : ''}`}>{invite}</div>}
      <div className="fleet-stage">
        {view.stage === 'placement' && <PlacementStage {...props} them={them} />}
        {view.stage !== 'placement' && <BattleOrResult {...props} nameOf={nameOf} />}
      </div>
      <div className={`fleet-comms ${placing ? 'narrow' : ''}`}>
        {notice && <div className="fleet-notes">{notice}</div>}
        {chat && !spectator && (
          <section className="fleet-plate quiet fleet-chat">
            <ChatPanel {...chat} me={me} names={{ 0: nameOf('0'), 1: nameOf('1') }} fills={{ 0: '#5fd4ff', 1: '#ff4655' }} />
          </section>
        )}
        {spectator && chatLines && chatLines.length > 0 && (
          <section className="fleet-plate quiet fleet-chat">
            <span className="fleet-station">Comms</span>
            <ul className="mt-2 grid gap-1 text-[13px] opacity-85">{chatLines.slice(-30).map((l) => <li key={l.id}><b>{nameOf(l.sender as PlayerID)}:</b> {l.kind === 'emote' ? (l.label ?? l.text) : l.text}</li>)}</ul>
          </section>
        )}
      </div>
    </main>
  );
}

const LOADOUT_KEY = 'fleet.loadout';

function PlacementStage({ view, me, spectator, kind, allUnlocked, controls, them }: FleetScreenProps & { them: string }) {
  if (spectator) return <Waiting text="Both admirals are placing their fleets." />;
  const mine = view.sides[me];
  if (mine.deployed) {
    const ready = view.sides[other(me)].deployed;
    return (
      <Waiting text={ready ? 'Both fleets are in position.' : `Fleet in position. Waiting for ${them}…`}>
        <button type="button" className={btn} data-testid="fleet-undeploy" onClick={() => controls.undeploy()}>Move my ships</button>
      </Waiting>
    );
  }
  return <Deploy key={`${view.round}-${me}`} mode={view.mode} allUnlocked /* every weapon is always unlocked, for everyone */ onDeploy={controls.deploy} />;
}

/** Super Weapons: the loadout first, then the placement. Other modes go straight to placement. */
function Deploy({ mode, allUnlocked, onDeploy }: { mode: Mode; allUnlocked: boolean; onDeploy: FleetControls['deploy'] }) {
  const progress = useMemo(loadProgress, []);
  const [loadout, setLoadout] = useState<WeaponId[] | null>(mode === 'super' ? null : []);
  if (loadout === null) {
    return (
      <LoadoutPicker progress={progress} allUnlocked={allUnlocked} initial={load<WeaponId[]>(LOADOUT_KEY, [])}
        onConfirm={(lo) => { save(LOADOUT_KEY, lo); throughDoors('Deploying', 'Weapons loaded. Place your fleet', () => setLoadout(lo)); }} />
    );
  }
  return (
    <Placement heading="Place your fleet" classes={fleetFor(mode, loadout)} loadout={loadout}
      onReady={(d) => throughDoors('Battle stations', 'Fleet in position', () => onDeploy(d))}
      onChangeWeapons={mode === 'super' ? () => setLoadout(null) : undefined} />
  );
}

function Waiting({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <section className="fleet-plate fleet-waiting" data-testid="fleet-waiting">
      <span className="fleet-station">Standing by</span>
      <p>{text}</p>
      {children}
    </section>
  );
}

/** The battle, then (once its last results have landed) the round or match result. */
function BattleOrResult(props: FleetScreenProps & { nameOf: (p: PlayerID) => string }) {
  const { view, me, spectator, controls, nameOf, revealFrom, onReveal, curtainUp } = props;
  const [landed, setLanded] = useState(false);
  useEffect(() => { if (view.stage === 'battle') setLanded(false); }, [view.stage, view.round]);
  if (view.stage === 'battle' || !landed) {
    return (
      <Battle key={`${view.round}-${me}`} view={view} me={me} spectator={spectator} controls={controls} nameOf={nameOf} revealFrom={revealFrom} curtainUp={curtainUp}
        onBusy={(busy, seq) => {
          onReveal?.(busy, seq);
          if (!busy && view.stage !== 'battle') setLanded(true);
        }} />
    );
  }
  return (
    <RoundResult view={view} me={me} spectator={spectator} kind={props.kind} botLevel={props.botLevel} nameOf={nameOf} controls={controls}
      rematch={props.rematch} onExit={props.onExit} matchKey={props.matchKey} />
  );
}

const FX_LABEL = { full: 'Full', fast: 'Fast', off: 'Off' } as const;

/** Cinematics: Full, Fast or Off (cycles). */
function FxButton() {
  const fx = useFx();
  const next = FX_SETTINGS[(FX_SETTINGS.indexOf(fx) + 1) % FX_SETTINGS.length];
  return (
    <button type="button" className="fleet-fx-btn" onClick={() => setFx(next)} data-testid="fleet-fx" aria-label={`Cinematics: ${FX_LABEL[fx]}. Switch to ${FX_LABEL[next]}`}>
      <span className="fleet-sub">Cinematics</span> <span className="fleet-mono">{FX_LABEL[fx]}</span>
    </button>
  );
}
