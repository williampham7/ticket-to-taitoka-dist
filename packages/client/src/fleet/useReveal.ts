import { useEffect, useState } from 'react';
import type { ViewReport } from '@boboland/shared/src/fleet';
import { stepDelay, type FxSetting } from './fx';

/**
 * Plays new reports one square at a time. `from` is the last report this screen has already shown (results older
 * than that appear at once). Returns the reports still to show (oldest first) and how far the first one has got.
 */
export function useReveal(log: readonly ViewReport[], from: number, fx: FxSetting) {
  const [shown, setShown] = useState(from);
  const [step, setStep] = useState(0);
  const pending = log.filter((r) => r.seq > shown);
  const current = pending[0] ?? null;
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      if (step < current.cells.length) setStep((s) => s + 1);
      else { setShown(current.seq); setStep(0); }
    }, stepDelay(current, step, fx));
    return () => clearTimeout(t);
  }, [current?.seq, step, fx]); // eslint-disable-line react-hooks/exhaustive-deps
  const skip = () => {
    const last = log[log.length - 1];
    if (last) setShown(last.seq);
    setStep(0);
  };
  return { pending, current, step, busy: current !== null, skip };
}
