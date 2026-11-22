import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ROUTE_BY_ID, ROUTE_POINTS, type Card, type Hand } from '@boboland/shared';
import { cityName, cityNameZh } from '../lib/skin';
import { Swatch } from './CardFace';
import { HSR, cardName } from '../theme';
import { pick } from '../hsr/pick';

interface Props {
  routeId: string;
  options: Card[];
  hand: Hand;
  /** viewport coordinates of the click */
  at: { x: number; y: number };
  onClaim: (c: Card) => void;
  onClose: () => void;
}

const MARGIN = 12;

/** Confirm a claim: preview exactly which cards will be spent, pick a combination when there's a choice. */
export function ClaimPicker({ routeId, options, hand, at, onClaim, onClose }: Props) {
  const route = ROUTE_BY_ID[routeId];
  const zhA = cityNameZh(route.a), zhB = cityNameZh(route.b);
  const locosFor = (c: Card) => (c === 'locomotive' ? route.length + 1 : route.length - Math.min(hand[c], route.length));
  // cheapest first: no locomotives spent, then fewest; all-locomotive payment last
  const sorted = [...options].sort((x, y) => locosFor(x) - locosFor(y));
  const [choice, setChoice] = useState<Card>(sorted[0]);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') onClaim(choice);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onClaim, choice]);

  // Always fully on screen: prefer above the click, else below, clamped to the viewport; scrolls if taller.
  useLayoutEffect(() => {
    const el = ref.current!;
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    let top = at.y - h - 16;
    if (top < MARGIN) top = at.y + 16;
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
    const left = Math.max(MARGIN, Math.min(at.x - w / 2, vw - w - MARGIN));
    setPos({ left, top });
  }, [at.x, at.y, options.length]);

  const parts = (c: Card) => {
    const coloured = c === 'locomotive' ? 0 : Math.min(hand[c], route.length);
    return { coloured, locos: route.length - coloured };
  };

  return (
    <>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div ref={ref} role="dialog" aria-label="Confirm route claim" data-testid="claim-picker"
        className={`fade-in fixed z-[75] flex w-72 flex-col ${pick('overflow-hidden rounded-[14px] border border-line bg-panel shadow-[0_18px_50px_rgba(20,33,61,.3)]', 'rounded-xl border-2 border-ink bg-ticket shadow-2xl shadow-ink/40')}`}
        style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, maxHeight: `calc(100vh - ${MARGIN * 2}px)` }}>
        <div className={pick('hsr-claim-head border-b border-line px-3.5 pb-2.5 pt-3', 'border-b border-line px-3.5 pb-2 pt-3')}>
          {HSR && zhA && zhB && <div className="mb-0.5 text-[11px] font-bold tracking-[0.08em] text-[#1d5fbf]" style={{ fontFamily: 'var(--font-zh)' }}>{zhA} – {zhB}</div>}
          <div className="font-display text-[16px] leading-tight">{cityName(route.a)} – {cityName(route.b)}</div>
          <div className="text-[13px] text-muted">{route.length} {route.length === 1 ? 'train' : 'trains'}, worth {ROUTE_POINTS[route.length]} points</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5" role="radiogroup" aria-label="Cards to pay with">
          <div className="mb-1.5 text-[13px] text-muted">{options.length === 1 ? 'You will spend' : 'Pay with'}</div>
          <div className="grid gap-1.5">
            {sorted.map((c) => {
              const { coloured, locos } = parts(c);
              const on = c === choice;
              return (
                <button key={c} type="button" role="radio" aria-checked={on} onClick={() => setChoice(c)} data-pay={c}
                  className={`flex items-center gap-2 border-2 px-2.5 py-2 text-left text-[14px] transition-colors ${pick(`rounded-[10px] ${on ? 'border-poster bg-poster/[.05]' : 'border-line bg-panel hover:border-line-strong'}`, `rounded-lg ${on ? 'border-poster bg-paper' : 'border-line bg-panel hover:border-ink'}`)}`}>
                  <span className="flex flex-wrap gap-0.5">
                    {Array.from({ length: coloured }, (_, k) => <Swatch key={`c${k}`} card={c} />)}
                    {Array.from({ length: locos }, (_, k) => <Swatch key={`l${k}`} card="locomotive" />)}
                  </span>
                  <span className="ml-auto text-right leading-tight">
                    {coloured > 0 && `${coloured} ${cardName(c).toLowerCase()}`}
                    {coloured > 0 && locos > 0 && ' + '}
                    {locos > 0 && `${locos} ${locos === 1 ? 'locomotive' : 'locomotives'}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 border-t border-line px-3.5 py-2.5">
          <button type="button" onClick={onClose} className={pick('rounded-[10px] border border-line-strong bg-panel px-3 py-1.5 text-[14px] hover:border-ink', 'rounded-lg border-2 border-ink bg-panel px-3 py-1.5 text-[14px]')}>Cancel</button>
          <button type="button" autoFocus onClick={() => onClaim(choice)} data-testid="confirm-claim"
            className={pick('ml-auto rounded-[10px] bg-poster px-4 py-1.5 font-display text-[16px] text-white shadow-[0_2px_8px_rgba(200,16,46,.3)] hover:bg-poster-dark active:translate-y-px', 'ml-auto rounded-lg bg-poster px-4 py-1.5 font-display text-[15px] text-[#fff6e6] shadow-[0_3px_0_#8e2d24] active:translate-y-0.5 active:shadow-none')}>
            Claim route
          </button>
        </div>
      </div>
    </>
  );
}
