import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { usePath } from '../lib/router';
import { HSR } from '../theme';
import { QRCodeSVG } from 'qrcode.react';
import {
  PARTY_MAX, clearNotice, inviteUrl, isFollower, isHost, kick, leaveParty, rename, setFirstName, usePartyState,
} from '../lib/party';

/**
 * The party controls: a "Party" button with one dot per seat (blue = a person), and its panel. They take the
 * page's colours from the theme tokens, like the volume buttons; the dark screens (edition picker, Frontline,
 * the hold screen) get a dark set of the same tokens. Screens with a top bar place the button in it (`inline`),
 * next to the sound controls; elsewhere it sits in the top-right corner.
 */
const BLUE = '#3b82f6';
const panel = 'rounded-xl border border-line bg-panel text-ink shadow-[0_18px_48px_rgba(0,0,0,.28)]';
const field = 'min-h-[36px] w-full rounded-md border border-line-strong bg-paper px-2.5 text-[15px] text-ink outline-none focus:outline-none focus-visible:outline-none focus:border-ink';
const smallBtn = 'rounded-md border border-line px-2.5 py-1 text-[13px] hover:border-ink disabled:opacity-50';
const PICKER_DARK = { '--color-panel': '#2b3138', '--color-panel-2': '#353c44', '--color-paper': '#1f2429', '--color-ink': '#f1ede4', '--color-line': '#4d5661', '--color-line-strong': '#66707c', '--color-muted': '#b5bcc4' } as CSSProperties;
const FRONTLINE_DARK = { '--color-panel': '#1e2320', '--color-panel-2': '#2a302b', '--color-paper': '#161a15', '--color-ink': '#e8e6df', '--color-line': '#556b2f', '--color-line-strong': '#6b7f45', '--color-muted': '#b9b6aa' } as CSSProperties;
const WARFRONT_DARK = { '--color-panel': '#2a1d12', '--color-panel-2': '#3a2818', '--color-paper': '#1d140c', '--color-ink': '#f4e7c8', '--color-line': '#7d5a2a', '--color-line-strong': '#b08a45', '--color-muted': '#cdb990' } as CSSProperties; // Warfront
const FLEET_DARK = { '--color-panel': '#0f1a26', '--color-panel-2': '#16243a', '--color-paper': '#0a121c', '--color-ink': '#dbe7f3', '--color-line': '#22405c', '--color-line-strong': '#2f5a80', '--color-muted': '#8aa3bb' } as CSSProperties;
/** Token overrides for the screens drawn in fixed dark colours. */
function useDarkTokens(): CSSProperties | undefined {
  const path = usePath();
  if (path.startsWith('/frontline')) return FRONTLINE_DARK;
  if (path.startsWith('/fleet')) return FLEET_DARK;
  if (path.startsWith('/warfront')) return WARFRONT_DARK; // Warfront
  if (path === '/' || path.startsWith('/party')) return PICKER_DARK;
  return undefined;
}

// how many inline buttons are on screen: the corner one only shows when there are none
let inlineCount = 0;
const inlineListeners = new Set<() => void>();
const setInline = (d: number) => { inlineCount += d; inlineListeners.forEach((l) => l()); };
const useInlineCount = () => useSyncExternalStore((cb) => { inlineListeners.add(cb); return () => inlineListeners.delete(cb); }, () => inlineCount);

export function PartyDots({ filled }: { filled: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: PARTY_MAX }, (_, i) => (
        <span key={i} className="h-2 w-2 rounded-full" style={i < filled ? { background: BLUE } : { boxShadow: 'inset 0 0 0 1.5px var(--color-muted)' }} />
      ))}
    </span>
  );
}

export function PartyButton({ inline = false }: { inline?: boolean }) {
  const s = usePartyState();
  const dark = useDarkTokens();
  const inlineHere = useInlineCount();
  useEffect(() => { if (!inline) return; setInline(1); return () => setInline(-1); }, [inline]);
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
  if (!s.name || (!inline && inlineHere > 0)) return null;
  return (
    <div ref={root} style={dark} className={inline ? 'relative' : 'fixed right-3 top-3 z-[95] sm:right-4 sm:top-4'}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} data-testid="party-button" data-party-count={count}
        aria-label={`Party: ${count} of ${PARTY_MAX}`}
        className={`flex h-9 items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 text-[14px] font-semibold text-ink transition-colors hover:border-ink${HSR ? ' hsr-audio-btn' : ''}`}>
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
    <div className={`${panel} absolute right-0 top-full z-[95] mt-2 w-[310px] max-w-[calc(100vw-24px)] p-4`} data-testid="party-panel" role="dialog" aria-label="Party">
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
            {m.id === p?.host && <span className="rounded-full bg-panel-2 px-2 text-[11px]">host</span>}
            {host && m.id !== s.me?.id && (
              <button type="button" className={`${smallBtn} ml-auto`} onClick={() => void kick(m.id)} data-testid={`kick-${m.name}`}>Remove</button>
            )}
          </li>
        ))}
        {Array.from({ length: Math.max(0, PARTY_MAX - (p?.members.length ?? 1)) }, (_, i) => (
          <li key={`open-${i}`} className="flex items-center gap-2 text-[14px] opacity-50">
            <span className="h-2.5 w-2.5 rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-muted)' }} />Open
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
              <div className="select-text break-all text-[13px] text-ink underline decoration-dotted underline-offset-2" data-testid="party-url">{url}</div>
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
  const dark = useDarkTokens();
  if (s.name) return null;
  const go = () => { if (name.trim()) void setFirstName(name); };
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]" style={dark}>
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
    <main className="grid h-full place-items-center bg-[#2b3138] p-6 text-center text-[#f1ede4]" data-testid="party-hold">
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
