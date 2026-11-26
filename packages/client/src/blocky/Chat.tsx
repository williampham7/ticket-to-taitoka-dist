import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EMOTES, emoteMessage, textMessage, type ChatLine, type ChatPayload } from '../lib/chat';
import { Icon } from './art/icons';
import { nameOf } from './text';

/** Fresh chat lines as cloud bubbles over each speaker's banner, for 5 seconds (keyed by seat). */
export function useChatBubbles(lines: ChatLine[]): Record<string, ReactNode> {
  const [fresh, setFresh] = useState<ChatLine[]>([]);
  const last = useRef(lines.length);
  useEffect(() => {
    if (lines.length <= last.current) { last.current = lines.length; return; }
    const add = lines.slice(last.current);
    last.current = lines.length;
    setFresh((f) => [...f, ...add].slice(-4));
    const t = setTimeout(() => setFresh((f) => f.filter((x) => !add.includes(x))), 5000);
    return () => clearTimeout(t);
  }, [lines]);
  const out: Record<string, ReactNode> = {};
  for (const l of fresh) out[l.sender] = <span className={`bly-bubble bly-cloud${l.kind === 'emote' ? '' : ' bly-bubble-text'}`} title={l.label}>{l.text}</span>;
  return out;
}

/** The chat cloud: emotes and short messages (online only; spectators read). */
export function BlyChat({ lines, send, names, readOnly, onClose }: { lines: ChatLine[]; send: (p: ChatPayload) => void; names: Record<string, string>; readOnly?: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const submit = () => { const m = textMessage(text); if (m) { send(m); setText(''); } };
  return (
    <div className="bly-chat bly-cloud" role="dialog" aria-label="Chat">
      <header><b>Chat</b><button type="button" className="bly-key bly-key-sm bly-key-icon" aria-label="Close chat" onClick={onClose}><Icon name="cancel" size={18} /></button></header>
      <ol className="bly-chat-lines">{lines.slice(-30).map((l) => <li key={l.id}><b>{nameOf(names, l.sender)}</b> <span className={l.kind === 'emote' ? 'bly-emote' : undefined} title={l.label}>{l.text}</span></li>)}</ol>
      {!readOnly && <>
        <div className="bly-emotes">{EMOTES.slice(0, 10).map((e) => <button key={e.id} type="button" title={e.label} aria-label={e.label} onClick={() => send(emoteMessage(e.id))}>{e.glyph}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={160} placeholder="Say something…" aria-label="Message" />
          <button type="submit" className="bly-key bly-key-sm">Send</button>
        </form>
      </>}
    </div>
  );
}
