import { Icon } from './art/icons';
import { setSetting, useSettings } from './settings';
import type { FxLevel } from './fx';
import type { ConfirmPref } from './input';
import { SoundRows } from './SoundRows';

/** Personal settings, on a carved stone slab: animations, sound, open corners, confirm placements, clean view. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const seg = <T extends string>(label: string, val: T, opts: [T, string][], set: (v: T) => void, id: string) => (
    <div className="bly-set-row"><span>{label}</span>
      <div className="bly-seg bly-seg-sm" role="radiogroup" aria-label={label}>
        {opts.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={val === v} onClick={() => set(v)} data-testid={`${id}-${v}`}>{t}</button>)}
      </div>
    </div>
  );
  return (
    <div className="bly-modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bly-modal-card bly-stone bly-settings">
        <header><h2><Icon name="settings" size={26} /> Settings</h2><button type="button" className="bly-key bly-key-sm bly-key-icon" aria-label="Close settings" onClick={onClose}><Icon name="cancel" size={18} /></button></header>
        {seg<FxLevel>('Animations', s.fx, [['full', 'Full'], ['fast', 'Fast'], ['off', 'Off']], (v) => setSetting('fx', v), 'bly-fx')}
        <SoundRows />
        {seg<ConfirmPref>('Confirm placements', s.confirm, [['auto', 'On touch'], ['on', 'Always'], ['off', 'Never']], (v) => setSetting('confirm', v), 'bly-confirmpref')}
        <label className="bly-set-row"><span>Show open corners <small>the diamonds while you wait</small></span><input type="checkbox" checked={s.corners} onChange={(e) => setSetting('corners', e.target.checked)} /></label>
        <label className="bly-set-row"><span>Clean view <small>hide decoration (hold V)</small></span><input type="checkbox" checked={s.clean} onChange={(e) => setSetting('clean', e.target.checked)} /></label>
      </div>
    </div>
  );
}
