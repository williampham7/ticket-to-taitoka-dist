import { useEffect, useState } from 'react';
import { ACTION_LABEL, conflicts, DEFAULT_KEYS, KEY_GROUPS, keyLabel, loadKeys, rebind, saveKeys, type Bindings, type KeyAction } from './keys';
import { FX_SETTINGS, setFx, useFxSetting } from './fx';
import { MusicButton, VolumeSlider } from '../lib/AudioButtons';

/** The bindings store, shared by the settings panel and the game's key handler. */
let current: Bindings = loadKeys();
const subs = new Set<() => void>();
export const getKeys = () => current;
function setKeys(b: Bindings) { current = b; saveKeys(b); subs.forEach((f) => f()); }
export function useKeys(): Bindings {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  return current;
}
/** True while a binding waits for its new key (the game must not act on that press). */
export let capturing = false;

/** Click a binding, press a key. Conflicts in the same mode are flagged. */
export function KeySettings() {
  const keys = useKeys();
  const [waiting, setWaiting] = useState<KeyAction | null>(null);
  const bad = conflicts(keys);
  useEffect(() => {
    capturing = waiting !== null;
    if (!waiting) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape') setKeys(rebind(current, waiting, e.code));
      setWaiting(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); capturing = false; };
  }, [waiting]);
  const group = (title: string, actions: KeyAction[]) => (
    <div className="egw-keys-group">
      <h3>{title}</h3>
      {actions.map((a) => (
        <div key={a} className={`egw-keys-row ${bad.has(a) ? 'is-bad' : ''}`}>
          <span>{ACTION_LABEL[a]}</span>
          <button type="button" className="egw-bind" data-testid={`egw-bind-${a}`} data-conflict={bad.has(a) || undefined}
            aria-label={`${ACTION_LABEL[a]}: ${keyLabel(keys[a])}. Click, then press a new key.`} onClick={() => setWaiting(a)}>
            {waiting === a ? 'Press a key…' : <span className="egw-key">{keyLabel(keys[a])}</span>}
          </button>
        </div>
      ))}
    </div>
  );
  return (
    <div className="egw-keys">
      {group('Pass and play', KEY_GROUPS.local)}
      {group('Online', KEY_GROUPS.online)}
      {bad.size > 0 && <p className="egw-warn" role="alert">Two actions share a key. Pick another key for the flagged ones.</p>}
      <button type="button" className="egw-btn egw-btn-ghost" data-testid="egw-keys-reset" onClick={() => setKeys({ ...DEFAULT_KEYS })}>Reset to defaults</button>
    </div>
  );
}

/** Keys, animations and audio, in a dialog (menu and in game). */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const fx = useFxSetting();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape' && !capturing) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="egw-modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="egw-panel egw-settings" data-testid="egw-settings-panel">
        <header><h2 className="egw-display">Settings</h2><button type="button" className="egw-btn egw-btn-ghost" onClick={onClose} data-testid="egw-settings-close">Done</button></header>
        <section>
          <h3 className="egw-eyebrow">Keys</h3>
          <KeySettings />
        </section>
        <section>
          <h3 className="egw-eyebrow">Animations</h3>
          <div className="egw-seg" role="radiogroup" aria-label="Animations">
            {FX_SETTINGS.map((v) => (
              <button key={v} type="button" role="radio" aria-checked={fx === v} className={fx === v ? 'on' : ''} onClick={() => setFx(v)}>
                {v === 'full' ? 'Full' : v === 'fast' ? 'Fast' : 'Off'}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3 className="egw-eyebrow">Sound</h3>
          <div className="egw-audio"><VolumeSlider /><MusicButton /></div>
        </section>
      </div>
    </div>
  );
}
