import { createRoot } from 'react-dom/client';
import { createElement, type ReactElement } from 'react';

/**
 * Card animations drawn above everything, so every player sees what was taken and where it went.
 * Imperative on purpose: they never touch React state, so the game never waits for them —
 * except pass-and-play, which asks `busyRemaining()` before handing the screen over.
 */
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let busyUntil = 0;
export function markBusy(ms: number) {
  busyUntil = Math.max(busyUntil, Date.now() + ms);
}
export function busyRemaining(): number {
  return Math.max(0, busyUntil - Date.now());
}

function mount(el: ReactElement, rect: DOMRect): HTMLDivElement {
  const host = document.createElement('div');
  host.className = 'pointer-events-none fixed z-[80]';
  Object.assign(host.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: '64px', height: '92px' });
  document.body.appendChild(host);
  createRoot(host).render(el);
  return host;
}

const centre = (r: DOMRect) => ({ x: r.left + r.width / 2 - 32, y: r.top + r.height / 2 - 46 });

/** Quick move from one element to another (used for small extras like ticket stubs). */
export async function flyCard(el: ReactElement, from: DOMRect, to: DOMRect, opts: { duration?: number; endScale?: number } = {}) {
  if (reduced()) return;
  const duration = opts.duration ?? 700;
  markBusy(duration);
  const host = mount(el, from);
  const a = centre(from), b = centre(to);
  host.style.left = `${a.x}px`;
  host.style.top = `${a.y}px`;
  const anim = host.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${(b.x - a.x) / 2}px, ${(b.y - a.y) / 2 - 40}px) scale(1.12) rotate(-6deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(${opts.endScale ?? 0.45}) rotate(0deg)`, opacity: 0.2 },
    ],
    { duration, easing: 'cubic-bezier(.3,.7,.3,1)' },
  );
  await anim.finished.catch(() => {});
  host.remove();
}

const GROW_MS = 280;
const FLY_MS = 430;
const QUICK_HOLD_MS = 140;
let queueEnd = 0;
let waiting = 0;
let queue: Promise<void> = Promise.resolve();

/**
 * The "showcase": a card leaves its pile, grows in the middle of the screen with a caption
 * ("Bo took a red card"), holds briefly, then flies to where it's going.
 * Showcases take turns in the middle, but never bottleneck quick play: if another card is already
 * waiting, the current one cuts its hold short, and the next one rises while the last is still flying away.
 */
export function showcase(el: ReactElement, caption: string, from: DOMRect, to: DOMRect, hold = 600): Promise<void> {
  if (reduced()) return Promise.resolve();
  const now = Date.now();
  const start = Math.max(now, queueEnd);
  if (start - now > 4000) return queue; // never let a backlog build
  waiting++;
  queueEnd = start + GROW_MS + (waiting > 1 ? QUICK_HOLD_MS : hold);
  markBusy(queueEnd - now + FLY_MS + 50);
  let landed!: () => void;
  const arrival = new Promise<void>((r) => { landed = r; });
  queue = queue.then(() => play(el, caption, from, to, hold, landed));
  return arrival;
}

async function play(el: ReactElement, caption: string, from: DOMRect, to: DOMRect, hold: number, landed: () => void) {
  waiting--;
  // centred on the 64px card slot whatever its width (a ticket is wider than a train card), caption underneath
  const host = mount(createElement('div', { className: 'absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center gap-2' }, el,
    createElement('div', { className: 'whitespace-nowrap rounded-full border-2 border-[#f3e8cf]/60 bg-ink px-3 py-1 font-display text-[12px] tracking-[0.02em] text-paper shadow-lg' }, caption)), from);
  const a = centre(from);
  const mid = { x: window.innerWidth / 2 - 32, y: window.innerHeight / 2 - 90 };
  const b = centre(to);
  host.style.left = `${a.x}px`;
  host.style.top = `${a.y}px`;
  const grow = host.animate(
    [
      { transform: 'translate(0,0) scale(.7) rotate(0deg)', opacity: 0.5 },
      { transform: `translate(${mid.x - a.x}px, ${mid.y - a.y}px) scale(1.8) rotate(-3deg)`, opacity: 1 },
    ],
    { duration: GROW_MS, easing: 'cubic-bezier(.2,.8,.3,1.15)', fill: 'forwards' },
  );
  await grow.finished.catch(() => {});
  // hold in the middle, but let a waiting card cut it short
  const until = Date.now() + hold;
  while (Date.now() < until && !(waiting > 0 && Date.now() >= until - hold + QUICK_HOLD_MS)) {
    await new Promise((r) => setTimeout(r, 40));
  }
  const go = host.animate(
    [
      { transform: `translate(${mid.x - a.x}px, ${mid.y - a.y}px) scale(1.8) rotate(-3deg)`, opacity: 1 },
      { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(.55) rotate(0deg)`, opacity: 0.25 },
    ],
    { duration: FLY_MS, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' },
  );
  // the next showcase may start rising now; this one finishes its flight on its own
  void go.finished.catch(() => {}).then(() => { host.remove(); landed(); });
}

/** Your own blind draw: same showcase, slightly shorter hold. */
export const revealThenFly = (el: ReactElement, caption: string, from: DOMRect, to: DOMRect) => showcase(el, caption, from, to, 480);
