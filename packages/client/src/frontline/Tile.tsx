import type { CSSProperties } from 'react';
import { kindOf, type PlayerID, type Rank } from '@boboland/shared/src/frontline';
import { TileBack, UnitArt } from './art';
import './tiles.css';

export const ARMY_OF: Record<PlayerID, 'olive' | 'tan'> = { '0': 'olive', '1': 'tan' };

/**
 * One army tile. With a rank: number, illustration and name (the name drops out when the tile is small).
 * Without one (an enemy piece we have not seen): the army crest only, so the markup says nothing about it.
 */
export function Tile({ owner, rank, revealed, className = '', style }: {
  owner: PlayerID; rank?: Rank; revealed?: boolean; className?: string; style?: CSSProperties;
}) {
  const known = rank !== undefined;
  return (
    <div className={`flt ${className}`} data-army={ARMY_OF[owner]} data-hidden={known ? undefined : 'true'} style={style}>
      {known ? (
        <>
          {typeof rank === 'number' && <span className="flt-rank">{rank}</span>}
          {revealed && (
            <svg className="flt-eye" viewBox="0 0 20 12" aria-label="Known to the enemy" role="img">
              <path d="M1 6 Q10 -2 19 6 Q10 14 1 6 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="10" cy="6" r="2.6" fill="currentColor" />
            </svg>
          )}
          <UnitArt rank={rank} className="flt-art" />
          <span className={`flt-name ${kindOf(rank).name.length > 10 ? 'long' : ''}`}>{kindOf(rank).name}</span>
        </>
      ) : <TileBack owner={owner} />}
    </div>
  );
}

/** A fixed-size tile for lists and trays. */
export function Chip({ owner, rank, size = 30, revealed }: { owner: PlayerID; rank?: Rank; size?: number; revealed?: boolean }) {
  return (
    <span className="flt-chip" style={{ width: size, height: size }} data-testid="fl-chip">
      <Tile owner={owner} rank={rank} revealed={revealed} />
    </span>
  );
}
