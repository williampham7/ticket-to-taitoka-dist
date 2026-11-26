import { useState } from 'react';
import { load, save } from '../lib/storage';
import { Icon } from './art/icons';

/** First-game coach marks (bly.coach): three clouds, one at a time, while it is your turn. */
const MARKS = [
  { title: 'Start in your corner', text: 'Your first piece must cover your glowing start sigil.' },
  { title: 'Touch your guild only at the corners', text: 'Glowing diamonds are your open corners. Never touch your own guild along an edge.' },
  { title: 'Big pieces first!', text: 'Five-square pieces are the hardest to fit late. Squares left on the shelf cost a point each.' },
];
export function useCoach() {
  const [step, setStep] = useState(() => { const v = load<string | number>('bly.coach', 0); return v === 'done' ? MARKS.length : Number(v) || 0; });
  const next = () => setStep((s) => { const n = s + 1; save('bly.coach', n >= MARKS.length ? 'done' : n); return n; });
  const skip = () => { save('bly.coach', 'done'); setStep(MARKS.length); };
  return { mark: step < MARKS.length ? { ...MARKS[step], n: step } : null, next, skip };
}
export function CoachMark({ mark, next, skip }: { mark: { title: string; text: string; n: number }; next: () => void; skip: () => void }) {
  return (
    <div className={`bly-coach bly-coach-dock bly-cloud bly-coach-${mark.n}`} role="note" data-testid="bly-coach">
      <span className="bly-coach-arrow" aria-hidden />
      <b>{mark.title}</b>
      <small>{mark.text}</small>
      <span className="bly-coach-keys">
        <button type="button" className="bly-key bly-key-sm bly-key-go" onClick={next}>{mark.n < 2 ? 'Got it' : 'Let’s build'}</button>
        <button type="button" className="bly-key bly-key-sm bly-key-ghost" onClick={skip} aria-label="Skip the tips"><Icon name="cancel" size={16} /></button>
      </span>
    </div>
  );
}
