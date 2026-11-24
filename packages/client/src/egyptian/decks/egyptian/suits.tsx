import type { Suit } from '@boboland/shared/src/egyptian';

/** Classic suit shapes in a 100 x 100 box, kept standard so they read instantly. */
export const SUIT_PATHS: Record<Suit, string[]> = {
  S: ['M50 5 C60 22 92 38 92 62 C92 80 72 86 57 74 C59 83 63 90 71 95 L29 95 C37 90 41 83 43 74 C28 86 8 80 8 62 C8 38 40 22 50 5 Z'],
  H: ['M50 92 C34 78 6 60 6 34 C6 16 20 7 32 7 C41 7 47 12 50 20 C53 12 59 7 68 7 C80 7 94 16 94 34 C94 60 66 78 50 92 Z'],
  D: ['M50 3 C60 20 74 36 89 50 C74 64 60 80 50 97 C40 80 26 64 11 50 C26 36 40 20 50 3 Z'],
  // one outline (three lobes and the stem), so the gold inlay traces the shape, not overlapping circles
  C: ['M32.6 37.8 A21 21 0 1 1 67.4 37.8 A21 21 0 1 1 55 69 C56 80 61 88 71 95 L29 95 C39 88 44 80 45 69 A21 21 0 1 1 32.6 37.8 Z'],
};

/**
 * A suit pip at (cx, cy) of `size`, with a thin gold inlay inside the shape. `flip` turns it upside down
 * (the bottom half of a card).
 */
export function Pip({ suit, cx, cy, size, fill, flip = false, inlay = true }: { suit: Suit; cx: number; cy: number; size: number; fill: string; flip?: boolean; inlay?: boolean }) {
  const x = cx - size / 2, y = cy - size / 2;
  const k = 0.7, ix = cx - (size * k) / 2, iy = cy - (size * k) / 2;
  return (
    <g transform={flip ? `rotate(180 ${cx} ${cy})` : undefined} data-pip={suit}>
      <use href={`#egw-suit-${suit}`} x={x} y={y} width={size} height={size} fill={fill} />
      {inlay && <use href={`#egw-suit-${suit}`} x={ix} y={iy} width={size * k} height={size * k} fill="none" stroke="url(#egw-gold)" strokeWidth={4.5} opacity={0.9} />}
    </g>
  );
}
