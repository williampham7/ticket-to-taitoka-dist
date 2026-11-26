import type { BBotLevel, BEvent, BView, Guild, Reason } from '@boboland/shared/src/blocky';
import { PIECE_NAME } from '@boboland/shared/src/blocky';

/** Every word the player reads about guilds, builders, reasons and the log. */
export const GUILD_NAME: Record<Guild, string> = { tide: 'Tide', sun: 'Sun', ember: 'Ember', grove: 'Grove' };
export const AVATAR_NAME = ['Aviator', 'Gardener', 'Stonemason', 'Lantern-keeper', 'Kite-maker', 'Cloud-shepherd'] as const;
export const AVATAR_COUNT = AVATAR_NAME.length;
export const BOT_TITLE: Record<BBotLevel, string> = { easy: 'Apprentice', medium: 'Mason', hard: 'Architect' };

export const REASON_LINE: Record<Reason, string> = {
  offBoard: 'That hangs off the edge of the isle',
  overlap: 'Something is already built there',
  ownEdge: 'Can’t touch your own guild along an edge',
  noCorner: 'Must touch your own guild at a corner',
  notStart: 'Your first piece must cover your start corner',
  notYours: 'It isn’t your turn yet',
  used: 'That piece is already built',
  grounded: 'This guild is grounded',
};

export const nameOf = (names: Record<string, string>, p: string) => names[p] ?? `Builder ${Number(p) + 1}`;

/** One narrated log line, in theme ("Ana raised a Watchtower for Sun · +5"). */
export function narrate(e: BEvent, names: Record<string, string>): string {
  switch (e.k) {
    case 'start': return 'The guilds gather on the isle';
    case 'place': return `${nameOf(names, e.p)} raised a ${PIECE_NAME[e.piece]} for ${GUILD_NAME[e.guild]} · +${e.points}`;
    case 'stuck': return `${GUILD_NAME[e.guild]} is grounded: no room left to build`;
    case 'done': return `${nameOf(names, e.p)} is done building`;
    case 'resign': return `${nameOf(names, e.p)} left the isle`;
    case 'dismiss': return `${nameOf(names, e.p)} was sent home`;
    case 'turn': return `${GUILD_NAME[e.guild]} to build`;
    case 'end': return 'Night falls on the isles';
  }
}

/** What the status line needs from the screen. */
export interface StatusUi { held: boolean; pending: boolean; pointer: string; names: Record<string, string>; fits?: boolean }
export interface Status { guild: Guild; text: string; sub: string; step?: 0 | 1 | 2; avatar: number | null; thinking: boolean }
const tapVerb = (pointer: string) => (pointer === 'mouse' ? 'Click' : 'Tap');

/** The status line: always the exact next step, in plain words (PROMPT §7.1 items 1-2). */
export function statusLine(v: BView, me: string | null, ui: StatusUi): Status {
  const g = v.current, gn = GUILD_NAME[g], who = nameOf(ui.names, v.actor);
  const shared = v.seats[g] === 'shared';
  const avatar = v.avatars[Number(v.actor)] ?? null;
  if (v.result) {
    const w = v.result.winners.map((p) => (p === me ? 'You' : nameOf(ui.names, p)));
    return { guild: g, text: 'Night falls on the isles', sub: w.length > 1 ? `${w.join(' and ')} share the win` : `${w[0]} ${w[0] === 'You' ? 'win' : 'wins'}!`, avatar: null, thinking: false };
  }
  if (me === null) return { guild: g, text: `${who} is building`, sub: `${gn} to build${shared ? ' (the shared guild)' : ''}`, avatar, thinking: true };
  if (v.actor !== me) {
    const plan = ui.held ? 'Plan ahead: turn your piece while you wait' : 'Pick a piece to plan your next move';
    return { guild: g, text: `${who} is thinking…`, sub: `${gn} to build${shared ? ' (the shared guild)' : ''} · ${plan}`, avatar, thinking: true };
  }
  const head = shared ? `Your turn · place a ${gn} piece for the shared guild` : `Your turn · place a ${gn} piece`;
  if (ui.pending) return { guild: g, text: head, sub: ui.pointer === 'mouse' ? 'Click ✓ or press Enter to build it there, or drag it to adjust' : 'Tap ✓ to build it there, or drag it to adjust', step: 2, avatar: null, thinking: false };
  if (ui.held && ui.fits) return { guild: g, text: head, sub: ui.pointer === 'keyboard' ? 'It fits here: press Enter to build · Space tries the next way' : ui.pointer === 'touch' ? 'It fits here: lift your finger to set it' : 'It fits here: click to build it', step: 1, avatar: null, thinking: false };
  if (ui.held) return { guild: g, text: head, sub: ui.pointer === 'touch' ? 'Drag it onto a glowing corner, or tap a corner' : ui.pointer === 'keyboard' ? 'Arrows move it, Space finds a fit, Enter builds' : 'Drag it onto a glowing corner · R turns, F flips', step: 1, avatar: null, thinking: false };
  return { guild: g, text: head, sub: `${tapVerb(ui.pointer)} a piece (big ones first!)`, step: 0, avatar: null, thinking: false };
}
