import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { HEROES, HERO_NAME, KingdomGame, chooseKingdomAction, type Action, type KBotLevel, type KView, type Length } from '@boboland/shared/src/kingdom';
import type { BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { KgScreen } from './Screen';
import { HeroPortrait } from './art/portraits';
import { Scene } from './art/scene';
import { HERO_COLOR, heroName } from './text';
import { botMs, ms } from './fx';
import { KIND_LABEL, encodeCfg, lastCfg, readCfg, rememberCfg, type LocalCfg, type SeatKind } from './setup';
import { kgSound } from './sound';

/** /kingdom/local and /kingdom/bot: the setup page first; with ?s= the match itself. */
export function KgLocal({ mode }: { mode: 'bot' | 'local' }) {
  const [cfg, setCfg] = useState(() => readCfg(window.location.search));
  const [n, setN] = useState(0);
  if (!cfg) return <SetupPage mode={mode} onStart={setCfg} />;
  return <Match key={n} cfg={cfg} onAgain={() => setN((x) => x + 1)} />;
}

const BOT_NAMES: Record<KBotLevel, string> = { easy: 'Page', medium: 'Squire', hard: 'Sage' };

function SetupPage({ mode, onStart }: { mode: 'bot' | 'local'; onStart: (c: LocalCfg) => void }) {
  const party = usePartyState();
  const [cfg, setCfg] = useState<LocalCfg>(() => lastCfg(mode, party.name || undefined));
  const upd = (f: (c: LocalCfg) => LocalCfg) => setCfg((c) => f(structuredClone(c)));
  const freeHero = (c: LocalCfg) => [...HEROES.keys()].find((h) => !c.seats.some((s) => s.hero === h)) ?? 0;
  const start = () => { rememberCfg(mode, cfg); navigate(`/kingdom/${mode}?s=${encodeCfg(cfg)}`); onStart(readCfg(`?s=${encodeCfg(cfg)}`) ?? cfg); kgSound('page'); };
  const humans = cfg.seats.filter((s) => s.kind === 'human').length;
  return (
    <div className="kingdom kg-page kg-setup" data-testid="kg-setup">
      <Scene phase="morning" />
      <div className="kg-book kg-book-open">
        <section className="kg-leaf kg-leaf-l">
          <button type="button" className="kg-btn kg-btn-ghost kg-back" onClick={() => navigate('/kingdom')}>‹ Back</button>
          <h1 className="kg-dropcap">{mode === 'bot' ? 'Play against the computer' : 'Pass and play'}</h1>
          <p className="kg-lede">{mode === 'bot' ? 'Choose your hero and who you will race through the shifting maze.' : 'Share one screen. A storybook closes between turns so nobody peeks at another hero’s treasure.'}</p>
          <ol className="kg-setup-seats">
            {cfg.seats.map((s, i) => (
              <li key={i} className="kg-setup-seat" style={{ ['--pc' as string]: HERO_COLOR[s.hero] } as CSSProperties} data-testid={`kg-setup-seat-${i}`}>
                <span className="kg-seat-face"><HeroPortrait hero={s.hero} /></span>
                <div className="kg-setup-body">
                  <div className="kg-seat-line">
                    <input value={s.name} maxLength={20} aria-label={`Seat ${i + 1} name`} onChange={(e) => upd((c) => { c.seats[i].name = e.target.value; return c; })} />
                    <select value={s.kind} aria-label={`Seat ${i + 1} player`} onChange={(e) => upd((c) => {
                      const k = e.target.value as SeatKind;
                      if (k !== 'human' && (c.seats[i].kind === 'human' || Object.values(BOT_NAMES).some((b) => c.seats[i].name.startsWith(b)))) c.seats[i].name = BOT_NAMES[k];
                      c.seats[i].kind = k; if (k !== 'human') c.seats[i].young = false; return c;
                    })} disabled={i === 0 && mode === 'bot'}>
                      {(['human', 'easy', 'medium', 'hard'] as SeatKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                    </select>
                    {cfg.seats.length > 2 && <button type="button" className="kg-x" aria-label="Remove seat" onClick={() => upd((c) => { c.seats.splice(i, 1); return c; })}>×</button>}
                  </div>
                  <span className="kg-heroes kg-heroes-sm" role="group" aria-label={`Seat ${i + 1} hero`}>
                    {HEROES.map((id, k) => (
                      <button key={id} type="button" aria-pressed={s.hero === k} disabled={cfg.seats.some((o, j) => j !== i && o.hero === k)} title={HERO_NAME[id]} style={{ ['--pc' as string]: HERO_COLOR[k] } as CSSProperties}
                        onClick={() => upd((c) => { c.seats[i].hero = k; return c; })}><HeroPortrait hero={k} /><span>{HERO_NAME[id]}</span></button>
                    ))}
                  </span>
                  {s.kind === 'human' && <label className="kg-young"><input type="checkbox" checked={s.young} onChange={(e) => upd((c) => { c.seats[i].young = e.target.checked; return c; })} /> ★ Young Adventurer</label>}
                </div>
              </li>
            ))}
          </ol>
          {cfg.seats.length < 4 && (
            <button type="button" className="kg-btn kg-btn-sm" data-testid="kg-add-seat" onClick={() => upd((c) => {
              const kind: SeatKind = mode === 'bot' ? 'easy' : 'human';
              c.seats.push({ kind, name: kind === 'human' ? `Player ${c.seats.length + 1}` : BOT_NAMES.easy, hero: freeHero(c), young: false });
              return c;
            })}>+ Add a hero</button>
          )}
        </section>
        <section className="kg-leaf kg-leaf-r">
          <h2>The tale</h2>
          <div className="kg-seg kg-seg-big" role="radiogroup" aria-label="Game length">
            {(['short', 'medium', 'full'] as Length[]).map((l) => (
              <button key={l} type="button" role="radio" aria-checked={cfg.length === l} onClick={() => upd((c) => { c.length = l; return c; })} data-testid={`kg-length-${l}`}>
                <b>{l === 'short' ? 'Short' : l === 'medium' ? 'Medium' : 'Full'}</b><small>{l === 'short' ? '3 treasures each' : l === 'medium' ? '5 treasures each' : `${Math.floor(24 / cfg.seats.length)} each (all 24)`}</small>
              </button>
            ))}
          </div>
          <label className="kg-row"><span><b>Hints</b> <small>“Where is it?” and “Suggest a push”</small></span><input type="checkbox" checked={cfg.hints} onChange={(e) => upd((c) => { c.hints = e.target.checked; return c; })} /></label>
          <button type="button" className="kg-btn kg-btn-gold kg-btn-big" onClick={start} disabled={!humans} data-testid="kg-begin">Begin the adventure</button>
          {!humans && <p className="kg-err">At least one hero must be played by a person.</p>}
        </section>
      </div>
    </div>
  );
}

function Match({ cfg, onAgain }: { cfg: LocalCfg; onAgain: () => void }) {
  const clients = useMemo(() => {
    const data = { length: cfg.length, hints: cfg.hints, heroes: cfg.seats.map((s) => s.hero), young: cfg.seats.map((s) => s.young), bots: cfg.seats.map((s) => s.kind !== 'human') };
    const base = { ...KingdomGame }; // a fresh game object per match: Local() keeps one master per object
    const game = { ...base, setup: (ctx: Parameters<NonNullable<typeof KingdomGame.setup>>[0]) => base.setup!(ctx, data) };
    const multiplayer = Local();
    return cfg.seats.map((_, i) => Client({ game, numPlayers: cfg.seats.length, multiplayer, playerID: String(i), debug: false }) as unknown as BgioClient);
  }, [cfg]);
  const [, bump] = useState(0);
  useEffect(() => {
    clients.forEach((c) => c.start());
    const offs = clients.map((c) => c.subscribe(() => bump((x) => x + 1)));
    return () => { offs.forEach((o) => o()); clients.forEach((c) => c.stop()); };
  }, [clients]);
  const viewOf = (i: number) => (clients[i].getState() as { G: KView } | null)?.G ?? null;
  const v0 = viewOf(0);
  const humans = cfg.seats.map((s, i) => (s.kind === 'human' ? String(i) : null)).filter((x): x is string => x !== null);
  const many = humans.length > 1;
  const cur = v0?.current ?? '0';
  const [shown, setShown] = useState(() => (v0 && humans.includes(v0.current) ? v0.current : humans[0]));
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(many ? '' : humans[0]);
  // keep the mover's screen up until their move has played, then hand the book to the next human
  useEffect(() => {
    if (busy || !v0 || v0.result || !humans.includes(cur) || cur === shown || v0.out.includes(cur)) return;
    setShown(cur);
  }, [busy, cur, v0?.logTotal]); // eslint-disable-line react-hooks/exhaustive-deps
  const curtain = many && !v0?.result && opened !== shown;

  // computer players act from their own view once the last events have played
  const lastN = useRef(v0?.logTotal ?? 0);
  const stamp = (clients[0].getState() as { _stateID?: number } | null)?._stateID;
  useEffect(() => {
    const v = viewOf(Number(cur));
    if (!v || v.result || cfg.seats[Number(cur)].kind === 'human') return;
    const played = v.log.filter((e) => e.n > lastN.current);
    lastN.current = v.logTotal;
    const t = setTimeout(() => {
      const now = viewOf(Number(cur));
      if (!now || now.result || now.current !== cur) return;
      clients[Number(cur)].moves.act(chooseKingdomAction(now, cur, cfg.seats[Number(cur)].kind as KBotLevel, Math.random));
    }, botMs(played, played.some((e) => e.k === 'turn')) + (curtain ? ms('curtain') : 0));
    return () => clearTimeout(t);
  }, [stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const view = viewOf(Number(shown));
  if (!view) return null;
  const names = Object.fromEntries(cfg.seats.map((s, i) => [String(i), s.name]));
  const c = clients[Number(shown)];
  return (
    <>
      <KgScreen view={view} me={shown} names={names} kind={many ? 'local' : 'bot'} onBusy={setBusy}
        send={(a: Action) => c.moves.act(a)} resign={() => c.moves.resign()} onExit={() => navigate('/kingdom')}
        again={{ label: 'Play again', onClick: onAgain }} />
      {curtain && <Curtain name={names[shown]} hero={view.heroes[Number(shown)]} onOpen={() => { setOpened(shown); kgSound('page'); }} />}
    </>
  );
}

/** Pass and play: a storybook closes over the board and names the next hero. */
export function Curtain({ name, hero, onOpen }: { name: string; hero: number; onOpen: () => void }) {
  return (
    <div className="kingdom kg-curtain" role="dialog" aria-label={`${name}, your turn`} style={{ ['--pc' as string]: HERO_COLOR[hero] } as CSSProperties} data-testid="kg-curtain">
      <div className="kg-closed-book">
        <div className="kg-cover">
          <span className="kg-cover-corner" /><span className="kg-cover-corner" /><span className="kg-cover-corner" /><span className="kg-cover-corner" />
          <span className="kg-curtain-face"><HeroPortrait hero={hero} /></span>
          <small>The next page belongs to</small>
          <h2>{name}</h2>
          <p>the {heroName({ heroes: [hero] }, '0')}. Everyone else, no peeking!</p>
          <button type="button" className="kg-btn kg-btn-gold kg-btn-big" onClick={onOpen} data-testid="kg-open-book" autoFocus>Open the book</button>
        </div>
      </div>
    </div>
  );
}
