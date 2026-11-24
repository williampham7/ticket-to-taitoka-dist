import { useState, type ReactNode } from 'react';

export const btn = 'fleet-btn';
export const btnPrimary = 'fleet-btn primary';

/** A centred console panel for the short in-between screens (hosting, joining, no seat). */
export function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="fleet fleet-shell">
      <section className="fleet-panel grid w-full max-w-[380px] gap-3">
        <h1 className="fleet-h">{title}</h1>
        {children}
      </section>
    </main>
  );
}

export function CopyLink({ url, testid }: { url: string; testid: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        const t = document.createElement('textarea');
        t.value = url; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
      }
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="fleet-mono min-w-0 flex-1 select-all break-all text-[12px] opacity-85">{url}</span>
      <button type="button" className={`${btn} shrink-0 ${copied ? 'on' : ''}`} onClick={copy} data-testid={testid}>{copied ? 'Copied' : 'Copy link'}</button>
    </div>
  );
}
