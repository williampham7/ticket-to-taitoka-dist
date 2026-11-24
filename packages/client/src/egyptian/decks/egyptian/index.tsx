import { rankOf, suitOf, type Card } from '@boboland/shared/src/egyptian';
import type { DeckSkin } from '../types';
import { AceCentre } from './aces';
import { EgyptianBack } from './back';
import { CourtCentre } from './courts';
import { EgyptianDefs } from './defs';
import { Frieze, Indices, Stock } from './frame';
import { HOUSES, INK } from './palette';
import { NumberCentre } from './pips';

function EgyptianFace({ card }: { card: Card }) {
  const rank = rankOf(card), suit = suitOf(card);
  return (
    <g data-face={card}>
      <Stock />
      <Frieze suit={suit} />
      {rank >= 11 ? <CourtCentre rank={rank as 11 | 12 | 13} suit={suit} /> : (
        <>
          {rank === 1 ? <AceCentre suit={suit} /> : <NumberCentre rank={rank} suit={suit} />}
          <Indices rank={rank} suit={suit} />
        </>
      )}
    </g>
  );
}

export const EGYPTIAN_DECK: DeckSkin = {
  id: 'egyptian',
  name: 'Egyptian',
  Face: EgyptianFace,
  Back: EgyptianBack,
  Defs: EgyptianDefs,
  accent: { '--deck-accent': INK.gold, '--deck-accent-2': HOUSES.S.main, '--deck-glow': 'rgba(233, 196, 106, 0.35)', '--deck-back': INK.lapis },
  music: 'egyptian',
};
