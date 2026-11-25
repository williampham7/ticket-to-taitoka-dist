import type { ReactElement } from 'react';
import type { TreasureId } from '@boboland/shared/src/kingdom';
import { INK } from './Defs';

/**
 * The 24 treasures, original art in one style (viewBox 0..100): a bold silhouette with a soft ink outline,
 * watercolour gradients from KingdomArtDefs, one highlight. Each must read at 32px, so details stay few and big.
 */
const o = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { stroke: INK, strokeWidth: 2.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const shine = (x: number, y: number, r = 5) => <ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill="#fff" opacity=".75" transform={`rotate(-30 ${x} ${y})`} />;
const sparkle = (x: number, y: number, s = 1) => <path d={`M${x},${y - 7 * s} L${x + 1.8 * s},${y - 1.8 * s} L${x + 7 * s},${y} L${x + 1.8 * s},${y + 1.8 * s} L${x},${y + 7 * s} L${x - 1.8 * s},${y + 1.8 * s} L${x - 7 * s},${y} L${x - 1.8 * s},${y - 1.8 * s} Z`} fill="#fff6c2" stroke={INK} strokeWidth="1.4" />;
const eye = (x: number, y: number, r = 3.4) => <g><circle cx={x} cy={y} r={r} fill={INK} /><circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.35} fill="#fff" /></g>;

const ART: Record<TreasureId, () => ReactElement> = {
  harp: () => (
    <g>
      <path d="M26,88 L26,22 Q26,10 40,12 Q58,16 66,30 Q74,44 86,46 L80,56 Q66,54 58,42 Q50,30 38,28 L38,88 Z" fill="url(#kg-gold)" {...o} />
      <path d="M22,88 H44" {...o} strokeWidth="6" />
      {[46, 54, 62, 70].map((x, i) => <path key={x} d={`M${x},${34 + i * 5} V${86 - i * 6}`} stroke="#fff3c4" strokeWidth="2.2" />)}
      <path d="M38,86 L80,58" {...o} fill="none" />
      <circle cx="32" cy="18" r="4" fill="#e04b5a" stroke={INK} strokeWidth="2" />
      {shine(31, 50, 3)}
    </g>
  ),
  slipper: () => (
    <g>
      <path d="M8,74 Q6,62 20,60 Q34,58 46,64 Q58,70 66,58 Q72,46 76,30 Q80,22 86,26 Q90,30 88,40 L82,62 L84,90 L77,90 L74,68 Q64,80 48,82 L18,84 Q8,84 8,74 Z" fill="url(#kg-glass)" {...o} />
      <path d="M46,64 Q58,70 66,58 Q72,46 76,30" fill="none" stroke="#5b86c4" strokeWidth="2.4" />
      <path d="M18,66 Q28,63 38,66" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <circle cx="24" cy="72" r="4" fill="#cfe4ff" stroke={INK} strokeWidth="1.6" />
      {sparkle(30, 30, 1.3)}{sparkle(56, 38, 0.8)}
    </g>
  ),
  crystal: () => (
    <g>
      <path d="M30,74 L70,74 L78,90 L22,90 Z" fill="url(#kg-gold)" {...o} />
      <circle cx="50" cy="44" r="30" fill="url(#kg-glass)" {...o} />
      <path d="M36,38 Q42,26 56,26" stroke="#fff" strokeWidth="4" fill="none" />
      <path d="M44,52 Q52,44 60,52 Q52,60 44,52 Z" fill="#b48cf2" opacity=".7" />
      {sparkle(66, 58, 0.7)}
    </g>
  ),
  musicbox: () => (
    <g>
      <path d="M14,48 L50,38 L86,48 L50,58 Z" fill="#c78a52" {...o} />
      <path d="M14,48 V78 L50,90 V58 Z" fill="#8f5a2e" {...o} />
      <path d="M86,48 V78 L50,90 V58 Z" fill="#b07440" {...o} />
      <path d="M14,48 L14,22 L50,12 L50,38" fill="#d79a62" {...o} />
      <path d="M22,62 L42,68 M58,68 L78,62" stroke="url(#kg-gold)" strokeWidth="4" />
      <path d="M86,64 h8 v-8" {...thin} fill="none" />
      <path d="M62,24 v-14 l10,-3 v14" {...thin} fill="none" /><circle cx="60" cy="25" r="3.4" fill={INK} /><circle cx="70" cy="22" r="3.4" fill={INK} />
    </g>
  ),
  sceptre: () => (
    <g>
      <path d="M30,88 L60,40" stroke={INK} strokeWidth="12" strokeLinecap="round" />
      <path d="M30,88 L60,40" stroke="url(#kg-gold)" strokeWidth="6" strokeLinecap="round" />
      <path d="M50,48 Q56,36 70,40 Q64,54 50,48 Z" fill="url(#kg-gold)" {...thin} />
      <circle cx="68" cy="28" r="15" fill="#d9374f" {...o} />
      <path d="M68,13 V8 M64,10 H72" {...thin} />
      {shine(63, 23, 4)}
      <circle cx="42" cy="68" r="4" fill="#3d8ee0" stroke={INK} strokeWidth="2" />
    </g>
  ),
  watch: () => (
    <g>
      <path d="M50,20 Q42,8 50,4 Q58,8 50,20" fill="none" stroke="url(#kg-gold)" strokeWidth="5" />
      <path d="M50,20 Q42,8 50,4 Q58,8 50,20" fill="none" stroke={INK} strokeWidth="1.5" />
      <rect x="43" y="16" width="14" height="9" rx="3" fill="url(#kg-gold)" {...thin} />
      <circle cx="50" cy="57" r="34" fill="url(#kg-gold)" {...o} />
      <circle cx="50" cy="57" r="25" fill="#fffaf0" stroke={INK} strokeWidth="2.6" />
      {[0, 90, 180, 270].map((a) => <path key={a} d="M50,36 V40" stroke={INK} strokeWidth="3" transform={`rotate(${a} 50 57)`} />)}
      <path d="M50,57 V42 M50,57 L61,63" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="50" cy="57" r="3" fill={INK} />
    </g>
  ),
  lantern: () => (
    <g>
      <circle cx="50" cy="56" r="34" fill="url(#kg-glow)" />
      <path d="M40,14 Q50,4 60,14" fill="none" {...o} />
      <path d="M30,26 H70 L64,18 H36 Z" fill="#4f6fb8" {...o} />
      <path d="M32,26 H68 V76 H32 Z" fill="#ffe38a" {...o} />
      <path d="M50,36 L54,47 L66,47 L56,54 L60,66 L50,58 L40,66 L44,54 L34,47 L46,47 Z" fill="#fff8d8" stroke="#d9a520" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M28,76 H72 L66,86 H34 Z" fill="#4f6fb8" {...o} />
    </g>
  ),
  teapot: () => (
    <g>
      <path d="M26,50 Q26,84 50,84 Q74,84 74,50 Z" fill="url(#kg-silver)" {...o} />
      <path d="M74,56 Q88,52 90,36 L84,34 Q82,46 72,48" fill="url(#kg-silver)" {...o} />
      <path d="M26,54 Q10,54 12,66 Q14,76 28,72" fill="none" {...o} strokeWidth="5" />
      <path d="M30,50 Q50,40 70,50 Q50,56 30,50 Z" fill="#dfe6ee" {...o} />
      <circle cx="50" cy="40" r="5" fill="url(#kg-silver)" {...thin} />
      <path d="M36,66 Q50,74 64,66" stroke="#9aa6b4" strokeWidth="3" fill="none" />
      {shine(38, 60, 4)}
    </g>
  ),
  apple: () => (
    <g>
      <path d="M50,30 Q36,20 24,30 Q12,44 18,64 Q26,88 44,86 Q50,84 56,86 Q74,88 82,64 Q88,44 76,30 Q64,20 50,30 Z" fill="url(#kg-gold)" {...o} />
      <path d="M50,30 Q50,18 56,10" {...o} fill="none" />
      <path d="M54,18 Q70,6 80,16 Q68,28 54,18 Z" fill="#5aa043" {...thin} />
      {shine(32, 44, 6)}
      {sparkle(78, 78, 0.7)}
    </g>
  ),
  wheel: () => (
    <g>
      <circle cx="44" cy="44" r="30" fill="none" {...o} strokeWidth="8" />
      <circle cx="44" cy="44" r="30" fill="none" stroke="#c9905a" strokeWidth="3.5" />
      {[0, 45, 90, 135].map((a) => <path key={a} d="M44,16 V72" {...thin} transform={`rotate(${a} 44 44)`} />)}
      <circle cx="44" cy="44" r="6" fill="#8f5a2e" {...thin} />
      <path d="M44,74 L32,92 M44,74 L58,92 M20,92 H76" {...o} fill="none" />
      <path d="M70,58 L90,30" {...o} />
      <ellipse cx="86" cy="36" rx="5" ry="9" fill="#f4e2b8" {...thin} transform="rotate(35 86 36)" />
    </g>
  ),
  coin: () => (
    <g>
      <ellipse cx="50" cy="54" rx="36" ry="36" fill="url(#kg-gold)" {...o} />
      <ellipse cx="50" cy="54" rx="27" ry="27" fill="none" stroke="#b07d16" strokeWidth="2.6" />
      <path d="M50,36 L55,49 L69,49 L58,57 L62,71 L50,63 L38,71 L42,57 L31,49 L45,49 Z" fill="#fff0b8" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
      {sparkle(84, 20, 1)}{sparkle(18, 22, 0.6)}
    </g>
  ),
  beans: () => (
    <g>
      <path d="M50,58 Q46,34 60,22 Q70,14 76,22 Q66,24 62,34" fill="none" stroke="#4f9a3c" strokeWidth="5" strokeLinecap="round" />
      <path d="M60,32 Q70,32 72,40 Q62,42 60,32 Z" fill="#6cc04f" {...thin} />
      {[[30, 72, -20, '#8a4fc9'], [52, 78, 10, '#4f9a3c'], [72, 68, 30, '#c9a33a']].map(([x, y, r, c], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
          <path d={`M${Number(x) - 14},${y} Q${Number(x) - 14},${Number(y) - 12} ${x},${Number(y) - 10} Q${Number(x) + 14},${Number(y) - 12} ${Number(x) + 14},${y} Q${Number(x) + 12},${Number(y) + 12} ${x},${Number(y) + 9} Q${Number(x) - 12},${Number(y) + 12} ${Number(x) - 14},${y} Z`} fill={c as string} {...o} strokeWidth="3.4" />
          <path d={`M${Number(x) - 6},${Number(y) - 4} Q${x},${Number(y) - 7} ${Number(x) + 6},${Number(y) - 4}`} stroke="#fff" strokeWidth="2.4" fill="none" opacity=".7" />
        </g>
      ))}
      {sparkle(24, 40, 0.8)}
    </g>
  ),
  unicorn: () => (
    <g>
      <path d="M40,90 Q30,66 38,46 Q44,32 58,30 Q74,30 82,46 Q88,56 80,62 Q74,64 66,56 Q62,70 66,90 Z" fill="#fffaf6" {...o} />
      <path d="M58,30 L64,4 L70,32" fill="url(#kg-gold)" {...o} />
      <path d="M61,20 L67,18 M60,26 L69,24" stroke="#b07d16" strokeWidth="2" />
      <path d="M52,32 Q30,30 26,46 Q22,58 30,70 Q26,56 36,52 Q30,64 38,74 Q38,56 46,48 Z" fill="#f49ac0" {...o} strokeWidth="3.4" />
      <path d="M54,34 L50,24 L58,30" fill="#fffaf6" {...thin} />
      {eye(68, 44)}
      <ellipse cx="80" cy="56" rx="2" ry="1.4" fill={INK} />
      <ellipse cx="66" cy="54" rx="4" ry="2.6" fill="#f7b3c8" opacity=".8" />
    </g>
  ),
  goose: () => (
    <g>
      <ellipse cx="72" cy="80" rx="12" ry="14" fill="url(#kg-gold)" {...o} />
      {shine(68, 74, 3)}
      <path d="M16,62 Q20,82 44,84 Q62,84 64,68 Q66,56 54,52 Q46,50 44,40 Q42,22 54,16 Q66,12 70,22 L84,24 L72,32 Q60,30 58,40 Q58,46 66,52 Q54,46 40,56 Q28,52 16,62 Z" fill="#fffaf0" {...o} />
      <path d="M70,22 L86,25 L72,31 Z" fill="#f29a2e" {...thin} />
      {eye(62, 22, 3)}
      <path d="M26,64 Q38,58 50,66" stroke="#d6cdb8" strokeWidth="3" fill="none" />
    </g>
  ),
  frog: () => (
    <g>
      <path d="M14,64 Q14,40 50,40 Q86,40 86,64 Q86,86 50,86 Q14,86 14,64 Z" fill="#6cc04f" {...o} />
      <circle cx="32" cy="40" r="13" fill="#6cc04f" {...o} /><circle cx="68" cy="40" r="13" fill="#6cc04f" {...o} />
      <circle cx="32" cy="40" r="7" fill="#fff" />{eye(33, 41, 4)}<circle cx="68" cy="40" r="7" fill="#fff" />{eye(67, 41, 4)}
      <path d="M32,66 Q50,78 68,66" stroke={INK} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <ellipse cx="26" cy="62" rx="5" ry="3" fill="#f3a5a5" opacity=".7" /><ellipse cx="74" cy="62" rx="5" ry="3" fill="#f3a5a5" opacity=".7" />
      <path d="M38,26 L40,12 L46,20 L50,8 L54,20 L60,12 L62,26 Z" fill="url(#kg-gold)" {...thin} />
    </g>
  ),
  fox: () => (
    <g>
      <path d="M14,18 L34,30 L66,30 L86,18 L80,50 Q76,74 50,88 Q24,74 20,50 Z" fill="#f4f7fb" {...o} />
      <path d="M18,22 L30,30 L22,42 Z M82,22 L70,30 L78,42 Z" fill="#b8c9de" />
      <path d="M50,88 Q40,78 34,66 Q50,72 66,66 Q60,78 50,88 Z" fill="#dbe6f2" />
      {eye(36, 52)}{eye(64, 52)}
      <path d="M44,70 Q50,76 56,70 Q50,64 44,70 Z" fill={INK} />
      <path d="M50,74 V80" stroke={INK} strokeWidth="2.4" />
      <path d="M26,44 Q30,40 36,42 M74,44 Q70,40 64,42" stroke="#9fb3cc" strokeWidth="2.4" fill="none" />
    </g>
  ),
  griffin: () => (
    <g>
      <path d="M82,74 Q94,64 90,52 Q88,62 80,66" fill="none" stroke="#c98d3e" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="50" cy="62" rx="32" ry="26" fill="#e8b866" {...o} />
      <path d="M20,58 Q8,46 14,34 Q24,46 32,48" fill="#f6dca6" {...o} strokeWidth="3.4" />
      <path d="M80,58 Q92,46 86,34 Q76,46 68,48" fill="#f6dca6" {...o} strokeWidth="3.4" />
      <circle cx="50" cy="40" r="22" fill="#f6dca6" {...o} />
      <path d="M44,8 Q48,18 50,20 Q52,14 58,10 Q56,18 52,22" fill="none" stroke={INK} strokeWidth="2.6" />
      {eye(41, 38)}{eye(59, 38)}
      <path d="M44,46 L56,46 L50,58 Z" fill="#f29a2e" {...thin} />
      <path d="M34,84 V90 M44,86 V92 M56,86 V92 M66,84 V90" stroke={INK} strokeWidth="3" />
    </g>
  ),
  fairy: () => (
    <g>
      <circle cx="50" cy="50" r="40" fill="url(#kg-glow)" opacity=".8" />
      <path d="M50,52 Q22,20 14,38 Q12,56 46,58 Z" fill="#cfe9ff" {...thin} opacity=".95" />
      <path d="M50,52 Q78,20 86,38 Q88,56 54,58 Z" fill="#cfe9ff" {...thin} opacity=".95" />
      <path d="M48,58 Q30,82 38,86 Q44,70 50,64 Z M52,58 Q70,82 62,86 Q56,70 50,64 Z" fill="#e3f2ff" {...thin} />
      <path d="M40,90 L50,50 L60,90 Z" fill="#f49ac0" {...o} strokeWidth="3.4" />
      <circle cx="50" cy="40" r="13" fill="url(#kg-skin)" {...o} strokeWidth="3.4" />
      <path d="M37,38 Q38,24 50,24 Q62,24 63,38 Q58,30 50,30 Q42,30 37,38 Z" fill="#f4c542" {...thin} />
      {eye(45, 42, 2.4)}{eye(55, 42, 2.4)}
      <path d="M64,58 L80,30" stroke={INK} strokeWidth="2.6" />
      {sparkle(81, 27, 1)}
    </g>
  ),
  gnome: () => (
    <g>
      <path d="M50,6 L76,52 H24 Z" fill="#d8413c" {...o} />
      <path d="M22,50 Q22,92 50,92 Q78,92 78,50 Z" fill="#fffaf0" {...o} />
      <path d="M22,52 H78" {...o} />
      <ellipse cx="50" cy="58" rx="20" ry="10" fill="url(#kg-skin)" {...thin} />
      {eye(41, 56, 2.8)}{eye(59, 56, 2.8)}
      <circle cx="50" cy="64" r="8" fill="#f2a07e" {...o} strokeWidth="3" />
      <path d="M34,74 Q42,80 50,76 Q58,80 66,74" stroke="#d6cdb8" strokeWidth="2.6" fill="none" />
      {shine(44, 26, 3)}
    </g>
  ),
  tortoise: () => (
    <g>
      <path d="M76,66 Q90,60 92,48 Q92,38 82,40 Q78,52 70,58" fill="#9ccc6a" {...o} />
      <circle cx="84" cy="44" r="2.8" fill={INK} />
      <circle cx="84" cy="44" r="6" fill="none" stroke={INK} strokeWidth="1.8" />
      <path d="M22,76 V86 M36,78 V88 M58,78 V88 M70,76 V86" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M22,76 V86 M36,78 V88 M58,78 V88 M70,76 V86" stroke="#9ccc6a" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M12,74 Q14,30 46,28 Q78,30 80,74 Z" fill="#8a6a3c" {...o} />
      <path d="M46,40 L58,48 L54,62 L38,62 L34,48 Z" fill="#b08a52" {...thin} />
      <path d="M46,40 L46,30 M58,48 L74,44 M54,62 L62,74 M38,62 L30,74 M34,48 L18,44" {...thin} />
      <path d="M8,76 H84" {...o} />
    </g>
  ),
  bear: () => (
    <g>
      <circle cx="26" cy="34" r="12" fill="#b07a4a" {...o} /><circle cx="74" cy="34" r="12" fill="#b07a4a" {...o} />
      <circle cx="26" cy="34" r="5" fill="#e8b98a" /><circle cx="74" cy="34" r="5" fill="#e8b98a" />
      <ellipse cx="50" cy="58" rx="34" ry="30" fill="#b07a4a" {...o} />
      <ellipse cx="50" cy="68" rx="15" ry="11" fill="#f0d0a8" {...thin} />
      <path d="M34,54 Q39,50 44,54 M56,54 Q61,50 66,54" stroke={INK} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="63" rx="5" ry="3.4" fill={INK} />
      <path d="M46,72 Q50,75 54,72" stroke={INK} strokeWidth="2.4" fill="none" />
      <path d="M74,12 h8 l-8,8 h8 M86,2 h6 l-6,6 h6" stroke="#5a4fcf" strokeWidth="2.8" fill="none" strokeLinejoin="round" />
    </g>
  ),
  rose: () => (
    <g>
      <path d="M50,92 V56" stroke="#3f7d2e" strokeWidth="5" strokeLinecap="round" />
      <path d="M50,74 Q36,70 30,78 Q40,84 50,78 Z" fill="#5aa043" {...thin} />
      <path d="M50,66 Q64,60 70,68 Q60,74 50,70 Z" fill="#5aa043" {...thin} />
      <path d="M30,40 Q28,22 44,18 Q50,10 58,16 Q74,18 72,36 Q72,54 50,58 Q30,56 30,40 Z" fill="url(#kg-rose)" {...o} />
      <path d="M40,36 Q44,26 52,28 Q60,30 58,40 Q54,46 46,44 Q48,36 54,36" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {sparkle(80, 22, 0.8)}{sparkle(22, 58, 0.6)}
    </g>
  ),
  phoenix: () => (
    <g>
      <path d="M22,92 Q40,70 46,44 Q50,22 70,8 Q86,20 80,40 Q74,64 22,92 Z" fill="#f29a2e" {...o} />
      <path d="M30,84 Q50,66 58,40 Q62,26 70,18 Q76,30 72,42 Q64,62 30,84 Z" fill="#ffd34d" />
      <path d="M40,74 Q54,60 62,42" stroke="#d9374f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M22,92 L58,46" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M46,44 Q36,40 30,46 M54,56 Q44,54 38,62 M64,34 Q74,40 80,36" stroke="#d9374f" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {sparkle(84, 62, 0.8)}
    </g>
  ),
  comb: () => (
    <g>
      {[16, 25, 34, 43, 52, 61, 70, 79].map((x) => <rect key={x} x={x} y="52" width="5.6" height="34" rx="2.8" fill="#ffd7d0" {...thin} />)}
      <rect x="10" y="42" width="80" height="14" rx="6" fill="#ffc2b8" {...o} />
      <path d="M50,44 L28,40 Q26,16 50,12 Q74,16 72,40 Z" fill="#ff9e8c" {...o} />
      {[34, 42, 50, 58, 66].map((x) => <path key={x} d={`M50,42 L${x},18`} stroke="#d9675a" strokeWidth="2.2" />)}
      <circle cx="50" cy="44" r="6.5" fill="#fffaf2" {...thin} />
      {shine(48, 42, 2)}
      {sparkle(86, 22, 0.7)}
    </g>
  ),
};

export function TreasureGlyph({ t }: { t: TreasureId }) {
  return ART[t]();
}

/** A standalone treasure image (cards, banners, gallery). */
export function TreasureIcon({ t, size, className }: { t: TreasureId; size?: number; className?: string }) {
  return <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden><TreasureGlyph t={t} /></svg>;
}
