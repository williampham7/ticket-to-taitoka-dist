import { Puff } from './sky';

/** A tall bank of layered puff clouds (one half of the pass-and-play curtain); mirrored for the right side. */
export function CloudBank({ side }: { side: 'l' | 'r' }) {
  const rows = [80, 230, 380, 530, 680, 830, 980];
  return (
    <svg className={`bly-bank bly-bank-${side}`} viewBox="0 0 700 1000" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <defs><linearGradient id={`bly-bank-g-${side}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#eaf4fb" /><stop offset=".8" stopColor="#fff" /></linearGradient></defs>
      <rect width="560" height="1000" fill={`url(#bly-bank-g-${side})`} />
      {rows.map((y, i) => <Puff key={`a${i}`} x={470 + (i % 2) * 70} y={y} s={1.9 + (i % 3) * 0.25} shade="#cfe0ee" />)}
      {rows.map((y, i) => <Puff key={`b${i}`} x={300 + (i % 2) * 60} y={y + 70} s={1.6} tone="#f7fbfe" shade="#dce9f4" />)}
    </svg>
  );
}
