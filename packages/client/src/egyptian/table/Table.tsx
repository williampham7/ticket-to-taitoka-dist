/**
 * The table: a felt oval with the seats around it (the viewer at the bottom, play clockwise), the fanned pile in
 * the middle, and every animation (flip flights, deal, slaps, burns, challenge, grace, reveal, sweep).
 * Deck-neutral: cards come from CardView, the rest reads --deck-* tokens.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { challengeTries, rankOf, type Card, type EgwView, type PlayerID } from '@boboland/shared/src/egyptian';
import { CardView } from '../CardView';
import { FX, type FxSetting } from '../fx';
import { liftedCards, revealText, seatBadges, type Names } from '../screenLogic';
import { seatOrder, seatPos } from '../seating';
import { Ankh, CrackArt, HandArt } from './art';
import { useWonPhase, type TableFx } from './useTableFx';

export interface TableProps {
  view: EgwView;
  me: PlayerID | null;
  /** pass and play: seat 0 on the left, seat 1 on the right */
  local: boolean;
  names: Names;
  colors: Record<PlayerID, string>;
  fx: FxSetting;
  effects: TableFx[];
  now: () => number;
}

type Pos = { x: number; y: number };
const FACE_NAME: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };
/** a small, stable tilt per card so the pile looks dropped by hand */
const tilt = (c: Card) => ((c * 37) % 13) - 6;
const vars = (o: Record<string, string | number>) => o as CSSProperties;

export function seatPositions(view: EgwView, me: PlayerID | null, local: boolean): Record<PlayerID, Pos> {
  if (local) return { 0: { x: 9, y: 50 }, 1: { x: 91, y: 50 } };
  const order = seatOrder(view.players, me);
  return Object.fromEntries(order.map((p, i) => [p, seatPos(i, order.length)]));
}

/** CSS vars that point from the table centre to a seat (in container units). */
const toward = (p: Pos | undefined, k = 1) => vars({ '--sx': ((p?.x ?? 50) - 50) * k, '--sy': ((p?.y ?? 50) - 50) * k });

export function Table({ view, me, local, names, colors, fx, effects, now }: TableProps) {
  const pos = seatPositions(view, me, local);
  const t = FX[fx];
  const phase = useWonPhase(view.won, view.round, fx);
  const won = view.won;
  const sweeping = phase === 'sweep' || phase === 'gone';
  const showPile = won ? won.pile : view.pile;
  const turnPos = view.turn !== null && !view.timer ? pos[view.turn] : undefined;
  const timing = vars({
    '--egw-flip': `${t.flipMs + t.landMs}ms`, '--egw-hand': `${t.handMs}ms`, '--egw-sweep': `${t.sweepMs}ms`, '--egw-crack': `${t.crackMs}ms`,
    '--egw-burn': `${t.burnMs}ms`, '--egw-flash': `${t.flashMs}ms`, '--egw-reveal': `${t.revealMs}ms`, '--egw-deal': `${t.dealCardMs}ms`,
  });
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (view.stage !== 'play' || view.round !== 1 || view.pile.length > 0) return;
    setStarted(true);
    const id = setTimeout(() => setStarted(false), 1600);
    return () => clearTimeout(id);
  }, [view.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`egw-table ${local ? 'is-local' : ''} fx-${fx}`} style={timing} data-testid="egw-table">
      <div className="egw-felt" aria-hidden><div className="egw-felt-ring" /></div>
      {turnPos && (
        <div className="egw-pointer" aria-hidden style={{ transform: `translate(-50%, -50%) rotate(${Math.atan2(turnPos.y - 50, (turnPos.x - 50) * 1.4) * (180 / Math.PI)}deg)` }}>
          <span />
        </div>
      )}
      {view.players.map((p) => (
        <Seat key={p} p={p} view={view} pos={pos[p]} me={me} name={names[p] ?? `Player ${Number(p) + 1}`} color={colors[p] ?? '#c99a2e'}
          now={now} fx={fx} starts={started && view.leader === p} winner={sweeping ? won?.by : undefined} />
      ))}

      <div className={`egw-pile-wrap ${sweeping ? 'is-sweeping' : ''} ${phase === 'gone' ? 'is-gone' : ''} ${effects.some((e) => e.kind === 'crack') ? 'is-shaking' : ''}`}
        style={sweeping && won ? toward(pos[won.by]) : undefined}>
        <Pile cards={showPile} rules={view.rules} burned={view.burnedCount} flipBy={view.topBy} from={view.topBy ? pos[view.topBy] : undefined} fx={fx} dim={!!won && phase !== 'sweep'} />
        {view.timer?.kind === 'grace' && <GraceRing key={view.timer.at} ms={Math.max(0, view.timer.at - now())} />}
      </div>

      {view.challenge && !won && (
        <div className="egw-challenge" data-testid="egw-challenge" key={`${view.challenge.face}-${view.challenge.target}`}>
          <span className="egw-challenge-face">{FACE_NAME[rankOf(view.challenge.face)]}</span>
          <span className="egw-challenge-who">{names[view.challenge.target] ?? '—'}</span>
          <span className="egw-ankhs" aria-label={`${view.challenge.tries} tries left`}>
            {Array.from({ length: challengeTries(view.challenge.face) }, (_, i) => <Ankh key={i} lit={i < view.challenge!.tries} />)}
          </span>
        </div>
      )}

      {won && phase && phase !== 'gone' && phase !== 'sweep' && <Reveal view={view} names={names} phase={phase} />}

      {effects.map((e) => {
        if (e.kind === 'hand') return <div key={e.id} className={`egw-fx-hand ${e.ok ? 'ok' : 'bad'}`} style={toward(pos[e.by], 0.8)}><HandArt ok={e.ok} /></div>;
        if (e.kind === 'crack') return <div key={e.id} className="egw-fx-crack"><CrackArt /></div>;
        if (e.kind === 'burn') return <div key={e.id} className="egw-fx-burn" style={toward(pos[e.by])}><CardView back /></div>;
        return <div key={e.id} className="egw-fx-flash" />;
      })}

      {view.stage === 'dealing' && fx !== 'off' && <Deal view={view} pos={pos} />}
    </div>
  );
}

function Seat({ p, view, pos, me, name, color, now, fx, starts, winner }: {
  p: PlayerID; view: EgwView; pos: Pos; me: PlayerID | null; name: string; color: string; now: () => number; fx: FxSetting; starts: boolean; winner?: PlayerID;
}) {
  const b = seatBadges(view, p, now());
  const count = view.counts[p] ?? 0;
  const layers = Math.min(5, Math.ceil(count / 6));
  const dealing = view.stage === 'ready' || view.stage === 'dealing';
  return (
    <div className={`egw-seat ${b.turn ? 'is-turn' : ''} ${b.challenged ? 'is-challenged' : ''} ${b.out ? 'is-out' : ''} ${b.left ? 'is-left' : ''} ${p === me ? 'is-me' : ''} ${starts ? 'is-start' : ''} ${winner === p ? 'is-winner' : ''}`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, '--seat': color } as CSSProperties} data-testid={`egw-seat-${p}`} data-count={count}>
      <div className={`egw-stack ${dealing && fx !== 'off' ? 'is-dealing' : ''}`} aria-hidden>
        {count === 0 ? <div className="egw-stack-empty" /> : Array.from({ length: layers }, (_, i) => (
          <div key={i} className="egw-stack-card" style={{ transform: `translate(${i * 1.5}px, ${-i * 2.5}px)` }}><CardView back /></div>
        ))}
        <span className="egw-count" data-testid={`egw-count-${p}`}>{count}</span>
      </div>
      <div className="egw-plate">
        <span className="egw-avatar">
          {name.slice(0, 1).toUpperCase()}
          {b.lockedFor > 0 && (
            <svg className="egw-lock-ring" viewBox="0 0 40 40" key={view.lockout[p]} data-testid={`egw-lock-${p}`} style={{ animationDuration: `${b.lockedFor}ms` }} aria-label="Locked out">
              <circle cx="20" cy="20" r="18" pathLength="100" />
            </svg>
          )}
        </span>
        <span className="egw-seat-text">
          <span className="egw-name">{name}{p === me && <span className="egw-you"> · you</span>}</span>
          <span className="egw-tags">
            {starts && <span className="egw-tag gold">Starts</span>}
            {b.left ? <span className="egw-tag">Left</span> : b.spent ? <span className="egw-tag bad" data-testid={`egw-spent-${p}`}>Slap-in used</span> : b.out ? <span className="egw-tag">Out · may slap in</span> : null}
            {b.lockedFor > 0 && <span className="egw-tag bad">Locked</span>}
          </span>
        </span>
      </div>
    </div>
  );
}

function Pile({ cards, rules, burned, from, fx, dim }: { cards: Card[]; rules: string[]; burned: number; flipBy: PlayerID | null; from?: Pos; fx: FxSetting; dim: boolean }) {
  const top = cards.slice(-4);
  const peek = rules.includes('topBottom') && cards.length > 4 ? cards[0] : null;
  return (
    <div className={`egw-pile ${dim ? 'is-dim' : ''}`} data-testid="egw-pile" data-cards={cards.join(',')} aria-label={`${cards.length} cards on the pile`}>
      <div className="egw-pile-slot" aria-hidden />
      {burned > 0 && (
        <div className="egw-burned" title={`${burned} burned`}>
          <CardView back /><span className="egw-burned-n">{burned}</span>
        </div>
      )}
      {peek !== null && (
        <div className="egw-peek" title="The round's first card"><CardView card={peek} /><span>First</span></div>
      )}
      {top.map((c, i) => {
        const k = top.length - 1 - i; // 0 = top
        const isTop = k === 0;
        return (
          <div key={`${c}-${cards.length - k}`} className="egw-pile-card" style={{ transform: `translate(${(top.length - 1) * 13 - k * 26}%, ${k * 1.5}%) rotate(${tilt(c)}deg)`, zIndex: 10 - k }}>
            <div className={`egw-fly ${isTop && fx !== 'off' && from ? 'is-in' : ''}`} style={isTop ? toward(from) : undefined}>
              <div className="egw-face egw-face-back"><CardView back /></div>
              <div className="egw-face egw-face-front"><CardView card={c} testid={isTop ? 'egw-top' : undefined} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GraceRing({ ms }: { ms: number }) {
  return (
    <svg className="egw-grace" viewBox="0 0 100 100" style={{ animationDuration: `${ms}ms` }} data-testid="egw-grace" aria-label="Grace window">
      <circle cx="50" cy="50" r="46" pathLength="100" />
    </svg>
  );
}

function Reveal({ view, names, phase }: { view: EgwView; names: Names; phase: string }) {
  const won = view.won!;
  const text = revealText(won, names);
  const lifted = liftedCards(won);
  const slapIn = won.how === 'slapIn';
  return (
    <div className={`egw-reveal phase-${phase} ${slapIn ? 'is-slapin' : ''}`} data-testid="egw-reveal" role="status">
      {lifted.length > 0 && phase !== 'hand' && (
        <div className="egw-lifted">
          {lifted.map((c, i) => <div key={i} className="egw-lifted-card" style={{ animationDelay: `${i * 90}ms` }}><CardView card={c} /></div>)}
        </div>
      )}
      {(phase !== 'hand') && (
        <div className="egw-ribbon">
          {slapIn && <span className="egw-ribbon-kicker">Slapped back in · {names[won.by]}</span>}
          {!slapIn && won.how === 'slap' && <span className="egw-ribbon-kicker">{names[won.by]} wins the pile</span>}
          <span className="egw-ribbon-main" data-testid="egw-ribbon">{text.headline}</span>
          {text.lines.map((l) => <span key={l} className="egw-ribbon-more">also {l}</span>)}
        </div>
      )}
    </div>
  );
}

function Deal({ view, pos }: { view: EgwView; pos: Record<PlayerID, Pos> }) {
  const n = view.players.length;
  return (
    <div className="egw-deal" aria-hidden>
      {Array.from({ length: 52 }, (_, i) => (
        <div key={i} className="egw-deal-card" style={{ ...toward(pos[view.players[i % n]]), animationDelay: `calc(var(--egw-deal) * ${i})` } as CSSProperties}>
          <CardView back />
        </div>
      ))}
    </div>
  );
}
