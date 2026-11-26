import type { Guild } from '@boboland/shared/src/blocky';

/** Guild shades (ART.md): top, top-light, south face, east bevel, rim highlight, ink. */
export interface GuildInk { top: string; light: string; south: string; east: string; rim: string; ink: string }
export const GUILD_INK: Record<Guild, GuildInk> = {
  tide: { top: '#3a8aa0', light: '#7cc3d2', south: '#1d5466', east: '#2b7286', rim: '#d6f0f2', ink: '#123c48' },
  sun: { top: '#ecba5a', light: '#f6d692', south: '#99631f', east: '#c48836', rim: '#fff2d2', ink: '#5e3a12' },
  ember: { top: '#db7357', light: '#efa48b', south: '#8a3727', east: '#b35140', rim: '#ffdccf', ink: '#5c2218' },
  grove: { top: '#74ad4f', light: '#a6d27f', south: '#3a6a28', east: '#5a963c', rim: '#e6f5d0', ink: '#234a18' },
};
export const INK = '#2b3550';

/** Sky ramps by progress (dawn, noon, golden, dusk, night): top, middle, horizon. */
const SKY: [number, [string, string, string]][] = [
  [0, ['#8fb5e0', '#f4c6c0', '#fde3c0']],
  [0.3, ['#5fb0ea', '#9fd6f3', '#e8f6fb']],
  [0.6, ['#6c9fd6', '#f2b878', '#fde2b0']],
  [0.82, ['#2f3d7a', '#9a6496', '#f29e77']],
  [1, ['#0d1636', '#1b2a5c', '#3a4c86']],
];
const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};
export function skyAt(progress: number): [string, string, string] {
  const t = Math.max(0, Math.min(1, progress));
  const i = Math.max(0, SKY.findIndex(([p]) => p >= t) - 1);
  const [p0, a] = SKY[i], [p1, b] = SKY[Math.min(SKY.length - 1, i + 1)];
  const k = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
  return [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
}
/** 0 = full day, 1 = full night: drives stars, lit lanterns and the moon. */
export const nightness = (progress: number) => Math.max(0, Math.min(1, (progress - 0.72) / 0.22));
