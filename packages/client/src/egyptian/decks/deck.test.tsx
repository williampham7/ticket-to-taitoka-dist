import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cardOf, rankLabel, SUITS } from '@boboland/shared/src/egyptian';
import { DECK } from '.';
import { PIP_LAYOUT } from './egyptian/pips';
import { INK } from './egyptian/palette';

const face = (rank: number, suit: (typeof SUITS)[number]) => renderToStaticMarkup(<svg><DECK.Face card={cardOf(rank, suit)} /></svg>);

describe('Egyptian deck', () => {
  it('renders all 52 faces with both corner indices in red or black', () => {
    for (const s of SUITS) {
      for (let r = 1; r <= 13; r++) {
        const html = face(r, s);
        const label = rankLabel(r);
        expect(html.split(`>${label}</text>`).length - 1, `${label}${s} indices`).toBe(2);
        expect(html).toContain(`fill="${s === 'H' || s === 'D' ? INK.red : INK.black}"`);
      }
    }
  });
  it('number cards have real pip layouts', () => {
    for (let r = 2; r <= 10; r++) {
      expect(PIP_LAYOUT[r].length).toBe(r);
      expect(face(r, 'C').split('data-pip="C"').length - 1).toBe(r);
    }
  });
  it('every ace and all 12 court cards have their own art, double-ended', () => {
    for (const s of SUITS) {
      expect(face(1, s)).toContain(`data-art="ace-${s}"`);
      for (const r of [11, 12, 13]) {
        const html = face(r, s);
        expect(html).toContain(`data-art="court-${r}-${s}"`);
        expect(html).toMatch(/data-half="bottom" transform="rotate\(180/);
      }
    }
  });
  it('draws a back', () => {
    expect(renderToStaticMarkup(<svg><DECK.Back /></svg>)).toContain('data-back="egyptian"');
  });
});
