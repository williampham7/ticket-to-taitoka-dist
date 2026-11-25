import { createContext, useContext, type CSSProperties } from 'react';
import { badgeOf, kindOf, type ArmyId, type PlayerID, type Rank } from '@boboland/shared/src/frontline';
import { TileBack, UnitArt } from './art';
import './tiles.css';

export const ARMY_OF: Record<PlayerID, 'olive' | 'tan'> = { '0': 'olive', '1': 'tan' };

/** The army in play, for the mark printed on each tile (the Spotter army numbers its pieces differently). */
export const ArmyContext = createContext<ArmyId>('classic');

/**
 * One army tile. With a rank: number, illustration and name (the name drops out when the tile is small).
 * Without one (an enemy piece we have not seen): the army crest only, so the markup says nothing about it.
 */
export function Tile({ owner, rank, revealed, ruledOut = 0, className = '', style }: {
  owner: PlayerID; rank?: Rank; revealed?: boolean; className?: string; style?: CSSProperties;
  /** A hidden enemy piece: how many ranks a Spotter has already named wrongly against it. */
  ruledOut?: number;
}) {
  const army = useContext(ArmyContext);
  const known = rank !== undefined;
  const badge = known ? badgeOf(rank, army) : '';
  return (
    <div className={`flt ${className}`} data-army={ARMY_OF[owner]} data-hidden={known ? undefined : 'true'} style={style}>
      {known ? (
        <>
          {badge && <span className={`flt-rank ${badge === 'S' ? 'letter' : ''}`}>{badge}</span>}
          {revealed && (
            <svg className="flt-eye" viewBox="0 0 20 12" aria-label="Known to the enemy" role="img">
              <path d="M1 6 Q10 -2 19 6 Q10 14 1 6 Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="10" cy="6" r="2.6" fill="currentColor" />
            </svg>
          )}
          <UnitArt rank={rank} className="flt-art" />
          <span className={`flt-name ${kindOf(rank).name.length > 10 ? 'long' : ''}`}>{kindOf(rank).name}</span>
        </>
      ) : (
        <>
          <TileBack owner={owner} />
          {ruledOut > 0 && <span className="flt-ruled" data-testid="fl-ruled-out">✕{ruledOut}</span>}
        </>
      )}
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
