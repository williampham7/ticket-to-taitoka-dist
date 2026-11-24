import { useEffect, type CSSProperties } from 'react';
import { kindOf, type Combat, type CombatSide, type PlayerID } from '@boboland/shared/src/frontline';
import { Tile } from './Tile';
import { BIG_EXTRA_MS, COMBAT_T, type CombatOutcome } from './fx';
import { sound } from './sound';
import './fx.css';

type Fate = 'win' | 'dead' | 'blown' | 'fizzle' | 'mine';
const FATES: Record<CombatOutcome, [Fate, Fate]> = {
  win: ['win', 'dead'], repel: ['dead', 'win'], trade: ['dead', 'dead'],
  blast: ['blown', 'mine'], defuse: ['win', 'fizzle'], capture: ['win', 'dead'],
};

/** The combat timeline as CSS variables (the duel and the board shake read them). */
export function timelineVars(outcome: CombatOutcome): CSSProperties {
  const big = outcome === 'blast' || outcome === 'capture';
  const v: Record<string, string> = {};
  for (const [k, ms] of Object.entries(COMBAT_T)) v[`--t-${k}`] = `${ms + (k === 'out' && big ? BIG_EXTRA_MS : 0)}ms`;
  return v as CSSProperties;
}

const unit = (s: CombatSide) => kindOf(s.rank).name;

/** Headline and subline for a duel's result. */
export function verdict(c: Combat, outcome: CombatOutcome): { main: string; sub: string } {
  const a = unit(c.attacker), d = unit(c.defender);
  switch (outcome) {
    case 'win': return { main: `${a} wins`, sub: `${d} eliminated` };
    case 'repel': return { main: `${d} holds`, sub: `${a} eliminated` };
    case 'trade': return { main: 'Both units lost', sub: `${a} and ${d} fall together` };
    case 'blast': return { main: 'Mine detonated', sub: `${a} destroyed` };
    case 'defuse': return { main: 'Mine defused', sub: 'The engineer clears the way' };
    case 'capture': return { main: 'Command post captured', sub: `${a} takes the objective` };
  }
}

const winnerOf = (c: Combat, o: CombatOutcome): PlayerID | null =>
  o === 'trade' ? null : o === 'repel' || o === 'blast' ? c.defender.owner : c.attacker.owner;

interface Props {
  combat: Combat;
  outcome: CombatOutcome;
  /** Did this screen know each rank before the fight? Unknown ones flip over. */
  known: { attacker: boolean; defender: boolean };
  /** Whose screen this is (null: a spectator). */
  viewer: PlayerID | null;
  name: (id: PlayerID) => string;
  coord: string;
  reduced?: boolean;
}

const SPARKS = Array.from({ length: 12 }, (_, i) => i * 30 + (i % 2 ? 9 : -6));
const DEBRIS = Array.from({ length: 16 }, (_, i) => ({ a: i * 22.5 + ((i * 37) % 17), d: 70 + ((i * 53) % 60), s: 4 + (i % 4) * 2, r: (i % 2 ? 1 : -1) * (180 + i * 40) }));

/** The combat cinematic over the board: the two tiles face off, hidden ones flip, they clash, the loser is destroyed. */
export function Duel({ combat, outcome, known, viewer, name, coord, reduced }: Props) {
  const [fa, fd] = FATES[outcome];
  const won = winnerOf(combat, outcome);
  const tone = outcome === 'capture' ? 'gold' : viewer === null || won === null ? 'neutral' : won === viewer ? 'good' : 'bad';
  const { main, sub } = verdict(combat, outcome);
  const hiddenAny = !known.attacker || !known.defender;

  useEffect(() => {
    const T = COMBAT_T;
    const at = (ms: number, fn: () => void) => setTimeout(fn, reduced ? 0 : ms);
    const timers = [
      reduced ? null : at(T.approach, sound.charge),
      hiddenAny ? at(T.reveal + 140, sound.reveal) : null,
      at(T.impact, outcome === 'blast' ? sound.explode : sound.impact),
      at(T.result + 60, outcome === 'defuse' ? sound.defuse : outcome === 'blast' ? () => {} : sound.eliminate),
      at(T.result + 380, tone === 'gold' ? sound.capture : tone === 'good' ? sound.good : tone === 'bad' ? sound.bad : () => {}),
    ];
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const who = (s: CombatSide, verb: 'attack' | 'defend') =>
    viewer !== null && s.owner === viewer ? `You ${verb}` : `${name(s.owner)} ${verb}s`;

  return (
    <div className={`fd fd-${outcome} tone-${tone}`} style={timelineVars(outcome)} data-testid="fl-duel" role="status" aria-label={`${main}. ${sub}.`}>
      <div className="fd-veil" />
      <div className="fd-bar top"><span className="fd-rec">Engagement</span><span>{coord}</span></div>
      <div className="fd-bar bottom" />
      {outcome === 'blast' && <div className="fd-whiteout" />}
      <div className="fd-rig">
        <div className="fd-stage">
          <Side side={combat.attacker} role="att" fate={fa} hidden={!known.attacker} label={who(combat.attacker, 'attack')} />
          <div className="fd-vs" aria-hidden="true">
            <span>vs</span>
            <i className="fd-flash" />
            <div className="fd-sparks">{SPARKS.map((a) => <b key={a} style={{ '--a': `${a}deg` } as CSSProperties} />)}</div>
            {outcome === 'blast' && (
              <div className="fd-boom">
                <i className="ring" /><i className="ring r2" /><i className="core" />
                {[0, 1, 2, 3, 4].map((k) => <i key={k} className="smoke" style={{ '--k': k } as CSSProperties} />)}
                {DEBRIS.map((p, k) => <b key={k} style={{ '--a': `${p.a}deg`, '--d': `${p.d}px`, '--s': `${p.s}px`, '--r': `${p.r}deg` } as CSSProperties} />)}
              </div>
            )}
          </div>
          <Side side={combat.defender} role="def" fate={fd} hidden={!known.defender} label={who(combat.defender, 'defend')} />
        </div>
        <div className="fd-verdict">
          <b>{main}</b>
          <span>{sub}</span>
        </div>
      </div>
    </div>
  );
}

function Side({ side, role, fate, hidden, label }: { side: CombatSide; role: 'att' | 'def'; fate: Fate; hidden: boolean; label: string }) {
  const dies = fate === 'dead' || fate === 'blown' || fate === 'fizzle';
  return (
    <div className={`fd-side ${role} fate-${fate}`}>
      <div className="fd-who"><i data-army={side.owner === '0' ? 'olive' : 'tan'} />{label}</div>
      <div className="fd-in">
        <div className="fd-move">
          <div className="fd-fate">
            <div className={`fd-flip ${hidden ? 'unknown' : ''}`}>
              {hidden && <div className="fd-face back"><Tile owner={side.owner} /></div>}
              <div className="fd-face front">
                {dies ? (
                  <>
                    <div className="fd-shard s1"><Tile owner={side.owner} rank={side.rank} /></div>
                    <div className="fd-shard s2"><Tile owner={side.owner} rank={side.rank} /></div>
                    <svg className="fd-crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <polyline points="56,0 46,38 60,63 42,100" />
                      <polyline points="46,38 24,30 12,44" /><polyline points="60,63 82,70 90,58" />
                    </svg>
                  </>
                ) : <Tile owner={side.owner} rank={side.rank} />}
              </div>
            </div>
            {hidden && <i className="fd-scan" />}
          </div>
        </div>
      </div>
    </div>
  );
}
