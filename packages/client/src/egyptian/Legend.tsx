import { isRed, rankLabel, rankOf, RULE_BY_ID, suitOf, type Card, type SlapRuleId } from '@boboland/shared/src/egyptian';

const SUIT_CHAR = { S: '♠', H: '♥', D: '♦', C: '♣' } as const;

/** A card as a tiny readable chip: "7♥". */
export function CardChip({ card }: { card: Card }) {
  return <span className={`egw-chip ${isRed(card) ? 'red' : ''}`}>{rankLabel(rankOf(card))}{SUIT_CHAR[suitOf(card)]}</span>;
}

/** The active slap rules, always on screen during play. */
export function Legend({ rules, compact = false }: { rules: SlapRuleId[]; compact?: boolean }) {
  return (
    <section className={`egw-legend ${compact ? 'is-compact' : ''}`} aria-label="Slap rules in play" data-testid="egw-legend">
      <h2 className="egw-eyebrow">Slap on</h2>
      <ul>
        {rules.map((id) => (
          <li key={id} data-rule={id}>
            <span className="egw-legend-name">{RULE_BY_ID[id].name}</span>
            <span className="egw-legend-ex">{RULE_BY_ID[id].example.map((c, i) => <CardChip key={i} card={c} />)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
