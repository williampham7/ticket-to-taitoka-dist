import { EDITIONS, EDITION_IDS, type EditionId } from '@boboland/shared';
import { EDITION, setEdition } from '../edition';
import { HSR, MERLION, RAIL } from '../theme';

export interface EditionSwitcherProps {
  /** The edition shown as chosen (default: the page's own). */
  value?: EditionId;
  /** Called with the picked edition (default: save it and reload this page on it). */
  onChange?: (id: EditionId) => void;
  /** Shown but not changeable (e.g. a guest in the waiting room, where the host picks). */
  locked?: boolean;
  /** Why it is locked, shown as its tooltip. */
  lockedNote?: string;
}

const shape = HSR || MERLION ? 'rounded-full' : RAIL ? 'rounded-[3px]' : 'rounded-lg';

/**
 * A compact control in the top bar of the menu screens: USA / China / Europe / Singapore ("SG" on phones).
 * Picking another edition reloads the page on it (every screen reads its map and theme once, on load).
 */
export function EditionSwitcher({ value = EDITION.id, onChange, locked = false, lockedNote = 'Host picks the map' }: EditionSwitcherProps) {
  const pick = (id: EditionId) => {
    if (locked || id === value) return;
    (onChange ?? ((x: EditionId) => setEdition(x)))(id);
  };
  return (
    <div role="radiogroup" aria-label="Map" title={locked ? lockedNote : 'Change the map'} data-testid="edition-switcher"
      data-locked={locked || undefined}
      className={`flex h-9 items-center gap-0.5 border border-line bg-panel-2 p-0.5 ${shape} ${locked ? 'opacity-75' : ''}`}>
      {locked && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
          className="mx-1 shrink-0 text-muted" aria-label={lockedNote} role="img">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      )}
      {EDITION_IDS.map((id) => {
        const on = id === value;
        return (
          <button key={id} type="button" role="radio" aria-checked={on} disabled={locked && !on} onClick={() => pick(id)}
            data-testid={`edition-${id}`}
            className={`h-full px-2.5 text-[14px] leading-none tracking-wide transition-colors sm:px-3 ${shape} ${
              on ? 'bg-ink text-panel' : 'text-ink enabled:hover:bg-panel'} ${locked ? 'cursor-default' : ''} disabled:text-muted`}>
            {id === 'singapore'
              ? <><span className="sm:hidden">SG</span><span className="max-sm:hidden">{EDITIONS[id].label}</span></>
              : EDITIONS[id].label}
          </button>
        );
      })}
    </div>
  );
}
