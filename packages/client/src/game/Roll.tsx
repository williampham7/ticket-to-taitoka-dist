import { useEffect, useRef, useState, type CSSProperties } from 'react';

export const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A number that rolls from its previous value to the new one (instantly with reduced motion). */
export function Roll({ value, ms = 700 }: { value: number; ms?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const now = useRef(value);
  useEffect(() => {
    const start = performance.now(), a = from.current, b = value;
    if (a === b || reducedMotion()) { setShown(b); from.current = now.current = b; return; }
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      now.current = Math.round(a + (b - a) * (1 - (1 - k) ** 3));
      setShown(now.current);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    // if a new value arrives mid-roll, carry on from where the number is now
    return () => { cancelAnimationFrame(raf); from.current = now.current; };
  }, [value, ms]);
  return <>{shown}</>;
}

/* ---------- split-flap display (HSR theme's departure board) ---------- */

/** The characters on one flap drum, in the order the drum turns. */
export const DIGIT_DRUM = ' 0123456789'; // a minus sign is not on the drum: it shows at once
export const LETTER_DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-·';

/** The next character a drum shows on its way from `cur` to `target` (it only turns forwards). */
export function nextFlap(cur: string, target: string, drum: string): string {
  if (cur === target) return cur;
  const i = drum.indexOf(cur), j = drum.indexOf(target);
  if (j < 0) return target; // not on this drum: show it straight away
  return drum[(Math.max(i, 0) + 1) % drum.length];
}

/** A score as split-flap characters, right-aligned in `width` places (blank places on the left). */
export function flapDigits(value: number, width = 3): string[] {
  const s = value < 0 ? `-${-value}` : String(value);
  return s.padStart(width, ' ').split('');
}

/** How many flips a drum needs to turn from `from` to `to`. */
export function flapSteps(from: string, to: string, drum: string): number {
  let n = 0, c = from;
  while (c !== to && n < drum.length + 1) { c = nextFlap(c, to, drum); n++; }
  return n;
}

interface TileState { ch: string; prev: string; n: number }

/**
 * One split-flap tile. When its character changes, the top half of the old card folds down over the
 * bottom half, revealing the new card's top behind it, and the new card's bottom half lands in place.
 */
export function FlapTile({ ch, prev, n }: TileState) {
  return (
    <span className="flap" aria-hidden>
      <span className="flap-half flap-top"><span>{ch}</span></span>
      <span className="flap-half flap-bottom"><span>{n ? prev : ch}</span></span>
      {n > 0 && (
        <>
          <span key={`t${n}`} className="flap-half flap-top flap-fold-top"><span>{prev}</span></span>
          <span key={`b${n}`} className="flap-half flap-bottom flap-fold-bottom"><span>{ch}</span></span>
        </>
      )}
    </span>
  );
}

/**
 * A tile whose drum turns, one card at a time, until it shows `target`.
 * `scramble`: from blank, first jump to a few cards before the target, so text "settles" like a real board.
 */
export function FlapChar({ target, drum, step = 75, delay = 0, scramble = 0 }: { target: string; drum: string; step?: number; delay?: number; scramble?: number }) {
  const still = reducedMotion();
  const [s, setS] = useState<TileState>(() => ({ ch: still ? target : ' ', prev: ' ', n: 0 }));
  useEffect(() => {
    if (s.ch === target) return;
    if (still) { setS({ ch: target, prev: target, n: 0 }); return; }
    const t = setTimeout(() => setS((o) => {
      let next = nextFlap(o.ch, target, drum);
      const j = drum.indexOf(target);
      if (scramble && o.n === 0 && j > 0) next = drum[(j - scramble + drum.length) % drum.length] || next;
      return { ch: next, prev: o.ch, n: o.n + 1 };
    }), s.n === 0 ? delay : step);
    return () => clearTimeout(t);
  }, [s, target, drum, step, delay, scramble, still]);
  return <FlapTile {...s} />;
}

/** A score on split-flap tiles: each digit's drum turns on its own until it reaches the new value. */
export function FlapNumber({ value, width = 3, size = 'md', className = '' }: { value: number; width?: number; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const digits = flapDigits(value, width);
  return (
    <span className={`flap-row flap-${size} ${className}`} role="img" aria-label={String(value)}>
      {digits.map((d, i) => <FlapChar key={digits.length - i} target={d} drum={DIGIT_DRUM} step={70} />)}
    </span>
  );
}

/** Text on split-flap tiles that settles letter by letter, left to right. */
export function FlapText({ text, size = 'lg', delay = 0, stagger = 55, style }: { text: string; size?: 'sm' | 'md' | 'lg'; delay?: number; stagger?: number; style?: CSSProperties }) {
  return (
    <span className={`flap-row flap-${size}`} role="img" aria-label={text} style={style}>
      {text.toUpperCase().split('').map((c, i) => (
        c === ' ' ? <span key={i} className="flap-gap" /> :
        <FlapChar key={i} target={c} drum={LETTER_DRUM} step={58} delay={delay + i * stagger} scramble={4} />
      ))}
    </span>
  );
}
