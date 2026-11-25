import koaBody from 'koa-body';
import { Client, LobbyClient } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { KingdomGame, KINGDOM_GAME_NAME } from '@boboland/shared';
import { KINGDOM_BOT_LEVELS, chooseKingdomAction, eventMs, HEROES, type KBotLevel, type KView } from '@boboland/shared/src/kingdom';

/**
 * Shifting Kingdom's server-played bots for online rooms (Warfront's pattern): the room host seats a bot in the
 * waiting room; it follows the group into the game and back into the next room. Each bot plays through its own
 * socket client, so it only ever sees its own player view. A bot waits for the animations of everything since it
 * last acted (shared `timing.ts`), plus a turn lead; TTB_BOT_DELAY replaces that with a fixed pace (tests).
 */
export const KINGDOM_BOT_NAMES: Record<KBotLevel, string> = { easy: 'Page', medium: 'Squire', hard: 'Sage' };
interface Bot { level: KBotLevel; credentials: string; name: string; hero: number }
interface Entry { kind: 'waiting' | 'game'; bots: Map<string, Bot>; handoff?: Map<string, Bot> }

export function installKingdomBots(server: any, opts: { port: number; delayMs?: number; pollMs?: number }) {
  const fixed = opts.delayMs ?? (process.env.TTB_BOT_DELAY ? Number(process.env.TTB_BOT_DELAY) : null);
  const url = `http://localhost:${opts.port}`;
  const lobby = new LobbyClient({ server: url });
  const registry = new Map<string, Entry>();
  const runners = new Map<string, () => void>();
  const busy = new Set<string>();

  const meta = async (matchID: string) => (await server.db.fetch(matchID, { metadata: true }))?.metadata as any | undefined;
  const seatsOf = (md: any) => Object.values(md.players as Record<string, any>).map((p: any) => ({
    id: Number(p.id), name: p.name as string | undefined, hero: typeof p.data?.hero === 'number' ? p.data.hero : undefined, bot: p.data?.bot as string | undefined, credentials: p.credentials as string | undefined,
  }));
  const joined = (md: any) => seatsOf(md).filter((s) => !!s.name).sort((a, b) => a.id - b.id);

  function run(matchID: string, playerID: string, bot: Bot, numPlayers: number) {
    const key = `${matchID}/${playerID}`;
    if (runners.has(key)) return;
    const client: any = Client({ game: KingdomGame as any, multiplayer: SocketIO({ server: url }), matchID, playerID, credentials: bot.credentials, numPlayers, debug: false });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let seen = -1; // logTotal already waited for
    let lastCurrent = '';
    const schedule = () => {
      const s = client.getState();
      if (!s || timer) return;
      const v = s.G as KView;
      if (!v?.players || v.players.length !== numPlayers) return;
      if (s.ctx.gameover || v.result) { stop(); return; }
      if (v.current !== playerID || v.out.includes(playerID)) { lastCurrent = v.current; return; }
      const first = lastCurrent !== playerID;
      lastCurrent = playerID;
      // the opening book (first turn) and every animation since this bot last looked
      const anim = seen < 0 ? 2600 : v.log.filter((e) => e.n > seen).reduce((t, e) => t + eventMs(e), 0);
      seen = v.logTotal;
      const wait = fixed !== null ? fixed * (first ? 2 : 1) : anim + (first ? 700 : 350);
      timer = setTimeout(() => {
        timer = null;
        const now = client.getState();
        const view = now?.G as KView | undefined;
        if (!view || view.result || view.current !== playerID) return;
        try { client.moves.act(chooseKingdomAction(view, playerID, bot.level, Math.random)); } catch (e) { console.warn('[kingdom bot]', e); }
      }, wait);
    };
    client.subscribe(() => { try { schedule(); } catch (e) { console.warn('[kingdom bot]', e); } });
    client.start();
    const watchdog = setInterval(() => { try { schedule(); } catch { /* ignore */ } }, 1500);
    watchdog.unref?.();
    const stop = () => { if (timer) clearTimeout(timer); clearInterval(watchdog); try { client.stop(); } catch { /* ignore */ } runners.delete(key); };
    runners.set(key, stop);
  }
  const stopAll = (matchID: string) => { for (const [k, s] of [...runners]) if (k.startsWith(`${matchID}/`)) s(); };

  const joinBot = async (matchID: string, playerID: string, bot: Bot) =>
    (await lobby.joinMatch(KINGDOM_GAME_NAME, matchID, { playerID, playerName: bot.name, data: { hero: bot.hero, bot: bot.level } } as never)).playerCredentials as string;

  async function follow(matchID: string, entry: Entry) {
    const md = await meta(matchID);
    if (!md) { stopAll(matchID); registry.delete(matchID); return; }
    const next: string | undefined = md.nextMatchID;
    if (!next) return;
    const handoff = (entry.handoff ??= new Map());
    if (entry.kind === 'waiting') {
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
      follow(id, e).catch((err) => console.warn('[kingdom bot] follow', err)).finally(() => busy.delete(id));
    }
  }, opts.pollMs ?? 1000);
  poll.unref();

  /** The room host is the lowest joined human seat. */
  const isHost = async (matchID: unknown, credentials: unknown) => {
    if (typeof matchID !== 'string' || typeof credentials !== 'string') return null;
    const md = await meta(matchID);
    if (!md || md.gameName !== KINGDOM_GAME_NAME) return null;
    const host = joined(md).find((s) => !s.bot);
    return host && host.credentials === credentials ? md : null;
  };

  server.router.post('/api/kingdom/bots/add', koaBody(), async (ctx: any) => {
    const { matchID, credentials, level } = ctx.request.body ?? {};
    if (!KINGDOM_BOT_LEVELS.includes(level)) { ctx.status = 400; return; }
    const md = await isHost(matchID, credentials);
    if (!md) { ctx.status = 403; return; }
    const seats = seatsOf(md);
    const open = seats.filter((s) => !s.name).sort((a, b) => a.id - b.id)[0];
    if (!open || md.nextMatchID) { ctx.status = 409; return; }
    const used = new Set(seats.filter((s) => s.name).map((s) => s.hero));
    const hero = [...HEROES.keys()].find((h) => !used.has(h)) ?? 0;
    const names = new Set(seats.map((s) => s.name));
    let name = KINGDOM_BOT_NAMES[level as KBotLevel];
    for (let n = 2; names.has(name); n++) name = `${KINGDOM_BOT_NAMES[level as KBotLevel]} ${n}`;
    const bot: Bot = { level, name, hero, credentials: '' };
    const playerID = String(open.id);
    try { bot.credentials = await joinBot(matchID, playerID, bot); } catch { ctx.status = 409; return; }
    const entry = registry.get(matchID) ?? { kind: 'waiting' as const, bots: new Map() };
    entry.bots.set(playerID, bot);
    registry.set(matchID, entry);
    ctx.body = { playerID };
  });

  server.router.post('/api/kingdom/bots/remove', koaBody(), async (ctx: any) => {
    const { matchID, credentials, playerID } = ctx.request.body ?? {};
    const md = await isHost(matchID, credentials);
    if (!md) { ctx.status = 403; return; }
    const entry = registry.get(matchID);
    const bot = entry?.kind === 'waiting' ? entry.bots.get(String(playerID)) : undefined;
    if (!entry || !bot) { ctx.status = 404; return; }
    try { await lobby.leaveMatch(KINGDOM_GAME_NAME, matchID, { playerID: String(playerID), credentials: bot.credentials }); } catch (e) { console.warn('[kingdom bot] leave', e); }
    entry.bots.delete(String(playerID));
    ctx.body = { ok: true };
  });

  return { stop: () => { clearInterval(poll); for (const s of [...runners.values()]) s(); } };
}
