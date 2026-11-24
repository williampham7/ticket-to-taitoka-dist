/**
 * Key bindings, by KeyboardEvent.code. Pass and play has two players on one keyboard (P1 on the left,
 * P2 on the right); online has one flip and one slap key. Saved per device in `egw.keys`.
 */
import { load, save } from '../lib/storage';

export type KeyAction = 'p1Flip' | 'p1Slap' | 'p2Flip' | 'p2Slap' | 'flip' | 'slap';
export type Bindings = Record<KeyAction, string>;
export type KeyGroup = 'local' | 'online';

export const DEFAULT_KEYS: Bindings = { p1Flip: 'KeyQ', p1Slap: 'KeyW', p2Flip: 'BracketRight', p2Slap: 'BracketLeft', flip: 'KeyF', slap: 'Space' };
export const KEY_GROUPS: Record<KeyGroup, KeyAction[]> = { local: ['p1Flip', 'p1Slap', 'p2Flip', 'p2Slap'], online: ['flip', 'slap'] };
export const ACTION_LABEL: Record<KeyAction, string> = {
  p1Flip: 'Player 1 flip', p1Slap: 'Player 1 slap', p2Flip: 'Player 2 flip', p2Slap: 'Player 2 slap', flip: 'Flip', slap: 'Slap',
};

const NAMED: Record<string, string> = {
  Space: 'Space', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/',
  Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', Enter: 'Enter', ShiftLeft: 'L Shift', ShiftRight: 'R Shift',
  ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl', AltLeft: 'L Alt', AltRight: 'R Alt', ArrowUp: '↑', ArrowDown: '↓',
  ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', Backspace: '⌫',
};
/** `KeyQ` -> `Q`, `Digit7` -> `7`, `Numpad3` -> `Num 3`, `BracketRight` -> `]`. */
export function keyLabel(code: string): string {
  if (NAMED[code]) return NAMED[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
  return code;
}

export const rebind = (b: Bindings, action: KeyAction, code: string): Bindings => ({ ...b, [action]: code });

/** Actions that share a key with another action of the same mode. */
export function conflicts(b: Bindings): Set<KeyAction> {
  const out = new Set<KeyAction>();
  for (const group of Object.values(KEY_GROUPS)) {
    for (const a of group) for (const c of group) if (a !== c && b[a] === b[c]) out.add(a);
  }
  return out;
}

const KEY = 'egw.keys';
export function loadKeys(): Bindings {
  const raw = load<Record<string, unknown>>(KEY, {});
  const out = { ...DEFAULT_KEYS };
  if (raw && typeof raw === 'object') {
    for (const a of Object.keys(DEFAULT_KEYS) as KeyAction[]) if (typeof raw[a] === 'string' && raw[a]) out[a] = raw[a] as string;
  }
  return out;
}
export const saveKeys = (b: Bindings) => save(KEY, b);

/** Focus is somewhere the player types (the chat box): never capture keys there. */
export function isEditable(target: EventTarget | null): boolean {
  const t = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!t) return false;
  return t.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(String(t.tagName).toUpperCase());
}

/** The action a key press means in this mode, or null (held-down repeats and typing never count). */
export function actionFor(b: Bindings, group: KeyGroup, e: { code: string; repeat: boolean; target: EventTarget | null }): KeyAction | null {
  if (e.repeat || isEditable(e.target)) return null;
  return KEY_GROUPS[group].find((a) => b[a] === e.code) ?? null;
}
