/**
 * In-game chat (LAN / online games). Messages travel through boardgame.io's chat relay as
 * `{ kind: 'text', text }` or `{ kind: 'emote', id }`; anything else received is ignored.
 */
export const CHAT_MAX = 160;

export interface Emote { id: string; glyph: string; label: string }

export const EMOTES: Emote[] = [
  { id: 'thumbs', glyph: '👍', label: 'Thumbs up' },
  { id: 'laugh', glyph: '😂', label: 'Laughing' },
  { id: 'wow', glyph: '😮', label: 'Wow' },
  { id: 'sad', glyph: '😢', label: 'Sad' },
  { id: 'angry', glyph: '😠', label: 'Angry' },
  { id: 'cool', glyph: '😎', label: 'Cool' },
  { id: 'think', glyph: '🤔', label: 'Thinking' },
  { id: 'clap', glyph: '👏', label: 'Applause' },
  { id: 'party', glyph: '🎉', label: 'Celebrate' },
  { id: 'heart', glyph: '❤️', label: 'Love' },
  { id: 'train', glyph: '🚂', label: 'Choo choo' },
  { id: 'sweat', glyph: '😅', label: 'Phew' },
  { id: 'devil', glyph: '😈', label: 'Devilish' },
  { id: 'fuming', glyph: '🤬', label: 'Fuming' },
  { id: 'clown', glyph: '🤡', label: 'Clown' },
  { id: 'skull', glyph: '💀', label: 'Dead' },
  { id: 'monkey', glyph: '🙈', label: "Can't look" },
  { id: 'smirk', glyph: '😏', label: 'Smirk' },
  { id: 'mindblown', glyph: '🤯', label: 'Mind blown' },
  { id: 'partyface', glyph: '🥳', label: 'Party' },
];

export const QUICK_PHRASES = ['Good game!', 'Nice route!', 'Hurry up!', 'Oops!'];

export type ChatPayload = { kind: 'text'; text: string } | { kind: 'emote'; id: string };

/** A received message, checked and ready to show. `text` is the words or the emote's glyph. */
export interface ChatLine { id: string; sender: string; kind: 'text' | 'emote'; text: string; label?: string }

export function textMessage(raw: string): { kind: 'text'; text: string } | null {
  const text = raw.trim().slice(0, CHAT_MAX);
  return text ? { kind: 'text', text } : null;
}

export function emoteMessage(id: string): ChatPayload {
  return { kind: 'emote', id };
}

const EMOTE_BY_ID = Object.fromEntries(EMOTES.map((e) => [e.id, e]));

export function readChat(msg: { id: string; sender: string; payload: unknown }): ChatLine | null {
  if (typeof msg.sender !== 'string' || typeof msg.id !== 'string') return null;
  const p = msg.payload as Partial<Record<string, unknown>> | null;
  if (!p || typeof p !== 'object') return null;
  if (p.kind === 'text' && typeof p.text === 'string') {
    const t = textMessage(p.text);
    return t ? { id: msg.id, sender: msg.sender, kind: 'text', text: t.text } : null;
  }
  if (p.kind === 'emote' && typeof p.id === 'string' && EMOTE_BY_ID[p.id]) {
    const e = EMOTE_BY_ID[p.id];
    return { id: msg.id, sender: msg.sender, kind: 'emote', text: e.glyph, label: e.label };
  }
  return null;
}
