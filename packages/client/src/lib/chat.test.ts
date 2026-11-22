import { describe, expect, it } from 'vitest';
import { CHAT_MAX, EMOTES, QUICK_PHRASES, readChat, textMessage } from './chat';

describe('chat messages', () => {
  it('turns typed text into a message, trimmed and capped', () => {
    expect(textMessage('  hello there  ')).toEqual({ kind: 'text', text: 'hello there' });
    expect(textMessage('   ')).toBeNull();
    expect(textMessage('x'.repeat(CHAT_MAX + 50))!.text).toHaveLength(CHAT_MAX);
  });

  it('reads text and emotes received from other players', () => {
    expect(readChat({ id: 'a', sender: '1', payload: { kind: 'text', text: 'gg' } })).toEqual({ id: 'a', sender: '1', kind: 'text', text: 'gg' });
    const e = EMOTES[0];
    expect(readChat({ id: 'b', sender: '0', payload: { kind: 'emote', id: e.id } })).toEqual({ id: 'b', sender: '0', kind: 'emote', text: e.glyph, label: e.label });
  });

  it('ignores anything malformed, unknown or oversized (messages come from the network)', () => {
    for (const payload of [null, 'plain string', 42, {}, { kind: 'text' }, { kind: 'text', text: 5 }, { kind: 'text', text: '   ' },
      { kind: 'emote', id: 'nope' }, { kind: 'html', text: '<b>x</b>' }]) {
      expect(readChat({ id: 'x', sender: '0', payload }), JSON.stringify(payload)).toBeNull();
    }
    expect(readChat({ id: 'x', sender: 7 as unknown as string, payload: { kind: 'text', text: 'hi' } })).toBeNull();
    expect(readChat({ id: 'x', sender: '0', payload: { kind: 'text', text: 'y'.repeat(CHAT_MAX + 1) } })!.text).toHaveLength(CHAT_MAX);
  });

  it('offers a dozen distinct emotes and a few quick phrases', () => {
    expect(EMOTES.length).toBeGreaterThanOrEqual(20);
    for (const g of ['😈', '🤬', '🤡', '💀']) expect(EMOTES.map((e) => e.glyph)).toContain(g);
    expect(new Set(EMOTES.map((e) => e.id)).size).toBe(EMOTES.length);
    expect(new Set(EMOTES.map((e) => e.glyph)).size).toBe(EMOTES.length);
    for (const p of QUICK_PHRASES) expect(textMessage(p)).not.toBeNull();
  });
});
