import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { WarfrontGame, chooseWarAction, type Action, type WarBotLevel } from '@boboland/shared/src/warfront';
import type { BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { WarScreen, type WarClientView } from './WarScreen';
import { botMs, ms } from './fx';
import { lastCfg, readCfg, type LocalCfg } from './setup';
import { factionOf } from './factions';

/** vs Computer and pass and play: a Local() master with one client per seat; computer seats act from their own view. */
export function WarLocal() {
  const cfg = useMemo(() => readCfg(window.location.search) ?? lastCfg(), []);
  const [n, setN] = useState(0);
  return <Match key={n} cfg={cfg} onAgain={() => setN((x) => x + 1)} />;
}

function Match({ cfg, onAgain }: { cfg: LocalCfg; onAgain: () => void }) {
  const clients = useMemo(() => {
    const data = { mode: cfg.mode, autoDeploy: cfg.autoDeploy, factions: cfg.seats.map((s) => s.faction) };
    const game = { ...WarfrontGame, setup: (ctx: Parameters<NonNullable<typeof WarfrontGame.setup>>[0]) => WarfrontGame.setup!(ctx, data) };
    const multiplayer = Local();
    return cfg.seats.map((_, i) => Client({ game, numPlayers: cfg.seats.length, multiplayer, playerID: String(i), debug: false }) as unknown as BgioClient);
  }, [cfg]);
  const [, bump] = useState(0);
  useEffect(() => {
    clients.forEach((c) => c.start());
    const offs = clients.map((c) => c.subscribe(() => bump((x) => x + 1)));
    return () => { offs.forEach((o) => o()); clients.forEach((c) => c.stop()); };
  }, [clients]);
  const viewOf = (i: number) => (clients[i].getState() as { G: WarClientView } | null)?.G ?? null;
  const v0 = viewOf(0);
  const humans = cfg.seats.map((s, i) => (s.kind === 'human' ? String(i) : null)).filter((x): x is string => x !== null);
  const cur = v0?.current ?? '0';
  const lastHuman = useRef(humans[0]);
  if (humans.includes(cur) && !v0?.result) lastHuman.current = cur;
  const shown = lastHuman.current;
  const [opened, setOpened] = useState<string>(humans.length > 1 ? '' : humans[0]);
  const curtain = humans.length > 1 && !v0?.result && opened !== shown;

  // computer generals
  const level = (p: string) => cfg.seats[Number(p)].kind as WarBotLevel;
  // every state the master sends has a new id: a computer general acts again after each of its own moves
  const stamp = (clients[0].getState() as { _stateID?: number } | null)?._stateID;
  useEffect(() => {
    const v = viewOf(Number(cur));
    if (!v || v.result || cfg.seats[Number(cur)].kind === 'human') return;
    const last = v.log[v.log.length - 1];
    const t = setTimeout(() => {
      const now = viewOf(Number(cur));
      if (!now || now.result || now.current !== cur) return;
      clients[Number(cur)].moves.act(chooseWarAction(now, cur, level(cur), Math.random));
    }, botMs(last?.k === 'battle', last?.k === 'turn') + (v.log.some((e) => e.k === 'eliminate') && last?.k === 'eliminate' ? ms('stamp') : 0));
    return () => clearTimeout(t);
  }, [stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const view = viewOf(Number(shown));
  if (!view) return null;
  const names = Object.fromEntries(cfg.seats.map((s, i) => [String(i), s.name]));
  const c = clients[Number(shown)];
  return (
    <>
      <WarScreen view={view} me={shown} names={names} kind={humans.length > 1 ? 'local' : 'bot'}
        send={(a: Action) => c.moves.act(a)} resign={() => c.moves.resign()} onExit={() => navigate('/warfront')}
        again={{ label: 'New battle, same generals', onClick: onAgain }} />
      {curtain && <Curtain name={names[shown]} color={factionOf(view.factions, shown).color} onOpen={() => setOpened(shown)} />}
    </>
  );
}

/** Pass and play: a leather map case closes over the table and names the next general. */
export function Curtain({ name, color, onOpen }: { name: string; color: string; onOpen: () => void }) {
  return (
    <div className="wf-curtain" role="dialog" aria-label={`${name}, take the table`} style={{ ['--fc' as string]: color }}>
      <div className="wf-case">
        <div className="wf-case-flap"><span className="wf-buckle" aria-hidden /></div>
        <div className="wf-case-body">
          <small>Eyes only</small>
          <h2>General {name}</h2>
          <p>Pass the device. Everyone else, look away from the table.</p>
          <button type="button" className="wf-key" onClick={onOpen} data-testid="wf-open-case" autoFocus>Open the map case</button>
        </div>
      </div>
    </div>
  );
}
