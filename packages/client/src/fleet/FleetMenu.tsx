import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BestOf, BotLevel, Mode } from '@boboland/shared/src/fleet';
import { navigate } from '../lib/router';
import { load, save } from '../lib/storage';
import { MusicButton, VolumeSlider } from '../lib/AudioButtons';
import { PartyButton } from '../components/Party';
import { playPath, type MenuChoice, type PlayType } from './setup';
import { loadProgress, rankFor } from './progress';
import { ChartBackdrop, Legend, PLATE_ART, TaskForce } from './menuArt';
import { throughDoors } from './Doors';
import { btn } from './ui';

const SAVED = 'fleet.menu';
const DEFAULT: MenuChoice = { play: 'bot', mode: 'classic', bestOf: 1, level: 'medium', allUnlocked: false };

const PLAYS: { id: PlayType; name: string; line: string }[] = [
  { id: 'local', name: 'Pass and play', line: 'Two admirals, one screen' },
  { id: 'bot', name: 'vs Computer', line: 'Easy, Medium or Hard' },
  { id: 'online', name: 'Online', line: 'Send your opponent a link' },
];
const MODES: { id: Mode; name: string; line: string }[] = [
  { id: 'classic', name: 'Classic', line: 'One shell a turn' },
  { id: 'salvo', name: 'Salvo', line: 'A shell for every ship you have afloat' },
  { id: 'super', name: 'Super Weapons', line: 'Shells plus three special weapons' },
];
const LENGTHS: { id: BestOf; name: string }[] = [{ id: 1, name: 'Single' }, { id: 3, name: 'Best of 3' }, { id: 5, name: 'Best of 5' }];
const LEVELS: { id: BotLevel; name: string }[] = [{ id: 'easy', name: 'Easy' }, { id: 'medium', name: 'Medium' }, { id: 'hard', name: 'Hard' }];
const PLAY_LABEL: Record<PlayType, string> = { local: 'Pass and play', bot: 'vs Computer', online: 'Online' };
const MODE_LABEL: Record<Mode, string> = { classic: 'Classic', salvo: 'Salvo', super: 'Super Weapons' };

/** A step of the orders: three selector plates, each with a diagram of what it means. */
function Plates<T extends string>({ n, title, name, options, value, onChange }: {
  n: number; title: string; name: string; value: T; onChange: (v: T) => void; options: { id: T; name: string; line: string }[];
}) {
  return (
    <fieldset className="fleet-step">
      <legend><span className="fleet-step-n" aria-hidden>{n}</span>{title}</legend>
      <div className="fleet-plates" role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <label key={o.id} className={`fleet-sel ${value === o.id ? 'on' : ''}`} data-testid={`fleet-${name}-${o.id}`}>
            <input type="radio" name={name} checked={value === o.id} onChange={() => onChange(o.id)} />
            <span className="lamp" aria-hidden />
            <span className="fleet-sel-art">{PLATE_ART[o.id]}</span>
            <span className="fleet-sel-name">{o.name}</span>
            <span className="fleet-sel-line">{o.line}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A segmented switch. Disabled options keep their place, so the rows below never move. */
function Seg<T extends string | number>({ name, title, options, value, onChange, disabled }: {
  name: string; title: string; options: { id: T; name: string }[]; value: T; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className="fleet-seg" role="radiogroup" aria-label={title}>
      {options.map((o) => (
        <label key={String(o.id)} className={`fleet-seg-opt ${!disabled && value === o.id ? 'on' : ''}`} data-testid={`fleet-${name}-${o.id}`}>
          <input type="radio" name={name} checked={value === o.id} disabled={disabled} onChange={() => onChange(o.id)} />
          {o.name}
        </label>
      ))}
    </div>
  );
}

const Param = ({ name, off, children }: { name: string; off?: boolean; children: ReactNode }) => (
  <div className={`fleet-param ${off ? 'off' : ''}`}><span className="name">{name}</span><div className="min-w-0">{children}</div></div>
);

/** Ship's time in Zulu, ticking. */
function useZulu() {
  const fmt = () => { const d = new Date(); return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}Z`; };
  const [t, setT] = useState(fmt);
  useEffect(() => { const id = window.setInterval(() => setT(fmt()), 1000); return () => window.clearInterval(id); }, []);
  return t;
}

/** /fleet: the operations chart table. Pick the opponent, the rules and the orders, then start. */
export function FleetMenu() {
  const [c, setC] = useState<MenuChoice>(() => ({ ...DEFAULT, ...load<Partial<MenuChoice>>(SAVED, {}) }));
  const rank = useMemo(() => { const p = loadProgress(); return { ...rankFor(p.xp), xp: p.xp }; }, []);
  const zulu = useZulu();
  const set = (patch: Partial<MenuChoice>) => setC((prev) => {
    const next = { ...prev, ...patch };
    // pass and play starts with every weapon unlocked
    if (patch.play === 'local' && prev.play !== 'local') next.allUnlocked = true;
    return next;
  });
  const start = () => {
    save(SAVED, c);
    const vs = c.play === 'bot' ? `vs Computer (${c.level})` : PLAY_LABEL[c.play];
    throughDoors(c.play === 'online' ? 'Opening comms' : 'Battle stations', `${MODE_LABEL[c.mode]} // ${vs}`, () => navigate(playPath(c)));
  };
  const summary = [
    MODE_LABEL[c.mode],
    c.play === 'bot' ? `against the ${c.level} computer` : c.play === 'local' ? 'pass and play' : 'online',
    c.bestOf === 1 ? 'one game' : `best of ${c.bestOf}`,
  ].join(', ');
  return (
    <main className="fleet fleet-menu" data-testid="fleet-menu">
      <ChartBackdrop />
      <header className="fleet-strip">
        <button type="button" className="fleet-back" onClick={() => navigate('/')}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
          All games
        </button>
        <span className="fleet-strip-mark"><span className="dot" aria-hidden />Fleet command</span>
        <span className="fleet-strip-read" aria-label="Status">
          <span><b>{zulu}</b></span>
          <span>{rank.name} <b>{rank.xp} XP</b></span>
        </span>
        <span className="fleet-strip-tools">
          <VolumeSlider />
          <MusicButton />
          <PartyButton inline />
        </span>
      </header>
      <div className="fleet-menu-body">
        <section className="fleet-menu-hero">
          <span className="fleet-hull-no">Naval warfare, 10 × 10</span>
          <div className="fleet-wordmark-wrap"><h1 className="fleet-wordmark">Fleet</h1></div>
          <TaskForce />
          <p className="fleet-menu-line">Two fleets hidden on two grids. Plot your shots, read the splashes, and sink theirs before they find yours.</p>
          <Legend />
        </section>
        <form className="fleet-plate fleet-orders" onSubmit={(e) => { e.preventDefault(); start(); }}>
          <div className="fleet-orders-head">
            <span className="fleet-station">Operation orders</span>
            <span className="fleet-mono">{rank.next ? `${rank.next.xp - rank.xp} XP to ${rank.next.name}` : 'Top rank'}</span>
          </div>
          <Plates n={1} title="Opponent" name="play" options={PLAYS} value={c.play} onChange={(play) => set({ play })} />
          <Plates n={2} title="Rules of engagement" name="mode" options={MODES} value={c.mode} onChange={(mode) => set({ mode })} />
          <fieldset className="fleet-step">
            <legend><span className="fleet-step-n" aria-hidden>3</span>Orders</legend>
            <div className="fleet-params">
              <Param name="Match"><Seg name="len" title="Match length" options={LENGTHS} value={c.bestOf} onChange={(bestOf) => set({ bestOf })} /></Param>
              <Param name="Computer" off={c.play !== 'bot'}>
                <Seg name="level" title="Difficulty" options={LEVELS} value={c.level} onChange={(level) => set({ level })} disabled={c.play !== 'bot'} />
              </Param>
              <Param name="Weapons" off={c.mode !== 'super'}>
                <label className="fleet-toggle" data-testid="fleet-all-unlocked">
                  <input type="checkbox" checked={c.mode === 'super' && c.allUnlocked} disabled={c.mode !== 'super'} onChange={(e) => set({ allUnlocked: e.target.checked })} />
                  <span className="fleet-toggle-track" aria-hidden><span /></span>
                  <span>{c.mode === 'super' ? 'Every weapon unlocked' : 'Super Weapons only'}</span>
                </label>
              </Param>
            </div>
          </fieldset>
          <p className="fleet-help" aria-live="polite">{summary[0].toUpperCase() + summary.slice(1)}.</p>
          <div className="fleet-orders-foot">
            <button type="submit" className="fleet-launch" data-testid="fleet-start">
              <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden><circle cx="15" cy="15" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M15 2 V9 M15 21 V28 M2 15 H9 M21 15 H28" stroke="currentColor" strokeWidth="2.5" /><circle cx="15" cy="15" r="3" fill="currentColor" /></svg>
              <span className="fleet-launch-label">{c.play === 'online' ? 'Create game' : 'Start game'}</span>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><path d="M6 3 L15 11 L6 19" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
            </button>
            <button type="button" className={btn} onClick={() => navigate('/')}>Back</button>
          </div>
        </form>
      </div>
    </main>
  );
}
