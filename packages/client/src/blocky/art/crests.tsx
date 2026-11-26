import type { Guild } from '@boboland/shared/src/blocky';
import { INK } from './palette';

/** A guild's heraldic badge: a shield in the guild colours, brass rim and rivets, the emblem in cream. */
export function Crest({ guild, size = 40, shared = false, className = '' }: { guild: Guild; size?: number; shared?: boolean; className?: string }) {
  const shield = 'M20,3 L35,8 V20 C35,29 28,35 20,38 C12,35 5,29 5,20 V8Z';
  return (
    <svg className={`bly-crest bly-g-${guild} ${className}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path d={shield} transform="translate(1 1.6)" fill={INK} opacity=".25" />
      <path d={shield} style={{ fill: shared ? '#e9dfca' : 'var(--g-top)' }} stroke="#b08732" strokeWidth="2.6" strokeLinejoin="round" />
      {shared && <g clipPath="url(#bly-crest-clip)"><rect x="0" y="0" width="20" height="20" fill="#3a8aa0" /><rect x="20" y="0" width="20" height="20" fill="#ecba5a" /><rect x="0" y="20" width="20" height="20" fill="#74ad4f" /><rect x="20" y="20" width="20" height="20" fill="#db7357" /></g>}
      {shared && <clipPath id="bly-crest-clip"><path d={shield} /></clipPath>}
      <path d="M20,3 L35,8 V20 C35,29 28,35 20,38Z" style={{ fill: 'var(--g-south)' }} opacity=".35" />
      <path d="M8,10 L20,5.6 L32,10" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" strokeLinecap="round" />
      {shared && <path d={shield} fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="3 2.4" opacity=".9" transform="translate(20 20.5) scale(.8) translate(-20 -20.5)" />}
      {shared ? <g fill="none" stroke="#fff8ea" strokeWidth="2.4" strokeLinecap="round"><circle cx="16.5" cy="20" r="5" /><circle cx="23.5" cy="20" r="5" /></g>
        : <use href={`#bly-em-${guild}`} x="10" y="10" width="20" height="20" style={{ color: '#fff8ea' }} />}
      <path d={shield} fill="none" stroke="#2b3550" strokeOpacity=".8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <path d={shield} fill="none" stroke="#f6e09a" strokeWidth=".9" strokeLinejoin="round" transform="translate(20 20.5) scale(.9) translate(-20 -20.5)" opacity=".7" />
      {[[8, 9.5], [32, 9.5]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.3" fill="#f6e09a" stroke="#6f5320" strokeWidth=".5" />)}
    </svg>
  );
}
