import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { EMOTES, emoteMessage, textMessage, type ChatLine, type ChatPayload } from '../lib/chat';
import { HERO_COLOR } from './text';

/** Online chat as speech-bubble scrolls: the newest float up over the board for a few seconds; the panel keeps them all. */
export function ChatPanel({ lines, send, names, heroOf, readOnly }: { lines: ChatLine[]; send: (p: ChatPayload) => void; names: Record<string, string>; heroOf: (p: string) => number; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(lines.length);
  const [fresh, setFresh] = useState<ChatLine[]>([]);
  const last = useRef(lines.length);
  useEffect(() => {
    if (lines.length <= last.current) { last.current = lines.length; return; }
    const add = lines.slice(last.current);
    last.current = lines.length;
    setFresh((f) => [...f, ...add].slice(-3));
    const t = setTimeout(() => setFresh((f) => f.filter((x) => !add.includes(x))), 5000);
    return () => clearTimeout(t);
  }, [lines]);
  useEffect(() => { if (open) setSeen(lines.length); }, [open, lines.length]);
  const submit = () => { const m = textMessage(text); if (m) { send(m); setText(''); } };
  const who = (p: string) => names[p] ?? `Player ${Number(p) + 1}`;
  return (
    <>
      <div className="kg-bubbles" aria-live="polite">
        {!open && fresh.map((l) => (
          <div key={l.id} className={`kg-bubble${l.kind === 'emote' ? ' kg-bubble-emote' : ''}`} style={{ ['--pc' as string]: HERO_COLOR[heroOf(l.sender)] } as CSSProperties}>
            <b>{who(l.sender)}</b><span>{l.text}</span>
          </div>
        ))}
      </div>
      <button type="button" className="kg-btn kg-chat-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="kg-chat">
        ✉{lines.length > seen && !open && <span className="kg-badge">{lines.length - seen}</span>}
      </button>
      {open && (
        <div className="kg-chat" role="dialog" aria-label="Chat">
          <ol className="kg-chat-lines">
            {lines.slice(-40).map((l) => (
              <li key={l.id} style={{ ['--pc' as string]: HERO_COLOR[heroOf(l.sender)] } as CSSProperties}><b>{who(l.sender)}</b> <span className={l.kind === 'emote' ? 'kg-emote' : undefined} title={l.label}>{l.text}</span></li>
            ))}
          </ol>
          {!readOnly && <><div className="kg-emotes">{EMOTES.slice(0, 10).map((e) => <button key={e.id} type="button" title={e.label} onClick={() => send(emoteMessage(e.id))}>{e.glyph}</button>)}</div>
          <form className="kg-chat-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={160} placeholder="Say something…" aria-label="Message" />
            <button type="submit" className="kg-btn kg-btn-sm">Send</button>
          </form></>}
        </div>
      )}
    </>
  );
}
