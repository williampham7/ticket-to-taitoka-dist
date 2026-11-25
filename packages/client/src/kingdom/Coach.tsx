import { useState } from 'react';
import { save } from '../lib/storage';

/** First-game coach marks, shown once (saved in kg.coach). */
const MARKS = [
  { at: 'spare', text: 'Turn the tile: tap it or the arrows (or press R).' },
  { at: 'banner', text: 'Pick a banner to push the tile into the maze.' },
  { at: 'board', text: 'Walk to a glowing square, or press Stay here.' },
];
export function Coach({ step }: { step: 'shift' | 'move' }) {
  const [k, setK] = useState(0);
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const i = step === 'move' ? 2 : k;
  const done = () => { save('kg.coach', 'done'); setGone(true); };
  const m = MARKS[i];
  return (
    <div className={`kg-coach kg-coach-${m.at}`} role="note" data-testid="kg-coach">
      <span className="kg-coach-n">{i + 1}</span>
      <p>{m.text}</p>
      {i < 2 ? <button type="button" className="kg-btn kg-btn-sm" onClick={() => setK(i + 1)}>Next</button> : <button type="button" className="kg-btn kg-btn-sm" onClick={done}>Got it</button>}
      <button type="button" className="kg-coach-x" aria-label="Hide tips" onClick={done}>×</button>
    </div>
  );
}
