import { useMemo } from 'react';
import { TERR, TERRITORY_GEO, TERRITORY_PATHS, type Card } from '@boboland/shared/src/warfront';

const KIND_NAME = { inf: 'Infantry', arm: 'Armor', art: 'Artillery', wild: 'Wild' } as const;
const box = (t: string) => {
  const ps = TERRITORY_GEO[t].polys.flat();
  const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.max(x1 - x0, (y1 - y0) * 1.4) * 0.6 + 6;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return `${cx - s} ${cy - s / 1.4} ${2 * s} ${(2 * s) / 1.4}`;
};

/** A laminated intelligence card: aerial-photo thumbnail of the territory, unit silhouette, paper clip. */
export function IntelCard({ card, selected, onClick, small }: { card: Card; selected?: boolean; onClick?: () => void; small?: boolean }) {
  const vb = useMemo(() => (card.t ? box(card.t) : '0 0 10 7'), [card.t]);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`wf-card wf-card-${card.kind}${selected ? ' wf-card-sel' : ''}${small ? ' wf-card-sm' : ''}`} onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined} aria-label={card.t ? `${TERR[card.t].name}, ${KIND_NAME[card.kind]}` : 'Wild card'} data-card={card.id}>
      <span className="wf-card-clip" aria-hidden />
      <span className="wf-card-photo" aria-hidden>
        {card.t ? (
          <svg viewBox={vb} preserveAspectRatio="xMidYMid slice">
            <rect x="-2000" y="-2000" width="5000" height="5000" fill="#2d5a63" />
            <path d={TERRITORY_PATHS[card.t]} fill="#a7b57f" stroke="#e8f0d8" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : <svg viewBox="-12 -12 24 24"><path d="M0,-9 L2.6,-2.8 L9,-2.8 L3.8,1.2 L5.6,8 L0,4 L-5.6,8 L-3.8,1.2 L-9,-2.8 L-2.6,-2.8Z" fill="url(#wf-brass)" /></svg>}
        <span className="wf-card-grid" />
      </span>
      <span className="wf-card-unit" aria-hidden>
        {card.kind === 'wild' ? '★' : <svg viewBox="-12 -12 24 24"><use href={`#wf-u-${card.kind}`} fill="#2b2a26" /></svg>}
      </span>
      <span className="wf-card-name">{card.t ? TERR[card.t].name : 'Wild'}</span>
      <span className="wf-card-kind">{KIND_NAME[card.kind]}</span>
    </Tag>
  );
}
