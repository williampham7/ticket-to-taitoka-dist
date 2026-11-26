import type { ReactNode } from 'react';

/**
 * The ten custom icons, drawn as little toys on a 24 grid: a 2 px ink outline (currentColor) over a two-tone fill
 * (honey, cream, mint, rose), so they sit with the keys and blocks rather than a stock line set.
 */
export type IconName = 'rotate' | 'flip' | 'confirm' | 'cancel' | 'suggest' | 'eye' | 'chat' | 'settings' | 'sound' | 'leave' | 'done';
const HONEY = '#f3c95e', CREAM = '#fbf3df', MINT = '#bfe6c4', ROSE = '#f6c3c6', STONE = '#e2d6bd', WOOD = '#d9a46a', SKY = '#bfe3f3';
const P: Record<IconName, ReactNode> = {
  rotate: <>
    <rect x="7.6" y="7.6" width="8.8" height="8.8" rx="2" fill={HONEY} /><path d="M9.2,9.8 q1.2,-1.2 3,-1" stroke="#fff" strokeWidth="1.4" />
    <path d="M20.2,10.2 A8.6,8.6 0 1,0 19.6,15.8" fill="none" strokeWidth="2.6" /><path d="M21.4,4.8 L20.6,10.6 L15,9.4" fill={CREAM} strokeWidth="2.4" />
  </>,
  flip: <>
    <path d="M12,6.6 V22.4" strokeWidth="1.8" strokeDasharray="2 1.8" />
    <path d="M9.4,8.6 V20.4 H3.2 V16.8 H5.8 V8.6Z" fill={HONEY} strokeWidth="2.2" /><path d="M14.6,8.6 V20.4 H20.8 V16.8 H18.2 V8.6Z" fill={CREAM} strokeWidth="2.2" />
    <path d="M5.6,5.4 Q12,0.6 18.4,5.4" fill="none" strokeWidth="2" /><path d="M16.2,3.4 L18.6,5.6 L15.6,6.6" fill="none" strokeWidth="2" />
  </>,
  confirm: <><circle cx="12" cy="12" r="9.4" fill={MINT} /><path d="M12,4.2 a7.8,7.8 0 0,1 7,4.6" stroke="#fff" strokeWidth="1.4" fill="none" /><path d="M7.4,12.4 L10.6,15.6 L16.8,8.6" strokeWidth="2.8" fill="none" /></>,
  cancel: <><circle cx="12" cy="12" r="9.4" fill={ROSE} /><path d="M12,4.2 a7.8,7.8 0 0,1 7,4.6" stroke="#fff" strokeWidth="1.4" fill="none" /><path d="M8.6,8.6 L15.4,15.4 M15.4,8.6 L8.6,15.4" strokeWidth="2.6" /></>,
  suggest: <>
    <path d="M12,1.6 V3.6" /><path d="M7.2,6.4 L12,3.4 L16.8,6.4Z" fill={WOOD} />
    <path d="M7.6,6.6 H16.4 L15.6,17.4 H8.4Z" fill={HONEY} /><path d="M12,9 C13.6,10.8 13.6,12.8 12,14.4 C10.4,12.8 10.4,10.8 12,9Z" fill="#fff8d8" strokeWidth="1.4" />
    <path d="M7.4,17.4 H16.6 V20 H7.4Z" fill={WOOD} /><path d="M3.2,10 H5 M19,10 H20.8 M4.4,5.4 L5.8,6.6 M19.6,5.4 L18.2,6.6" strokeWidth="1.6" />
  </>,
  eye: <>
    <path d="M2.2,12.4 C5,7 19,7 21.8,12.4 C19,17.6 5,17.6 2.2,12.4Z" fill="#fff" />
    <circle cx="12" cy="12.4" r="3.8" fill={SKY} /><circle cx="12" cy="12.4" r="1.6" fill="currentColor" stroke="none" /><circle cx="13.2" cy="11.2" r=".8" fill="#fff" stroke="none" />
    <path d="M5.4,8.6 L4.2,6.8 M9,7.2 L8.6,5.2 M15,7.2 L15.4,5.2 M18.6,8.6 L19.8,6.8" strokeWidth="1.8" />
  </>,
  chat: <>
    <path d="M5,17.2 C2.6,15.8 2.6,12.2 4.6,11 C3.8,7.4 7.6,5.2 10.2,6.6 C11.8,4.2 16.2,4.4 17.2,7.4 C20.4,7.2 22,10.4 20.6,12.8 C21.8,15.6 19.6,18 17,17.4 C15.6,19 12.6,19 11.4,17.6 C9.6,18.4 6.8,18.6 5,17.2Z" fill="#fff" />
    <path d="M4.8,21 L6.6,17.8" /><circle cx="8.6" cy="12.6" r="1.1" fill="currentColor" stroke="none" /><circle cx="12.2" cy="12.6" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.8" cy="12.6" r="1.1" fill="currentColor" stroke="none" />
  </>,
  settings: <>
    <path d="M12,2.4 l1.6,2.4 l2.8,-.9 l.5,2.9 l2.9,.5 l-.9,2.8 l2.4,1.6 l-2.4,1.6 l.9,2.8 l-2.9,.5 l-.5,2.9 l-2.8,-.9 l-1.6,2.4 l-1.6,-2.4 l-2.8,.9 l-.5,-2.9 l-2.9,-.5 l.9,-2.8 l-2.4,-1.6 l2.4,-1.6 l-.9,-2.8 l2.9,-.5 l.5,-2.9 l2.8,.9z" fill={STONE} />
    <circle cx="12" cy="12" r="4.2" fill={WOOD} /><circle cx="12" cy="12" r="1.7" fill={HONEY} />
    <path d="M7.4,7.8 q1.4,-1.8 3.6,-2.2" stroke="#fff" strokeWidth="1.4" fill="none" />
  </>,
  sound: <>
    <path d="M3,9.4 H7 L13.4,4.2 V19.8 L7,14.6 H3Z" fill={HONEY} strokeWidth="2.2" /><path d="M7,9.4 V14.6" strokeWidth="1.6" />
    <path d="M16.4,9 C18,10.6 18,13.4 16.4,15 M19,6.6 C21.8,9.6 21.8,14.4 19,17.4" fill="none" strokeWidth="2.2" />
  </>,
  done: <>
    <path d="M5,21.4 V3" strokeWidth="2.4" /><path d="M5,3.8 C9,1.8 12,6 18.8,4 V12.6 C12,14.6 9,10.4 5,12.4Z" fill={MINT} strokeWidth="2.2" />
    <path d="M7.4,6 q2,-1 3.6,0" stroke="#fff" strokeWidth="1.4" fill="none" /><circle cx="5" cy="21.6" r="1.4" fill={WOOD} />
  </>,
  leave: <>
    <path d="M4.4,3.6 H13.4 V20.4 H4.4Z" fill={WOOD} /><path d="M6.6,5.8 H11.2 V11 H6.6Z" fill={SKY} strokeWidth="1.4" /><circle cx="11.4" cy="13.6" r=".9" fill="currentColor" stroke="none" />
    <path d="M13.6,12 H21 M17.8,8.6 L21.2,12 L17.8,15.4" strokeWidth="2.4" fill="none" />
  </>,
};
export function Icon({ name, size = 22, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`bly-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[name]}
    </svg>
  );
}
export const ICONS = Object.keys(P) as IconName[];
