import { useCallback, useEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sound';
import { pick } from '../hsr/pick';

export interface BubbleState { text: string; x: number; y: number; id: number }

/** "You can't do that" speech bubble near the pointer, auto-dismissed. */
export function useBubble() {
  const [bubble, setBubble] = useState<BubbleState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((text: string, at: { x: number; y: number }) => {
    sfx.nope();
    clearTimeout(timer.current);
    setBubble({ text, x: at.x, y: at.y, id: Date.now() });
    timer.current = setTimeout(() => setBubble(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { bubble, show, hide: () => setBubble(null) };
}

export function Bubble({ bubble }: { bubble: BubbleState | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  useEffect(() => {
    if (!bubble || !ref.current) return setPos(null);
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight;
    const below = bubble.y - h - 18 < 8;
    setPos({
      left: Math.min(Math.max(8, bubble.x - w / 2), window.innerWidth - w - 8),
      top: below ? bubble.y + 18 : bubble.y - h - 18,
      below,
    });
  }, [bubble]);
  if (!bubble) return null;
  return (
    <div ref={ref} key={bubble.id} role="alert" data-testid="bubble"
      className={`bubble-in pointer-events-none fixed z-[90] max-w-xs px-3.5 py-2 text-[15px] leading-snug ${pick('rounded-[12px] bg-ink text-white shadow-[0_10px_28px_rgba(20,33,61,.35)]', 'rounded-xl border-2 border-ink bg-[#fff8e6] text-ink shadow-[0_8px_20px_rgba(59,42,30,.35)]')}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}>
      {bubble.text}
      <span className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 ${pick(`bg-ink ${pos?.below ? '-top-[5px]' : '-bottom-[5px]'}`, `border-ink bg-[#fff8e6] ${pos?.below ? '-top-[7px] border-l-2 border-t-2' : '-bottom-[7px] border-b-2 border-r-2'}`)}`} />
    </div>
  );
}
