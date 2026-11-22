import { useEffect, useRef, useState } from 'react';
import { CHAT_MAX, EMOTES, QUICK_PHRASES, emoteMessage, textMessage, type ChatLine, type ChatPayload } from '../lib/chat';
import { pick } from '../hsr/pick';

export interface ChatProps {
  lines: ChatLine[];
  send: (p: ChatPayload) => void;
}

interface Props extends ChatProps {
  me: string;
  names: Record<string, string>;
  fills: Record<string, string>;
}

/** Chat for LAN and online games: recent messages, a line to type in, and a panel of emotes and quick phrases. */
export function ChatPanel({ lines, send, me, names, fills }: Props) {
  const [draft, setDraft] = useState('');
  const [emotes, setEmotes] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  const box = useRef<HTMLDivElement>(null);

  // newest message in view
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  // the emote panel closes on Escape or a click anywhere else
  useEffect(() => {
    if (!emotes) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEmotes(false);
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setEmotes(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [emotes]);

  const submit = () => {
    const m = textMessage(draft);
    if (!m) return;
    send(m);
    setDraft('');
  };
  const quick = (p: ChatPayload) => { send(p); setEmotes(false); };

  return (
    <section data-testid="chat" ref={box} className="relative">
      <h2 className={pick('mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted', 'mb-1.5 text-[14px] font-medium text-muted')}>Chat</h2>
      <ol ref={list} data-testid="chat-log" aria-live="polite" aria-label="Chat messages"
        className={`mb-1.5 grid h-[104px] content-start gap-1 overflow-y-auto border border-line bg-panel-2/60 p-1.5 text-[13px] leading-snug ${pick('rounded-[10px]', 'rounded-md')}`}>
        {lines.length === 0 && <li className="px-1 text-muted">Say hi, or send an emote.</li>}
        {lines.slice(-40).map((l) => (
          <li key={l.id} data-chat-line={l.kind} className="select-text break-words px-1">
            <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: fills[l.sender] }} />
            <span className="font-semibold">{l.sender === me ? 'You' : names[l.sender] ?? 'Someone'}</span>
            {l.kind === 'emote'
              ? <span className="ml-1.5 align-middle text-[19px] leading-none" role="img" aria-label={l.label}>{l.text}</span>
              : <span>: {l.text}</span>}
          </li>
        ))}
      </ol>
      <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={CHAT_MAX} placeholder="Message…" aria-label="Chat message"
          data-testid="chat-input"
          className={pick('min-w-0 flex-1 rounded-[8px] border border-line-strong bg-panel px-2 py-1 text-[13px] transition-shadow focus:border-[#1d5fbf] focus:shadow-[0_0_0_3px_rgba(29,95,191,.16)] focus:outline-none', 'min-w-0 flex-1 rounded-md border border-line-strong bg-panel px-2 py-1 text-[13px] focus:border-ink focus:outline-none')} />
        <button type="button" onClick={() => setEmotes(!emotes)} aria-expanded={emotes} aria-label="Emotes" title="Emotes" data-testid="chat-emotes"
          className={`grid h-[30px] w-[30px] shrink-0 place-items-center border text-[16px] leading-none ${pick(`rounded-[8px] ${emotes ? 'border-[#1d5fbf] bg-[#1d5fbf]/10' : 'border-line-strong bg-panel hover:border-ink'}`, `rounded-md ${emotes ? 'border-ink bg-mustard' : 'border-line-strong bg-panel hover:border-ink'}`)}`}>
          🙂
        </button>
        <button type="submit" disabled={!draft.trim()} aria-label="Send" title="Send" data-testid="chat-send"
          className={pick('grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] bg-poster text-white transition-colors enabled:hover:bg-poster-dark disabled:bg-line-strong', 'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-md bg-poster text-[#fff6e6] disabled:bg-muted/40')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 11.5 21 3l-6.5 18-3-7.5z" /></svg>
        </button>
      </form>
      {emotes && (
        <div role="dialog" aria-label="Emotes and quick phrases" data-testid="emote-panel"
          className={`pop absolute bottom-[38px] right-0 z-30 w-[212px] p-2 ${pick('rounded-[14px] border border-line bg-panel shadow-[0_12px_32px_rgba(20,33,61,.22)]', 'rounded-xl border-2 border-ink bg-ticket shadow-[0_10px_30px_rgba(59,42,30,.35)]')}`}>
          <div className="grid grid-cols-5 gap-1">
            {EMOTES.map((e) => (
              <button key={e.id} type="button" onClick={() => quick(emoteMessage(e.id))} aria-label={e.label} title={e.label} data-emote={e.id}
                className="grid h-8 place-items-center rounded-md text-[20px] leading-none transition hover:scale-125 hover:bg-panel-2">
                {e.glyph}
              </button>
            ))}
          </div>
          <div className={`mt-2 flex flex-wrap gap-1 border-t pt-2 ${pick('border-line', 'border-dashed border-line-strong')}`}>
            {QUICK_PHRASES.map((p) => (
              <button key={p} type="button" onClick={() => quick(textMessage(p)!)} data-quick={p}
                className={pick('rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[12px] hover:border-[#1d5fbf] hover:text-[#1d5fbf]', 'rounded-full border border-line-strong bg-panel px-2 py-0.5 text-[12px] hover:border-ink')}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
