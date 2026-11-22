import type { City } from '@boboland/shared';

/**
 * Station labels for the modern (HSR) theme: the Chinese name above the English name, placed around the
 * station roundel. Pure geometry (map units), so a test can check that no two labels collide.
 */

/** Font sizes in map units: Chinese (Noto Sans SC) and English (Inter, small caps). */
export const ZH_SIZE = 20;
export const EN_SIZE = 14;
/** Rough glyph widths, slightly generous so the collision test errs on the safe side. */
const ZH_ADV = 1.0;
const EN_ADV = 0.7;
/** English baseline sits this far below the Chinese baseline. */
const LINE = 15.5;

/** Station roundel radius. */
export const stationR = (c: Pick<City, 'hub' | 'special'>) => (c.hub ? 21 : c.special ? 9.5 : 7.5);

export type Place = 'r' | 'l' | 't' | 'b' | 'tr' | 'tl' | 'br' | 'bl';
/**
 * Where each label goes on the HSR board (two-line labels need different room than the vintage one-liners),
 * with an optional nudge [dx, dy] in map units. Cities not listed use their map label side.
 */
export const HSR_PLACE: Record<string, Place | [Place, number, number]> = {
  KRL: 'tl', HTN: 'tl', GZE: 'b', TTH: 'tl', JGN: 'tr', YUS: 'tr', LJG: 'bl', DNH: 'tr', GOL: ['l', -12, 6], LXA: 'bl', LHW: ['bl', 0, 18],
  INC: ['t', -12, -12], HET: ['tl', 0, 6], XIY: ['l', -24, 6], CTU: ['l', -18, 6], CKG: ['bl', -12, 12],
  KMG: 'bl', NNG: 'bl', HAK: ['b', 0, -6], CGQ: ['r', 6, 0], SHE: ['r', 6, 0],
  DLC: 'br', TAO: ['r', 0, -6], CGO: ['bl', 0, 24], WUH: ['r', 18, 6], NKG: ['l', -24, 6],
  CSX: ['tl', 0, -24], XMN: ['r', 0, 6], CAN: ['tl', -6, -6], HKG: 'br',
};

export interface StationLabel {
  zh: string;
  en: string;
  anchor: 'start' | 'middle' | 'end';
  /** Anchor point of each line's baseline. */
  zhAt: [number, number];
  enAt: [number, number];
  /** Bounding box of both lines. */
  box: { x: number; y: number; w: number; h: number };
}

/** `xy` is the station's position; `en` and `zh` its names (use cityName / cityNameZh). */
export function stationLabel(city: City, [x, y]: [number, number], en: string, zh = ''): StationLabel {
  en = en.toUpperCase();
  const spec = HSR_PLACE[city.id] ?? (city.label as Place);
  const [place, dx, dy] = typeof spec === 'string' ? [spec, 0, 0] : spec;
  const r = stationR(city);
  const zhW = zh.length * ZH_SIZE * ZH_ADV, enW = en.length * EN_SIZE * EN_ADV;
  const w = Math.max(zhW, enW);
  // block: Chinese glyph top (baseline - .88em) to English baseline (capitals only, no descenders)
  const above = ZH_SIZE * 0.88, h = above + LINE;
  const gap = 4;
  let anchor: StationLabel['anchor'], ax: number, zhY: number;
  const d = r * 0.72 + gap - 1; // diagonal clearance
  switch (place) {
    case 'r': anchor = 'start'; ax = x + r + gap; zhY = y - h / 2 + above; break;
    case 'l': anchor = 'end'; ax = x - r - gap; zhY = y - h / 2 + above; break;
    case 't': anchor = 'middle'; ax = x; zhY = y - r - gap - LINE; break;
    case 'b': anchor = 'middle'; ax = x; zhY = y + r + gap + above - 1; break;
    case 'tr': anchor = 'start'; ax = x + d; zhY = y - d - LINE + 2; break;
    case 'tl': anchor = 'end'; ax = x - d; zhY = y - d - LINE + 2; break;
    case 'br': anchor = 'start'; ax = x + d; zhY = y + d + above - 2; break;
    case 'bl': anchor = 'end'; ax = x - d; zhY = y + d + above - 2; break;
  }
  ax += dx; zhY += dy;
  const left = anchor === 'start' ? ax : anchor === 'end' ? ax - w : ax - w / 2;
  return { zh, en, anchor, zhAt: [ax, zhY], enAt: [ax, zhY + LINE], box: { x: left, y: zhY - above, w, h } };
}

/** The hub's name plate ("北京 BEIJING"): centre and size in map units. */
export const PLATE_ZH = 24;
export const PLATE_EN = 19;
export function hubPlate([x, y]: [number, number], en: string, zh = '') {
  en = en.toUpperCase();
  const zhW = zh.length * PLATE_ZH, enW = en.length * PLATE_EN * 0.62;
  const pad = 11, sep = 16;
  const w = pad + zhW + sep + enW + pad, h = 36;
  const [ox, oy] = HUB_PLATE_AT;
  return { cx: x + ox, cy: y + oy, w, h, zh, en, zhW, enW, pad, sep };
}
/** Plate centre relative to the hub. */
export const HUB_PLATE_AT: [number, number] = [-55, -72];
