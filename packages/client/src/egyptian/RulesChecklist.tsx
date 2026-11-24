import { SLAP_RULES, type SlapRuleId } from '@boboland/shared/src/egyptian';
import { CardView } from './CardView';
import { toggleRule } from './localSetup';

/** The slap-rule checklist: one tile per rule with a mini card example. At least one rule stays on. */
export function RulesChecklist({ value, onChange, disabled = false }: { value: SlapRuleId[]; onChange?: (r: SlapRuleId[]) => void; disabled?: boolean }) {
  return (
    <fieldset className={`egw-rules ${disabled ? 'is-readonly' : ''}`} data-testid="egw-rules">
      <legend className="sr-only">Slap rules</legend>
      {SLAP_RULES.map((r) => {
        const on = value.includes(r.id);
        const last = on && value.length === 1;
        return (
          <label key={r.id} className={`egw-rule ${on ? 'is-on' : ''}`} title={last ? 'At least one rule stays on' : undefined}>
            <input type="checkbox" checked={on} disabled={disabled || last} data-testid={`egw-rule-${r.id}`}
              onChange={() => onChange?.(toggleRule(value, r.id))} />
            <span className="egw-rule-cards" aria-hidden>
              {r.example.map((c, i) => <CardView key={i} card={c} width={46} />)}
            </span>
            <span className="egw-rule-text">
              <span className="egw-rule-name">{r.name}</span>
              <span className="egw-rule-desc">{r.description}</span>
            </span>
            <span className="egw-rule-tick" aria-hidden />
          </label>
        );
      })}
    </fieldset>
  );
}
