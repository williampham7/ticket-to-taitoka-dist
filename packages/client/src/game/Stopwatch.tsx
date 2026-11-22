import { useEffect, useState } from 'react';

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Game clock, counting from the deal. Stops when the game ends. */
export function Stopwatch({ startedAt, endedAt }: { startedAt: number; endedAt: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (endedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endedAt]);
  return (
    <div className="flex w-[104px] shrink-0 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 tabular-nums text-[14px]" title="Game time" data-testid="timer">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
        <circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3" />
      </svg>
      <span aria-label="Game time" className="flex-1 text-center">{formatDuration((endedAt ?? now) - startedAt)}</span>
    </div>
  );
}
