import { TERR, type Battle } from '@boboland/shared/src/warfront';
import { factionOf } from './factions';

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
export function Die({ v, metal, i, lost }: { v: number; metal: 'brass' | 'steel'; i: number; lost?: boolean }) {
  return (
    <span className={`wf-die wf-die-${metal}${lost ? ' wf-die-lost' : ''}`} style={{ ['--i' as string]: i }} aria-label={String(v)}>
      <svg viewBox="-12 -12 24 24">
        <rect x="-11" y="-11" width="22" height="22" rx="5" fill={`url(#wf-${metal})`} stroke={metal === 'brass' ? '#5b3f10' : '#3e444b'} />
        <rect x="-9" y="-9" width="18" height="18" rx="4" fill="none" stroke="#fff" strokeOpacity=".35" />
        {PIPS[v].map(([x, y], k) => <circle key={k} cx={x * 5.2} cy={y * 5.2} r="2.1" fill={metal === 'brass' ? '#3b2606' : '#1d2228'} />)}
      </svg>
    </span>
  );
}

/** The dice tray: brass for the attacker, steel for the defender, each side in its faction colour; pairs line up and the losing die dims. */
export function DiceTray({ b, names, factions }: { b: Battle; names: Record<string, string>; factions: number[] }) {
  const last = b.rolls[b.rolls.length - 1];
  const pairs = Math.min(last.att.length, last.def.length);
  const fa = factionOf(factions, b.p), fd = factionOf(factions, b.d);
  return (
    <div className={`wf-tray${b.conquered ? ' wf-tray-won' : ''}`} key={b.seq} role="status" aria-live="polite">
      <div className="wf-tray-side" style={{ ['--fc' as string]: fa.color }}>
        <span className="wf-tray-who"><i />{names[b.p] ?? 'Attacker'}</span>
        <small className="wf-tray-where">attacks from {TERR[b.from].name}</small>
        <div className="wf-tray-dice">{last.att.map((v, i) => <Die key={i} v={v} metal="brass" i={i} lost={i < pairs && v <= last.def[i]} />)}</div>
        <span className="wf-tray-loss">{b.attLoss ? `−${b.attLoss}` : 'no losses'}</span>
      </div>
      <div className="wf-tray-vs">{b.blitz ? <><b>BLITZ</b><small>{b.rolls.length} roll{b.rolls.length > 1 ? 's' : ''}</small></> : <b>VS</b>}</div>
      <div className="wf-tray-side" style={{ ['--fc' as string]: fd.color }}>
        <span className="wf-tray-who"><i />{b.d === 'N' ? 'Neutral' : names[b.d] ?? 'Defender'}</span>
        <small className="wf-tray-where">holds {TERR[b.to].name}</small>
        <div className="wf-tray-dice">{last.def.map((v, i) => <Die key={i} v={v} metal="steel" i={i + 3} lost={i < pairs && last.att[i] > v} />)}</div>
        <span className="wf-tray-loss">{b.defLoss ? `−${b.defLoss}` : 'no losses'}</span>
      </div>
      <div className="wf-tray-result"><em>{b.conquered ? `${TERR[b.to].name.toUpperCase()} CAPTURED` : b.defLoss > b.attLoss ? 'DEFENCES CRACKING' : b.attLoss > b.defLoss ? 'ATTACK REPELLED' : 'EVEN EXCHANGE'}</em></div>
    </div>
  );
}
