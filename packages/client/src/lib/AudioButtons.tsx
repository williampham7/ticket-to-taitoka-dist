import { useEffect, useRef, useState } from 'react';
import { setMusicOn, useMusicOn } from './music';
import { setMuted, setVolume, useMuted, useVolume } from './sound';
import { HSR } from '../theme';

const btn = `grid h-9 w-9 place-items-center rounded-lg border border-line bg-panel-2 text-ink transition-colors hover:border-ink${HSR ? ' hsr-audio-btn' : ''}`;

export function MusicButton({ className = '' }: { className?: string }) {
  const on = useMusicOn();
  return (
    <button type="button" onClick={() => setMusicOn(!on)} aria-pressed={on} aria-label={on ? 'Turn music off' : 'Turn music on'}
      title={on ? 'Music on' : 'Music off'} className={`${btn} ${on ? '' : 'opacity-60'} ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" fill="currentColor" />
        <circle cx="17" cy="16" r="3" fill="currentColor" />
        {!on && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

function SpeakerIcon({ silent, pct, size }: { silent: boolean; pct: number; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {silent ? <path d="M17 9l5 6M22 9l-5 6" /> : (
        <>
          <path d="M16.5 9.5a3.5 3.5 0 0 1 0 5" />
          {pct > 50 && <path d="M19 7a7 7 0 0 1 0 10" />}
        </>
      )}
    </svg>
  );
}

/**
 * A speaker button that opens a small panel underneath with the one volume level for music and
 * sound effects (remembered between games). The speaker inside the panel mutes everything; moving
 * the slider unmutes. Clicking outside or pressing Escape closes the panel.
 */
export function VolumeSlider({ className = '' }: { className?: string }) {
  const v = useVolume();
  const muted = useMuted();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pct = Math.round(v * 100);
  const silent = muted || pct === 0;

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true" aria-label="Volume"
        title={muted ? 'Muted' : `Volume ${pct}%`} data-testid="volume-button"
        className={`${btn} ${open ? 'border-ink' : ''} ${silent ? 'opacity-60' : ''}`}>
        <SpeakerIcon silent={silent} pct={pct} size={18} />
      </button>
      {open && (
        <div className={`absolute right-0 top-full z-50 mt-2 flex items-center gap-2 rounded-lg border border-line bg-panel-2 py-1.5 pl-1.5 pr-3 text-ink shadow-lg${HSR ? ' hsr-audio-panel' : ''}`} data-testid="volume-panel">
          <button type="button" onClick={() => setMuted(!muted)} aria-pressed={muted} aria-label={muted ? 'Unmute' : 'Mute'} data-testid="mute"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md hover:bg-panel">
            <SpeakerIcon silent={silent} pct={pct} size={17} />
          </button>
          <input type="range" min={0} max={100} step={5} value={pct}
            onChange={(e) => { setVolume(Number(e.target.value) / 100); if (muted) setMuted(false); }}
            aria-label="Volume level" aria-valuetext={muted ? `${pct}%, muted` : `${pct}%`} data-testid="volume"
            className={`volume-range w-[120px] ${muted ? 'opacity-45' : ''}`} style={{ ['--fill' as string]: `${pct}%` }} />
          <span className="w-9 text-right text-[13px] tabular-nums text-muted">{muted ? 'off' : `${pct}%`}</span>
        </div>
      )}
    </div>
  );
}
