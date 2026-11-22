import { HSR, PLAYER_COLORS } from '../theme';

interface Props {
  /** colour code: an index into PLAYER_COLORS (see theme.ts) */
  value: number;
  /** codes other players already have */
  taken: number[];
  onChange: (code: number) => void;
  label: string;
  testId?: string;
}

/** The five preset colours in a row; one taken by another player is greyed out. */
export function ColorPicker({ value, taken, onChange, label, testId }: Props) {
  return (
    <div className={`flex items-center ${HSR ? 'gap-2' : 'gap-1.5'}`} role="radiogroup" aria-label={label} data-testid={testId}>
      {PLAYER_COLORS.map((c, ci) => {
        const on = value === ci;
        return (
          <button key={c.name} type="button" role="radio" aria-checked={on} aria-label={c.name} title={c.name}
            disabled={taken.includes(ci) && !on} onClick={() => onChange(ci)}
            className={HSR ? 'hsr-swatch' : `h-8 w-8 rounded-full border-2 transition ${on ? 'scale-110 border-ink ring-2 ring-ink/30' : 'border-ink/25 hover:border-ink/60'} disabled:opacity-20`}
            style={{ background: c.fill }} />
        );
      })}
    </div>
  );
}
