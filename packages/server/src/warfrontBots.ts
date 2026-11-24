import koaBody from 'koa-body';
import { Client, LobbyClient } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { WarfrontGame, WARFRONT_GAME_NAME } from '@boboland/shared';
import { WAR_BOT_LEVELS, chooseWarAction, type WarBotLevel, type WarView } from '@boboland/shared/src/warfront';

/**
 * Warfront's server-played bots for online/LAN rooms (the Ticket bots' pattern, for this game):
 * the host seats a bot in the waiting room; it follows the group into the game and back into the next room.
 * Each bot plays through its own socket client, so it only ever sees its own player view.
 */
export const WAR_BOT_NAMES: Record<WarBotLevel, string> = { easy: 'Cadet', medium: 'Colonel', hard: 'Field Marshal' };
const FACTIONS = 6;
interface Bot { level: WarBotLevel; credentials: string; name: string; color: number }
interface Entry { kind: 'waiting' | 'game'; bots: Map<string, Bot>; handoff?: Map<string, Bot> }

export function installWarfrontBots(server: any, opts: { port: number; delayMs?: number; pollMs?: number }) {
  const delayMs = opts.delayMs ?? (process.env.TTB_BOT_DELAY ? Number(process.env.TTB_BOT_DELAY) : 750);
  const url = `http://localhost:${opts.port}`;
  const lobby = new LobbyClient({ server: url });
  const registry = new Map<string, Entry>();
  const runners = new Map<string, () => void>();
  const busy = new Set<string>();

  const meta = async (matchID: string) => (await server.db.fetch(matchID, { metadata: true }))?.metadata as any | undefined;
  const seatsOf = (md: any) => Object.values(md.players as Record<string, any>).map((p: any) => ({
    id: Number(p.id), name: p.name as string | undefined, color: typeof p.data?.color === 'number' ? p.data.color : undefined,
  }));
  const joined = (md: any) => seatsOf(md).filter((s) => !!s.name).sort((a, b) => a.id - b.id);

  function run(matchID: string, playerID: string, bot: Bot, numPlayers: number) {
    const key = `${matchID}/${playerID}`;
    if (runners.has(key)) return;
    const client: any = Client({ game: WarfrontGame as any, multiplayer: SocketIO({ server: url }), matchID, playerID, credentials: bot.credentials, numPlayers, debug: false });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastCurrent = '';
    const intro = Date.now() + delayMs * 4; // the players' opening curtain
    const schedule = () => {
      const s = client.getState();
      if (!s || timer) return;
      const v = s.G as WarView;
      if (s.ctx.gameover || v.result) { stop(); return; }
      if (v.current !== playerID) { lastCurrent = v.current; return; }
      const lead = lastCurrent !== playerID ? 1.8 : 1;
      lastCurrent = playerID;
      // a battle plays its dice on screen first
      const wait = Math.max(intro - Date.now(), delayMs * lead + (v.battle && v.log[v.log.length - 1]?.k === 'battle' ? delayMs : 0));
      timer = setTimeout(() => {
        timer = null;
        const now = client.getState();
        const view = now?.G as WarView | undefined;
        if (!view || view.result || view.current !== playerID) return;
        try { client.moves.act(chooseWarAction(view, playerID, bot.level, Math.random)); } catch (e) { console.warn('[warfront bot]', e); }
      }, wait);
    };
    client.subscribe(() => { try { schedule(); } catch (e) { console.warn('[warfront bot]', e); } });
    client.start();
    const watchdog = setInterval(() => { try { schedule(); } catch { /* ignore */ } }, Math.max(400, delayMs * 3));
    watchdog.unref?.();
    const stop = () => { if (timer) clearTimeout(timer); clearInterval(watchdog); try { client.stop(); } catch { /* ignore */ } runners.delete(key); };
    runners.set(key, stop);
  }
  const stopAll = (matchID: string) => { for (const [k, s] of [...runners]) if (k.startsWith(`${matchID}/`)) s(); };

  const joinBot = async (matchID: string, playerID: string, bot: Bot) =>
    (await lobby.joinMatch(WARFRONT_GAME_NAME, matchID, { playerID, playerName: bot.name, data: { color: bot.color, bot: bot.level } } as never)).playerCredentials as string;

  async function follow(matchID: string, entry: Entry) {
    const md = await meta(matchID);
    if (!md) { stopAll(matchID); registry.delete(matchID); return; }
    const next: string | undefined = md.nextMatchID;
    if (!next) return;
    const handoff = (entry.handoff ??= new Map());
    if (entry.kind === 'waiting') {
      // into the game: seats follow the joined order of the waiting room
      const order = joined(md);
      for (const [wid, bot] of entry.bots) {
        const gid = String(order.findIndex((s) => String(s.id) === wid));
        if (gid === '-1' || handoff.has(gid)) continue;
        handoff.set(gid, { ...bot, credentials: await joinBot(next, gid, bot) });
      }
      registry.set(next, { kind: 'game', bots: handoff });
      registry.delete(matchID);
      for (const [gid, b] of handoff) run(next, gid, b, order.length);
    } else {
      for (const [gid, bot] of entry.bots) if (!handoff.has(gid)) handoff.set(gid, { ...bot, credentials: await joinBot(next, gid, bot) });
      stopAll(matchID);
      registry.set(next, { kind: 'waiting', bots: handoff });
      registry.delete(matchID);
    }
  }
  const poll = setInterval(() => {
    for (const [id, e] of [...registry]) {
      if (busy.has(id)) continue;
      busy.add(id);
      follow(id, e).catch((err) => console.warn('[warfront bot] follow', err)).finally(() => busy.delete(id));
    }
  }, opts.pollMs ?? 1000);
  poll.unref();

  const isHost = async (matchID: unknown, credentials: unknown) => {
    if (typeof matchID !== 'string' || typeof credentials !== 'string') return null;
    const md = await meta(matchID);
    return md && md.gameName === WARFRONT_GAME_NAME && md.players?.['0']?.credentials === credentials ? md : null;
  };

  server.router.post('/api/warfront/bots/add', koaBody(), async (ctx: any) => {
    const { matchID, credentials, level } = ctx.request.body ?? {};
    if (!WAR_BOT_LEVELS.includes(level)) { ctx.status = 400; return; }
    const md = await isHost(matchID, credentials);
    if (!md) { ctx.status = 403; return; }
    const seats = seatsOf(md);
    const open = seats.filter((s) => !s.name).sort((a, b) => a.id - b.id)[0];
    if (!open || md.nextMatchID) { ctx.status = 409; return; }
    const used = new Set(seats.map((s) => s.color));
    const color = [...Array(FACTIONS).keys()].find((c) => !used.has(c)) ?? 0;
    const names = new Set(seats.map((s) => s.name));
    let name = WAR_BOT_NAMES[level as WarBotLevel];
    for (let n = 2; names.has(name); n++) name = `${WAR_BOT_NAMES[level as WarBotLevel]} ${n}`;
    const bot: Bot = { level, name, color, credentials: '' };
    const playerID = String(open.id);
    try { bot.credentials = await joinBot(matchID, playerID, bot); } catch { ctx.status = 409; return; }
    const entry = registry.get(matchID) ?? { kind: 'waiting' as const, bots: new Map() };
    entry.bots.set(playerID, bot);
    registry.set(matchID, entry);
    ctx.body = { playerID };
  });

  server.router.post('/api/warfront/bots/remove', koaBody(), async (ctx: any) => {
    const { matchID, credentials, playerID } = ctx.request.body ?? {};
    const md = await isHost(matchID, credentials);
    if (!md) { ctx.status = 403; return; }
    const entry = registry.get(matchID);
    const bot = entry?.kind === 'waiting' ? entry.bots.get(String(playerID)) : undefined;
    if (!entry || !bot) { ctx.status = 404; return; }
    try { await lobby.leaveMatch(WARFRONT_GAME_NAME, matchID, { playerID: String(playerID), credentials: bot.credentials }); } catch (e) { console.warn('[warfront bot] leave', e); }
    entry.bots.delete(String(playerID));
    ctx.body = { ok: true };
  });

  return { stop: () => { clearInterval(poll); for (const s of [...runners.values()]) s(); } };
}
