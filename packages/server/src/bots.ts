import koaBody from 'koa-body';
import { Client, LobbyClient } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import {
  BobolandGame, GAME_NAME, BOT_LEVELS, MAX_SEATS, firstFreeColor, seatColors, gameSeatOf, chooseBotMove, withGameMap,
  type BotLevel,
} from '@boboland/shared';

type Chooser = (view: any, ctx: any, me: string, level: BotLevel, rng: () => number) => { move: string; args: unknown[] } | null;

export interface BotOptions { port: number; delayMs?: number; turnLeadMs?: number; introMs?: number; choose?: Chooser; pollMs?: number }
interface Bot { level: BotLevel; credentials: string; name: string; color: number }
/** `handoff`: the next match's bots joined so far, so a failed join can be retried without re-joining the others. */
interface Entry { kind: 'waiting' | 'game'; bots: Map<string, Bot>; handoff?: Map<string, Bot> }

const NAMES: Record<BotLevel, string> = { easy: 'Rookie Bot', medium: 'Conductor Bot', hard: 'Stationmaster Bot' };
const PALETTE = MAX_SEATS;

export function installBots(server: any, opts: BotOptions): { stop: () => void } {
  const delayMs = opts.delayMs ?? (process.env.TTB_BOT_DELAY ? Number(process.env.TTB_BOT_DELAY) : 1100);
  // The first action of a turn waits longer, so the client's turn banner (2.4 s, shown after the previous
  // move's animations) is over before the bot acts. Scales with delayMs so tests and e2e stay fast.
  const turnLeadMs = opts.turnLeadMs ?? delayMs * (2100 / 1100); // 2.1 s at the default 1.1 s delay
  // When a game starts, the client plays a ~9 s enter-the-game curtain (EnterCurtain: connect + 3.2 s title + 5.2 s
  // opening). Bots hold their first action until it has opened. Scales with delayMs like the turn lead.
  const introMs = opts.introMs ?? delayMs * (9000 / 1100);
  const choose: Chooser = opts.choose ?? (chooseBotMove as unknown as Chooser);
  const url = `http://localhost:${opts.port}`;
  const lobby = new LobbyClient({ server: url });
  const registry = new Map<string, Entry>();
  const runners = new Map<string, { stop: () => void }>();
  const busy = new Set<string>();
  const jitter = (base = delayMs) => base + (delayMs >= 100 ? Math.random() * 400 - 200 : 0);

  const fetchMeta = async (matchID: string) => {
    const r = await server.db.fetch(matchID, { metadata: true });
    return r?.metadata as any | undefined;
  };
  const seatsOf = (md: any) =>
    Object.values(md.players as Record<string, any>).map((p: any) => ({
      id: Number(p.id), name: p.name as string | undefined,
      color: typeof p.data?.color === 'number' ? (p.data.color as number) : undefined,
    }));

  function startRunner(matchID: string, playerID: string, bot: Bot, numPlayers: number) {
    const key = `${matchID}/${playerID}`;
    if (runners.has(key)) return;
    const client: any = Client({
      game: BobolandGame as any, multiplayer: SocketIO({ server: url }), matchID, playerID,
      credentials: bot.credentials, numPlayers, debug: false,
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastMove = Date.now();
    let actedTurn = -1; // ctx.turn of this bot's last move
    const introEnds = Date.now() + introMs; // nothing until the players' curtain has opened
    let stopped = false;
    const rng = Math.random;
    const compute = () => {
      const s = client.getState();
      if (!s || (s.ctx as any).gameover) return null;
      // one server plays every map: choose inside the map of this game
      return withGameMap(s.G, () => choose(s.G, s.ctx, playerID, bot.level, rng));
    };
    const isFirstOfTurn = () => {
      const ctx = client.getState().ctx as any;
      return ctx.phase === 'main' && ctx.turn !== actedTurn;
    };
    const arm = (lead: boolean) => {
      timer = setTimeout(() => {
        timer = null;
        if (stopped) return;
        // armed while tickets were still being chosen, but the main phase (and this bot's turn) began since:
        // wait the turn lead before the first action, so the turn banner is over
        if (!lead && isFirstOfTurn()) { arm(true); return; }
        try {
          const m = compute();
          if (m) {
            lastMove = Date.now();
            actedTurn = (client.getState().ctx as any).turn;
            client.moves[m.move](...m.args);
          }
        } catch (e) { console.warn('[bot] move failed', e); }
      }, Math.max(0, jitter(lead ? turnLeadMs : delayMs), introEnds - Date.now()));
    };
    const schedule = () => {
      if (stopped || timer) return;
      if (!compute()) return;
      arm(isFirstOfTurn());
    };
    client.subscribe((s: any) => {
      // the game is over: hang up (the registry still knows the bot, to follow it into a new waiting room)
      if (s?.ctx?.gameover) { stopRunner(key); return; }
      try { schedule(); } catch (e) { console.warn('[bot]', e); }
    });
    client.start();
    const watchdog = setInterval(() => {
      try {
        if (!timer && Date.now() - lastMove > 2 * delayMs + 500) { lastMove = Date.now(); schedule(); }
      } catch (e) { console.warn('[bot]', e); }
    }, Math.max(200, delayMs * 2));
    watchdog.unref?.();
    runners.set(key, {
      stop: () => { stopped = true; if (timer) clearTimeout(timer); clearInterval(watchdog); try { client.stop(); } catch { /* ignore */ } },
    });
  }
  function stopRunner(key: string) { runners.get(key)?.stop(); runners.delete(key); }
  const stopRunners = (matchID: string) => {
    for (const [k, r] of [...runners]) if (k.startsWith(matchID + '/')) { r.stop(); runners.delete(k); }
  };

  async function joinBot(matchID: string, playerID: string, bot: Bot) {
    const r = await lobby.joinMatch(GAME_NAME, matchID, {
      playerID, playerName: bot.name, data: { color: bot.color, bot: bot.level },
    } as never);
    return r.playerCredentials as string;
  }

  async function follow(matchID: string, entry: Entry) {
    const md = await fetchMeta(matchID);
    if (!md) { stopRunners(matchID); registry.delete(matchID); return; }
    const next: string | undefined = md.nextMatchID;
    if (!next) return;
    if (entry.kind === 'waiting') {
      const seats = seatsOf(md);
      const colors = seatColors(seats, PALETTE);
      const game: Entry = { kind: 'game', bots: (entry.handoff ??= new Map()) };
      const numPlayers = seats.filter((s) => !!s.name).length;
      for (const [wid, bot] of entry.bots) {
        const gid = gameSeatOf(seats, wid);
        if (gid === null || game.bots.has(gid)) continue;
        const nb: Bot = { ...bot, color: colors[Number(gid)] };
        nb.credentials = await joinBot(next, gid, nb);
        game.bots.set(gid, nb);
      }
      registry.set(next, game);
      registry.delete(matchID);
      for (const [gid, b] of game.bots) startRunner(next, gid, b, numPlayers);
    } else {
      const room: Entry = { kind: 'waiting', bots: (entry.handoff ??= new Map()) };
      for (const [gid, bot] of entry.bots) {
        if (room.bots.has(gid)) continue;
        room.bots.set(gid, { ...bot, credentials: await joinBot(next, gid, bot) });
      }
      stopRunners(matchID);
      registry.set(next, room);
      registry.delete(matchID);
    }
  }

  const poll = setInterval(() => {
    for (const [matchID, entry] of [...registry]) {
      if (busy.has(matchID)) continue;
      busy.add(matchID);
      follow(matchID, entry).catch((e) => console.warn('[bot] follow failed', e)).finally(() => busy.delete(matchID));
    }
  }, opts.pollMs ?? 1000);
  poll.unref();

  const isHost = async (matchID: unknown, credentials: unknown) => {
    if (typeof matchID !== 'string' || typeof credentials !== 'string') return null;
    const md = await fetchMeta(matchID);
    if (!md) return null;
    return md.players?.['0']?.credentials === credentials ? md : null;
  };

  server.router.post('/api/bots/add', koaBody(), async (ctx: any) => {
    const { matchID, credentials, level } = ctx.request.body ?? {};
    if (!(BOT_LEVELS as readonly string[]).includes(level)) { ctx.status = 400; ctx.body = { error: 'bad level' }; return; }
    const md = await isHost(matchID, credentials);
    if (!md) { ctx.status = 403; ctx.body = { error: 'not the host' }; return; }
    const seats = seatsOf(md);
    const open = seats.filter((s) => !s.name).sort((a, b) => a.id - b.id)[0];
    if (!open || md.nextMatchID) { ctx.status = 409; ctx.body = { error: 'no open seat' }; return; }
    const base = NAMES[level as BotLevel];
    const used = new Set(seats.map((s) => s.name));
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base} ${n}`;
    const bot: Bot = { level, name, color: firstFreeColor(seats, PALETTE), credentials: '' };
    const playerID = String(open.id);
    try { bot.credentials = await joinBot(matchID, playerID, bot); } catch { ctx.status = 409; ctx.body = { error: 'seat taken' }; return; }
    let entry = registry.get(matchID);
    if (!entry) { entry = { kind: 'waiting', bots: new Map() }; registry.set(matchID, entry); }
    entry.bots.set(playerID, bot);
    ctx.body = { playerID };
  });

  server.router.post('/api/bots/remove', koaBody(), async (ctx: any) => {
    const { matchID, credentials, playerID } = ctx.request.body ?? {};
    const md = await isHost(matchID, credentials);
    if (!md) { ctx.status = 403; ctx.body = { error: 'not the host' }; return; }
    const entry = registry.get(matchID);
    const bot = entry?.kind === 'waiting' ? entry.bots.get(String(playerID)) : undefined;
    if (!entry || !bot) { ctx.status = 404; ctx.body = { error: 'no such bot' }; return; }
    try { await lobby.leaveMatch(GAME_NAME, matchID, { playerID: String(playerID), credentials: bot.credentials }); }
    catch (e) { console.warn('[bot] leave failed', e); }
    entry.bots.delete(String(playerID));
    ctx.body = { ok: true };
  });

  return { stop: () => { clearInterval(poll); for (const r of runners.values()) r.stop(); runners.clear(); } };
}
