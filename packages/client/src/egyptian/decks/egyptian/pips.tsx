import type { Suit } from '@boboland/shared/src/egyptian';
import { suitInk } from './palette';
import { Pip } from './suits';

const L = 84, C = 125, R = 166;
const T = 96, B = 254, M = 175;
/** four rows (9 and 10) */
const R4 = [96, 148.7, 201.3, 254];

/** Real pip layouts for 2-10: [x, y] in the 250 x 350 box; pips below the middle are drawn upside down. */
export const PIP_LAYOUT: Record<number, [number, number][]> = {
  2: [[C, T], [C, B]],
  3: [[C, T], [C, M], [C, B]],
  4: [[L, T], [R, T], [L, B], [R, B]],
  5: [[L, T], [R, T], [C, M], [L, B], [R, B]],
  6: [[L, T], [R, T], [L, M], [R, M], [L, B], [R, B]],
  7: [[L, T], [R, T], [C, (T + M) / 2], [L, M], [R, M], [L, B], [R, B]],
  8: [[L, T], [R, T], [C, (T + M) / 2], [L, M], [R, M], [C, (M + B) / 2], [L, B], [R, B]],
  9: [...R4.flatMap((y): [number, number][] => [[L, y], [R, y]]), [C, M]],
  10: [...R4.flatMap((y): [number, number][] => [[L, y], [R, y]]), [C, 122], [C, 228]],
};

export function NumberCentre({ rank, suit }: { rank: number; suit: Suit }) {
  const size = rank >= 9 ? 40 : 44;
  return (
    <g data-centre="pips">
      {PIP_LAYOUT[rank].map(([x, y], i) => <Pip key={i} suit={suit} cx={x} cy={y} size={size} fill={suitInk(suit)} flip={y > M} />)}
    </g>
  );
}
