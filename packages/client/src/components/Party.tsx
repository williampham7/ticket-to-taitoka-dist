import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  PARTY_MAX, clearNotice, inviteUrl, isFollower, isHost, kick, leaveParty, rename, setFirstName, usePartyState,
} from '../lib/party';

/**
 * The party controls, the same on every screen (drawn with fixed colours, not the theme tokens):
 * a "Party" button in the top-right corner with one dot per seat (blue = a person), and its panel.
 */
const BLUE = '#3b82f6';
const panel = 'rounded-xl border border-white/15 bg-[#1b2029]/95 text-[#eef1f6] shadow-[0_18px_48px_rgba(0,0,0,.45)] backdrop-blur';
const field = 'min-h-[36px] w-full rounded-md border border-white/20 bg-[#10141b] px-2.5 text-[15px] text-white outline-none focus:border-[#3b82f6]';
const smallBtn = 'rounded-md border border-white/20 px-2.5 py-1 text-[13px] hover:border-white/50 disabled:opacity-50';

export function PartyDots({ filled }: { filled: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: PARTY_MAX }, (_, i) => (
        <span key={i} className="h-2 w-2 rounded-full" style={i < filled ? { background: BLUE } : { boxShadow: 'inset 0 0 0 1.5px #9aa6b8' }} />
      ))}
    </span>
  );
}

export function PartyButton() {
  const s = usePartyState();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const count = s.party?.members.length ?? 1;
  useEffect(() => { if (s.notice) setOpen(true); }, [s.notice]);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  if (!s.name) return null;
  return (
    <div ref={root} className="fixed right-3 top-3 z-[95] sm:right-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="party-button" data-party-count={count}
        aria-label={`Party: ${count} of ${PARTY_MAX}`}
        className="flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-[#1b2029]/90 px-3 text-[14px] font-semibold text-white shadow-md backdrop-blur hover:border-white/40">
        Party <PartyDots filled={count} />
      </button>
      {open && <PartyPanel onClose={() => setOpen(false)} />}
    </div>
  );
}

function PartyPanel({ onClose }: { onClose: () => void }) {
  const s = usePartyState();
  const p = s.party;
  const host = isHost(s);
  const [name, setName] = useState(s.name);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (p) void inviteUrl(p.id).then(setUrl); }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearNotice(), []);
  const copy = () => { void navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const saveName = () => void rename(name);
  return (
    <div className={`${panel} absolute right-0 top-full mt-2 w-[310px] max-w-[calc(100vw-24px)] p-4`} data-testid="party-panel" role="dialog" aria-label="Party">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Party</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[18px] leading-none opacity-70 hover:opacity-100">×</button>
      </div>
      {s.notice && <p className="mt-2 rounded-md bg-[#3b82f6]/20 px-2.5 py-1.5 text-[13px]" data-testid="party-notice">{s.notice}</p>}
      <ul className="mt-3 grid gap-1.5" data-testid="party-members">
        {(p?.members ?? []).map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-[15px]" data-member={m.name}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: BLUE }} />
            <span className="min-w-0 truncate font-semibold">{m.name}</span>
            {m.id === s.me?.id && <span className="text-[12px] opacity-60">(you)</span>}
            {m.id === p?.host && <span className="rounded-full bg-white/15 px-2 text-[11px]">host</span>}
            {host && m.id !== s.me?.id && (
              <button type="button" className={`${smallBtn} ml-auto`} onClick={() => void kick(m.id)} data-testid={`kick-${m.name}`}>Remove</button>
            )}
          </li>
        ))}
        {Array.from({ length: Math.max(0, PARTY_MAX - (p?.members.length ?? 1)) }, (_, i) => (
          <li key={`open-${i}`} className="flex items-center gap-2 text-[14px] opacity-50">
            <span className="h-2.5 w-2.5 rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px #9aa6b8' }} />Open
          </li>
        ))}
      </ul>

      <label className="mt-4 grid gap-1 text-[12px] uppercase tracking-wide opacity-70">Your name
        <span className="flex gap-2 normal-case tracking-normal opacity-100">
          <input className={field} value={name} maxLength={16} data-testid="party-name" onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()} />
          <button type="button" className={smallBtn} onClick={saveName} disabled={!name.trim() || name.trim() === s.name} data-testid="party-name-save">Save</button>
        </span>
      </label>

      {host ? (
        <div className="mt-4">
          <div className="text-[12px] uppercase tracking-wide opacity-70">Invite friends</div>
          <div className="mt-1.5 flex gap-3">
            {url && <div className="shrink-0 rounded-md bg-white p-1.5"><QRCodeSVG value={url} size={84} /></div>}
            <div className="min-w-0 flex-1">
              <div className="select-text break-all text-[13px] text-[#9cc3ff]" data-testid="party-url">{url}</div>
              <button type="button" className={`${smallBtn} mt-2`} onClick={copy} data-testid="party-copy">{copied ? 'Copied' : 'Copy link'}</button>
            </div>
          </div>
          <p className="mt-2 text-[12px] leading-snug opacity-60">Everyone in the party follows you to the menus, waiting rooms and games.</p>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[12.5px] leading-snug opacity-70">The host leads: your screen follows theirs.</p>
          <button type="button" className={smallBtn} onClick={() => void leaveParty()} data-testid="party-leave">Leave party</button>
        </div>
      )}
    </div>
  );
}

/** First visit: ask for the name everyone in a party sees. */
export function NamePrompt() {
  const s = usePartyState();
  const [name, setName] = useState('');
  if (s.name) return null;
  const go = () => { if (name.trim()) void setFirstName(name); };
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className={`${panel} w-[340px] max-w-full p-5`} role="dialog" aria-label="Your name" data-testid="name-prompt">
        <h2 className="text-[20px] font-bold">What should we call you?</h2>
        <p className="mt-1 text-[14px] opacity-70">Other players see this name. You can change it later in Party.</p>
        <input className={`${field} mt-3`} autoFocus maxLength={16} value={name} placeholder="Your name" data-testid="first-name"
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        <button type="button" onClick={go} disabled={!name.trim()} data-testid="first-name-go"
          className="mt-3 w-full rounded-md bg-[#3b82f6] py-2 text-[15px] font-semibold text-white disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
}

/** A member's screen while the host plays on their own device, or in a game this member has no seat in. */
export function PartyHold() {
  const s = usePartyState();
  const hostName = s.party?.members.find((m) => m.id === s.party?.host)?.name ?? 'The host';
  const follower = isFollower(s);
  return (
    <main className="grid h-full place-items-center bg-[#1b2029] p-6 text-center text-[#eef1f6]" data-testid="party-hold">
      <div className="max-w-sm">
        <h1 className="text-[24px] font-bold">{follower ? `${hostName} is playing` : 'Nothing to follow'}</h1>
        <p className="mt-2 text-[15px] opacity-75">
          {follower ? 'They are in a game on their own device, or one you have no seat in. You will follow them as soon as they are back.' : 'You are not following anyone.'}
        </p>
        {!follower && <a href="/" className="mt-4 inline-block underline">Main menu</a>}
      </div>
    </main>
  );
}
