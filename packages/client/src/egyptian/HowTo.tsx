import { useEffect } from 'react';

/** The rules in a few lines. */
export function HowTo({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="egw-modal" role="dialog" aria-modal="true" aria-label="How to play" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="egw-panel egw-howto">
        <header><h2 className="egw-display">How to play</h2><button type="button" className="egw-btn egw-btn-ghost" onClick={onClose}>Done</button></header>
        <ol>
          <li><b>Flip.</b> On your turn, flip the top card of your face-down stack onto the pile. Nobody sees any stack, not even their own.</li>
          <li><b>Challenge.</b> A Jack, Queen, King or Ace challenges the next player: they get 1, 2, 3 or 4 tries to flip a face card of their own. If they fail, the challenger takes the pile after a one-second wait.</li>
          <li><b>Slap.</b> Anyone may slap at any time. The first slap on a pattern in play (Double, Sandwich and any others you chose) wins the whole pile.</li>
          <li><b>Slap wrong</b> and you burn a card under the pile, and your slaps are ignored for one second.</li>
          <li><b>Out of cards?</b> You are not out of the game. You get one slap per round to win your way back in.</li>
          <li><b>Win</b> by holding all 52 cards.</li>
        </ol>
      </div>
    </div>
  );
}
