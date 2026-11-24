import { useEffect, useState } from 'react';

/** Date.now(), refreshed every `ms` while `on`. */
export function useNow(on: boolean, ms = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [on, ms]);
  return now;
}

/**
 * The waiting player's client asks the server to end the game once the turn clock has run out, then keeps
 * asking every 2 s (the server's clock may be a little behind ours; early calls are rejected harmlessly).
 */
export function useClaimTimeout(expired: boolean, claim: () => void): void {
  useEffect(() => {
    if (!expired) return;
    claim();
    const t = setInterval(claim, 2000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);
}
