import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { BlockyGame, chooseBlockyAction, type Action, type BBotLevel, type BView, type Board } from '@boboland/shared/src/blocky';
import type { BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { BlyScreen } from './Screen';
import { Avatar } from './art/avatars';
import { Sky } from './art/sky';
import { AVATAR_NAME, BOT_TITLE } from './text';
import { botMs } from './fx';
import { curtainUp, nextShown } from './handoff';
import { KIND_LABEL, encodeCfg, lastCfg, readCfg, rememberCfg, type LocalCfg, type SeatKind } from './setup';
import { Curtain } from './Curtain';

/** /blocky/local and /blocky/bot: the setup page first; with ?s= the match itself. */
export function BlyLocal({ mode }: { mode: 'bot' | 'local' }) {
  const [cfg, setCfg] = useState(() => readCfg(window.location.search));
  const [n, setN] = useState(0);
  if (!cfg) return <SetupPage mode={mode} onStart={setCfg} />;
  return <Match key={n} cfg={cfg} onAgain={() => setN((x) => x + 1)} />;
}

function SetupPage({ mode, onStart }: { mode: 'bot' | 'local'; onStart: (c: LocalCfg) => void }) {
  const party = usePartyState();
  const [cfg, setCfg] = useState<LocalCfg>(() => lastCfg(mode, party.name || undefined));
  const upd = (f: (c: LocalCfg) => LocalCfg) => setCfg((c) => {
    const n = f(structuredClone(c));
    if (n.seats.length !== 2) n.board = 'classic';
    return n;
  });
  const freeAvatar = (c: LocalCfg) => [...AVATAR_NAME.keys()].find((h) => !c.seats.some((s) => s.avatar === h)) ?? 0;
  const start = () => { rememberCfg(mode, cfg); const q = `?s=${encodeCfg(cfg)}`; navigate(`/blocky/${mode}${q}`); onStart(readCfg(q) ?? cfg); };
  const humans = cfg.seats.filter((s) => s.kind === 'human').length;
  return (
    <div className="blocky bly-page bly-setup" data-testid="bly-setup">
      <Sky progress={0.36} />
      <section className="bly-setup-main bly-stone">
        <button type="button" className="bly-key bly-key-ghost bly-back" onClick={() => navigate('/blocky')}>‹ Back</button>
        <h1>{mode === 'bot' ? 'Play against the computer' : 'Pass and play'}</h1>
        <p className="bly-lede">{mode === 'bot' ? 'Choose your builder and who you will build against.' : 'Share one screen. A bank of clouds rolls in between builders.'}</p>
        <ol className="bly-setup-seats">
          {cfg.seats.map((s, i) => (
            <li key={i} className="bly-pennant" data-testid={`bly-setup-seat-${i}`}>
              <span className="bly-pennant-face"><Avatar id={s.avatar} size={56} /></span>
              <div className="bly-pennant-body">
                <div className="bly-pennant-line">
                  <input value={s.name} maxLength={20} aria-label={`Seat ${i + 1} name`} onChange={(e) => upd((c) => { c.seats[i].name = e.target.value; return c; })} />
                  <select value={s.kind} aria-label={`Seat ${i + 1} player`} data-testid={`bly-seat-${i}-kind`} onChange={(e) => upd((c) => {
                    const k = e.target.value as SeatKind;
                    if (k !== 'human' && (c.seats[i].kind === 'human' || Object.values(BOT_TITLE).some((b) => c.seats[i].name.startsWith(b)))) c.seats[i].name = BOT_TITLE[k];
                    c.seats[i].kind = k; return c;
                  })} disabled={i === 0 && mode === 'bot'}>
                    {(['human', 'easy', 'medium', 'hard'] as SeatKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                  </select>
                  {cfg.seats.length > 2 && <button type="button" className="bly-x" aria-label="Remove seat" onClick={() => upd((c) => { c.seats.splice(i, 1); return c; })}>×</button>}
                </div>
                <span className="bly-avatars bly-avatars-sm" role="group" aria-label={`Seat ${i + 1} builder`}>
                  {AVATAR_NAME.map((nm, k) => (
                    <button key={nm} type="button" aria-pressed={s.avatar === k} disabled={cfg.seats.some((o, j) => j !== i && o.avatar === k)} title={nm}
                      onClick={() => upd((c) => { c.seats[i].avatar = k; return c; })}><Avatar id={k} size={40} /><span>{nm}</span></button>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ol>
        {cfg.seats.length < 4 && (
          <button type="button" className="bly-key bly-key-sm" data-testid="bly-add-seat" onClick={() => upd((c) => {
            const kind: SeatKind = mode === 'bot' ? 'medium' : 'human';
            c.seats.push({ kind, name: kind === 'human' ? `Player ${c.seats.length + 1}` : BOT_TITLE.medium, avatar: freeAvatar(c) });
            return c;
          })}>+ Add a builder</button>
        )}
      </section>
      <aside className="bly-setup-side bly-plank">
        <h2>The isle</h2>
        <div className="bly-seg" role="radiogroup" aria-label="Board">
          {(['duo', 'classic'] as Board[]).map((b) => (
            <button key={b} type="button" role="radio" aria-checked={cfg.board === b} disabled={b === 'duo' && cfg.seats.length !== 2} onClick={() => upd((c) => { c.board = b; return c; })} data-testid={`bly-board-pick-${b}`}>
              <b>{b === 'duo' ? 'Duo' : 'Classic'}</b><small>{b === 'duo' ? '14×14 · one guild each' : '20×20 · four guilds'}</small>
            </button>
          ))}
        </div>
        <label className="bly-row"><span><b>Hints</b> <small>“Suggest a move” and corner warnings</small></span><input type="checkbox" checked={cfg.hints} onChange={(e) => upd((c) => { c.hints = e.target.checked; return c; })} data-testid="bly-hints" /></label>
        <button type="button" className="bly-key bly-key-go bly-key-big" onClick={start} disabled={!humans} data-testid="bly-setup-start">Start building</button>
        {!humans && <p className="bly-err">At least one builder must be a person.</p>}
      </aside>
    </div>
  );
}

function Match({ cfg, onAgain }: { cfg: LocalCfg; onAgain: () => void }) {
  const clients = useMemo(() => {
    const data = { board: cfg.board, hints: cfg.hints, avatars: cfg.seats.map((s) => s.avatar), bots: cfg.seats.map((s) => s.kind !== 'human') };
    const base = { ...BlockyGame }; // a fresh game object per match: Local() keeps one master per object
    const game = { ...base, setup: (ctx: Parameters<NonNullable<typeof BlockyGame.setup>>[0]) => base.setup!(ctx, data) };
    const multiplayer = Local();
    return cfg.seats.map((_, i) => Client({ game, numPlayers: cfg.seats.length, multiplayer, playerID: String(i), debug: false }) as unknown as BgioClient);
  }, [cfg]);
  const [, bump] = useState(0);
  useEffect(() => {
    clients.forEach((c) => c.start());
    const offs = clients.map((c) => c.subscribe(() => bump((x) => x + 1)));
    return () => { offs.forEach((o) => o()); clients.forEach((c) => c.stop()); };
  }, [clients]);
  const viewOf = (i: number) => (clients[i].getState() as { G: BView } | null)?.G ?? null;
  const v0 = viewOf(0);
  const humans = cfg.seats.map((s, i) => (s.kind === 'human' ? String(i) : null)).filter((x): x is string => x !== null);
  const many = humans.length > 1;
  const actor = v0?.actor ?? '0';
  const [shown, setShown] = useState(() => (v0 && humans.includes(v0.actor) ? v0.actor : humans[0]));
  const [busy, setBusy] = useState(false);
  const [opened, setOpened] = useState(many ? '' : humans[0]);
  // keep the mover's screen up until their move has played, then hand over to the next human
  useEffect(() => {
    if (busy || !v0 || v0.result) return;
    setShown((s) => nextShown(s, actor, humans, v0.out));
  }, [busy, actor, v0?.logTotal]); // eslint-disable-line react-hooks/exhaustive-deps
  const curtain = curtainUp(many, !!v0?.result, opened, shown);

  // computer seats act from their own view once the last events have played
  const lastN = useRef(v0?.logTotal ?? 0);
  const stamp = (clients[0].getState() as { _stateID?: number } | null)?._stateID;
  useEffect(() => {
    const v = viewOf(Number(actor));
    if (!v || v.result || cfg.seats[Number(actor)].kind === 'human') return;
    const played = v.log.filter((e) => e.n > lastN.current);
    lastN.current = v.logTotal;
    const t = setTimeout(() => {
      const now = viewOf(Number(actor));
      if (!now || now.result || now.actor !== actor) return;
      clients[Number(actor)].moves.act(chooseBlockyAction(now, actor, cfg.seats[Number(actor)].kind as BBotLevel, Math.random));
    }, botMs(played, played.some((e) => e.k === 'turn' || e.k === 'start')));
    return () => clearTimeout(t);
  }, [stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const view = viewOf(Number(shown));
  if (!view) return null;
  const names = Object.fromEntries(cfg.seats.map((s, i) => [String(i), s.name]));
  const c = clients[Number(shown)];
  return (
    <>
      <BlyScreen view={view} me={shown} names={names} kind={many ? 'local' : 'bot'} onBusy={setBusy}
        send={(a: Action) => c.moves.act(a)} resign={() => c.moves.resign()} onExit={() => navigate('/blocky')}
        again={{ label: 'Play again', onClick: onAgain }} />
      {curtain && <Curtain view={view} seat={shown} name={names[shown]} onOpen={() => setOpened(shown)} />}
    </>
  );
}
