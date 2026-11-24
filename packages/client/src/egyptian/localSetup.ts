import { DEFAULT_RULES, SLAP_RULE_IDS, validateRules, type SlapRuleId } from '@boboland/shared/src/egyptian';
import { load, save } from '../lib/storage';

/** Pass-and-play setup, remembered per device in `egw.local`. */
export interface LocalSetup { names: [string, string]; rules: SlapRuleId[] }
const KEY = 'egw.local';
const DEFAULT: LocalSetup = { names: ['Player 1', 'Player 2'], rules: [...DEFAULT_RULES] };

export function loadLocal(): LocalSetup {
  const raw = load<Partial<LocalSetup> | null>(KEY, null);
  if (!raw || typeof raw !== 'object') return { ...DEFAULT, names: [...DEFAULT.names] };
  const n = Array.isArray(raw.names) ? raw.names : [];
  const name = (i: 0 | 1) => (typeof n[i] === 'string' && n[i].trim() ? n[i].trim().slice(0, 20) : DEFAULT.names[i]);
  return { names: [name(0), name(1)], rules: validateRules(raw.rules) ? [...DEFAULT_RULES] : [...(raw.rules as SlapRuleId[])] };
}
export const saveLocal = (s: LocalSetup) => save(KEY, s);

/** Turn a rule on or off, in catalogue order; the last rule can never be turned off. */
export function toggleRule(rules: readonly SlapRuleId[], id: SlapRuleId): SlapRuleId[] {
  const on = rules.includes(id);
  if (on && rules.length === 1) return [...rules];
  const next = on ? rules.filter((r) => r !== id) : [...rules, id];
  return SLAP_RULE_IDS.filter((r) => next.includes(r));
}
