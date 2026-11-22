import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server } from 'boardgame.io/server';
import { Client, LobbyClient } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { createServer } from 'node:net';
import * as shared from '@boboland/shared';
import { BobolandGame, GAME_NAME, chooseBotMove } from '@boboland/shared';
import { installBots } from '../src/bots';

const freePort = () => new Promise<number>((res) => {
  const s = createServer().listen(0, () => { const p = (s.address() as { port: number }).port; s.close(() => res(p)); });
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until<T>(f: () => Promise<T | false | undefined | null>, ms = 30_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await f().catch(() => null);
    if (v) return v;
    if (Date.now() > end) throw new Error('timeout');
    await sleep(100);
  }
}

let server: any, stopServer: () => void, stopBots: () => void, port: number, base: string, lobby: LobbyClient;
beforeAll(async () => {
  port = await freePort();
  base = `http://localhost:${port}`;
  server = Server({ games: [BobolandGame], origins: [/.*/] });
  stopBots = installBots(server, { port, delayMs: 5, pollMs: 100 }).stop;
  const running = await server.run(port);
  stopServer = () => { server.kill(running); };
  lobby = new LobbyClient({ server: base });
});
afterAll(() => { stopBots(); stopServer(); });

const post = (path: string, body: unknown) =>
  fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

async function hostRoom() {
  const { matchID } = await lobby.createMatch(GAME_NAME, { numPlayers: 5 });
  const j = await lobby.joinMatch(GAME_NAME, matchID, { playerID: '0', playerName: 'Host', data: { color: 0 } } as never);
  return { matchID, credentials: j.playerCredentials };
}

describe('bot routes', () => {
  it('rejects bad level and wrong credentials, adds and removes', async () => {
    const { matchID, credentials } = await hostRoom();
    expect((await post('/api/bots/add', { matchID, credentials, level: 'godlike' })).status).toBe(400);
    expect((await post('/api/bots/add', { matchID, credentials: 'nope', level: 'easy' })).status).toBe(403);

    const r = await post('/api/bots/add', { matchID, credentials, level: 'hard' });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ playerID: '1' });
    const m = await lobby.getMatch(GAME_NAME, matchID);
    expect(m.players[1]!.name).toBe('Stationmaster Bot');
    expect((m.players[1]!.data as any).bot).toBe('hard');
    expect((m.players[1]!.data as any).color).toBe(1);

    const r2 = await post('/api/bots/add', { matchID, credentials, level: 'hard' });
    expect(await r2.json()).toEqual({ playerID: '2' });
    expect((await lobby.getMatch(GAME_NAME, matchID)).players[2]!.name).toBe('Stationmaster Bot 2');

    expect((await post('/api/bots/remove', { matchID, credentials: 'nope', playerID: '1' })).status).toBe(403);
    expect((await post('/api/bots/remove', { matchID, credentials, playerID: '0' })).status).toBe(404);
    expect((await post('/api/bots/remove', { matchID, credentials, playerID: '1' })).status).toBe(200);
    expect((await lobby.getMatch(GAME_NAME, matchID)).players[1]!.name).toBeUndefined();
    // lowest open seat is reused
    expect(await (await post('/api/bots/add', { matchID, credentials, level: 'easy' })).json()).toEqual({ playerID: '1' });
  });
});

describe('bot pacing', () => {
  it('waits the turn lead before the first action of a turn, not before later ones', async () => {
    const p = await freePort();
    const url = `http://localhost:${p}`;
    const srv: any = Server({ games: [BobolandGame], origins: [/.*/] });
    const bots = installBots(srv, { port: p, delayMs: 5, turnLeadMs: 500, pollMs: 100 });
    const running = await srv.run(p);
    const lb = new LobbyClient({ server: url });
    let host: any;
    try {
      const { matchID } = await lb.createMatch(GAME_NAME, { numPlayers: 5 });
      const hj = await lb.joinMatch(GAME_NAME, matchID, { playerID: '0', playerName: 'Host', data: { color: 0 } } as never);
      await fetch(`${url}/api/bots/add`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ matchID, credentials: hj.playerCredentials, level: 'hard' }),
      });
      const { nextMatchID: gameID } = await lb.playAgain(GAME_NAME, matchID, { playerID: '0', credentials: hj.playerCredentials, numPlayers: 2 } as never);
      const gj = await lb.joinMatch(GAME_NAME, gameID, { playerID: '0', playerName: 'Host', data: { color: 0 } } as never);
      host = Client({ game: BobolandGame as any, multiplayer: SocketIO({ server: url }), matchID: gameID, playerID: '0', credentials: gj.playerCredentials, numPlayers: 2, debug: false });

      // when each turn began, and when the bot (seat 1) added each log entry
      let turn = -1, turnStart = 0, logLen = 0, pending = false, wasMain = false;
      const firstGap: number[] = [], laterGap: number[] = [];
      let lastBotAt = 0, botEntriesThisTurn = 0;
      const step = () => {
        const s = host.getState();
        if (!s || s.ctx.gameover) return;
        const inMain = s.ctx.phase === 'main';
        // log first: the bot's last move of a turn arrives in the same update that starts the next turn
        if (!inMain || !wasMain) logLen = s.G.log.length; // the setup phase's last move is not a turn action
        else if (s.G.log.length > logLen) {
          const added = s.G.log.slice(logLen);
          logLen = s.G.log.length;
          if (added.some((e: any) => e.p === '1')) {
            const now = Date.now();
            (botEntriesThisTurn === 0 ? firstGap : laterGap).push(botEntriesThisTurn === 0 ? now - turnStart : now - lastBotAt);
            botEntriesThisTurn++; lastBotAt = now;
          }
        }
        wasMain = inMain;
        if (inMain && s.ctx.turn !== turn) { turn = s.ctx.turn; turnStart = Date.now(); botEntriesThisTurn = 0; }
        if (!pending) {
          const m = chooseBotMove(s.G, s.ctx, '0', 'easy', Math.random);
          if (m) { pending = true; setTimeout(() => { pending = false; try { (host.moves as any)[m.move](...m.args); } catch { /* retry */ } }, 5); }
        }
      };
      host.subscribe(step);
      host.start();
      await until(async () => (firstGap.length >= 2 && laterGap.length >= 1 ? true : null), 60_000);
      expect(Math.min(...firstGap)).toBeGreaterThanOrEqual(400);
      expect(Math.min(...laterGap)).toBeLessThan(400);
    } finally { try { host?.stop(); } catch { /* ignore */ } bots.stop(); srv.kill(running); }
  }, 90_000);
});

describe('bots follow the match', () => {
  it('play a whole game with the host, then return to a new waiting room', async () => {
    const { matchID, credentials } = await hostRoom();
    await post('/api/bots/add', { matchID, credentials, level: 'hard' });
    await post('/api/bots/add', { matchID, credentials, level: 'easy' });

    const { nextMatchID: gameID } = await lobby.playAgain(GAME_NAME, matchID, { playerID: '0', credentials, numPlayers: 3 } as never);
    const hj = await lobby.joinMatch(GAME_NAME, gameID, { playerID: '0', playerName: 'Host', data: { color: 0 } } as never);

    const game = await until(async () => {
      const m = await lobby.getMatch(GAME_NAME, gameID);
      return m.players.filter((p) => p.name).length === 3 ? m : null;
    });
    expect(game.players[1]!.name).toBe('Stationmaster Bot');
    expect(game.players[2]!.name).toBe('Rookie Bot');
    expect((game.players[1]!.data as any).color).toBe(1);
    expect((game.players[2]!.data as any).color).toBe(2);

    const host: any = Client({
      game: BobolandGame as any, multiplayer: SocketIO({ server: base }), matchID: gameID, playerID: '0',
      credentials: hj.playerCredentials, numPlayers: 3, debug: false,
    });
    let pending = false;
    const act = () => {
      if (pending) return;
      const s = host.getState();
      if (!s || s.ctx.gameover) return;
      const m = chooseBotMove(s.G, s.ctx, '0', 'medium', Math.random);
      if (!m) return;
      pending = true;
      setTimeout(() => { pending = false; try { const c = host.getState(); if (!c.ctx.gameover) (host.moves as any)[m.move](...m.args); } catch { /* retry on next update */ } act(); }, 5);
    };
    host.subscribe(act);
    host.start();
    const watch = setInterval(act, 200);
    try {
      await until(async () => host.getState()?.ctx.gameover ? true : null, 150_000);
    } finally { clearInterval(watch); }
    host.stop();

    const { nextMatchID: roomID } = await lobby.playAgain(GAME_NAME, gameID, { playerID: '0', credentials: hj.playerCredentials, numPlayers: 5 } as never);
    const room = await until(async () => {
      const m = await lobby.getMatch(GAME_NAME, roomID);
      return m.players[1]!.name && m.players[2]!.name ? m : null;
    });
    expect(room.players[1]!.name).toBe('Stationmaster Bot');
    expect(room.players[2]!.name).toBe('Rookie Bot');
    expect((room.players[1]!.data as any).bot).toBe('hard');
    expect((room.players[2]!.data as any).color).toBe(2);
  }, 200_000);
});

describe('one server, several maps', () => {
  it('runs the chooser inside the map of its own game, and a match without setupData uses the default map', async () => {
    const p = await freePort();
    const url = `http://localhost:${p}`;
    const srv: any = Server({ games: [BobolandGame], origins: [/.*/] });
    const seen = new Map<string, Set<string>>(); // game's own map -> maps that were active when the chooser ran
    const choose = (view: any, ctx: any, me: string, level: any, rng: any) => {
      const set = seen.get(view.mapId) ?? new Set<string>();
      set.add(shared.MAP_ID);
      seen.set(view.mapId, set);
      return chooseBotMove(view, ctx, me, level, rng);
    };
    const bots = installBots(srv, { port: p, delayMs: 5, pollMs: 100, choose: choose as never });
    const running = await srv.run(p);
    const lb = new LobbyClient({ server: url });
    const host: any[] = [];
    try {
      const start = async (setupData: unknown) => {
        const { matchID } = await lb.createMatch(GAME_NAME, { numPlayers: 5 });
        const hj = await lb.joinMatch(GAME_NAME, matchID, { playerID: '0', playerName: 'Host', data: { color: 0 } } as never);
        await fetch(`${url}/api/bots/add`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ matchID, credentials: hj.playerCredentials, level: 'easy' }),
        });
        const { nextMatchID } = await lb.playAgain(GAME_NAME, matchID, { playerID: '0', credentials: hj.playerCredentials, numPlayers: 2, setupData } as never);
        const gj = await lb.joinMatch(GAME_NAME, nextMatchID, { playerID: '0', playerName: 'Host', data: { color: 0 } } as never);
        const c: any = Client({ game: BobolandGame as any, multiplayer: SocketIO({ server: url }), matchID: nextMatchID, playerID: '0', credentials: gj.playerCredentials, numPlayers: 2, debug: false });
        c.start();
        host.push(c);
        return c;
      };
      const china = await start({ map: 'china' });
      const plain = await start(undefined);
      await until(async () => (china.getState()?.G?.mapId && plain.getState()?.G?.mapId ? true : null));
      expect(china.getState().G.mapId).toBe('china');
      expect(plain.getState().G.mapId).toBe(shared.DEFAULT_MAP_ID);
      // each bot has to choose in its own game (the setup phase makes it keep tickets)
      await until(async () => (seen.has('china') && seen.has(shared.DEFAULT_MAP_ID) ? true : null), 30_000);
      expect([...seen.get('china')!]).toEqual(['china']);
      expect([...seen.get(shared.DEFAULT_MAP_ID)!]).toEqual([shared.DEFAULT_MAP_ID]);
    } finally { for (const c of host) { try { c.stop(); } catch { /* ignore */ } } bots.stop(); srv.kill(running); }
  }, 60_000);
});
