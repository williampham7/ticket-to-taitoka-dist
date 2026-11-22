import { HSR } from '../theme';

/** Pick the HSR or the vintage version of something (usually a class string); vintage stays exactly as it was. */
export const pick = <T,>(hsr: T, vintage: T): T => (HSR ? hsr : vintage);
