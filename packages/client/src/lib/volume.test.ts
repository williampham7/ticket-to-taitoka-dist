import { describe, expect, it } from 'vitest';
import { getVolume, setVolume, subscribeVolume } from './sound';
import { HSR_PALETTE, PLAYER_COLORS, ROUTE_FILL, colorFill, isValidColor } from '../theme';

/** CIE76 colour difference between two #rrggbb colours (in Lab). */
function deltaE(a: string, b: string): number {
  const lab = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + bl * 0.0722), z = f((r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** CIEDE2000 colour difference (closer to what the eye sees than CIE76, especially for saturated colours). */
function deltaE2000(h1: string, h2: string): number {
  const lab = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const x = f((r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047), y = f(r * 0.2126 + g * 0.7152 + bl * 0.0722), z = f((r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  };
  const rad = Math.PI / 180;
  const [[L1, a1, b1], [L2, a2, b2]] = [lab(h1), lab(h2)];
  const Cb = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const [a1p, a2p] = [a1 * (1 + G), a2 * (1 + G)];
  const [C1, C2] = [Math.hypot(a1p, b1), Math.hypot(a2p, b2)];
  const hue = (a: number, b: number) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
  const [p1, p2] = [hue(a1p, b1), hue(a2p, b2)];
  let dh = C1 * C2 === 0 ? 0 : p2 - p1;
  if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1 * C2) * Math.sin((dh / 2) * rad);
  const Lb = (L1 + L2) / 2, Cbp = (C1 + C2) / 2;
  const hb = C1 * C2 === 0 ? p1 + p2 : Math.abs(p1 - p2) > 180 ? (p1 + p2 + (p1 + p2 < 360 ? 360 : -360)) / 2 : (p1 + p2) / 2;
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * 30 * Math.exp(-(((hb - 275) / 25) ** 2)) * rad) * RC;
  const [l, c, h] = [(L2 - L1) / SL, (C2 - C1) / SC, dH / SH];
  return Math.sqrt(l * l + c * c + h * h + RT * c * h);
}

describe('volume', () => {
  it('starts at full volume and stays between 0 and 1', () => {
    expect(getVolume()).toBe(1);
    setVolume(0.4);
    expect(getVolume()).toBeCloseTo(0.4);
    setVolume(3);
    expect(getVolume()).toBe(1);
    setVolume(-1);
    expect(getVolume()).toBe(0);
    setVolume(Number.NaN);
    expect(getVolume()).toBe(0);
  });

  it('tells listeners (the music player, the slider) when it changes', () => {
    let heard = 0;
    const stop = subscribeVolume(() => heard++);
    setVolume(0.7);
    stop();
    setVolume(0.2);
    expect(heard).toBe(1);
  });
});

describe('player colours (the same five presets on every build)', () => {
  const fills = PLAYER_COLORS.map((c) => c.fill);

  it('are the original USA colours, starting with a sharp green and a sharp blue', () => {
    expect(PLAYER_COLORS.map((c) => c.name)).toEqual(['Lime', 'Sky', 'Pink', 'Violet', 'Orange']);
    expect(fills).toEqual(['#a6e22e', '#3fa9ff', '#ff6fb5', '#b08cff', '#ff8c2a']);
  });

  it('every pair looks clearly different', () => {
    for (let i = 0; i < fills.length; i++) for (let j = i + 1; j < fills.length; j++) {
      expect(deltaE(fills[i], fills[j]), `${PLAYER_COLORS[i].name} vs ${PLAYER_COLORS[j].name}`).toBeGreaterThanOrEqual(38);
      expect(deltaE2000(fills[i], fills[j]), `${PLAYER_COLORS[i].name} vs ${PLAYER_COLORS[j].name}`).toBeGreaterThanOrEqual(20);
    }
  });

  it('none looks like a route on the vintage board', () => {
    for (const f of fills) for (const r of Object.values(ROUTE_FILL)) expect(deltaE(f, r), `${f} vs route ${r}`).toBeGreaterThanOrEqual(18);
  });

  it('none looks like a route on the HSR (China) board, whose route colours are pale so trains stand out', () => {
    for (const c of PLAYER_COLORS) for (const r of Object.values(HSR_PALETTE.ROUTE_FILL)) {
      expect(deltaE2000(c.fill, r), `${c.name} vs route ${r}`).toBeGreaterThanOrEqual(12);
    }
    // the HSR route colours still tell apart from each other
    const routes = Object.entries(HSR_PALETTE.ROUTE_FILL);
    for (let i = 0; i < routes.length; i++) for (let j = i + 1; j < routes.length; j++) {
      expect(deltaE2000(routes[i][1], routes[j][1]), `${routes[i][0]} vs ${routes[j][0]}`).toBeGreaterThanOrEqual(11);
    }
  });

  it('every colour is light (none is black or dark) so trains stand out', () => {
    for (const c of PLAYER_COLORS) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.fill.slice(i, i + 2), 16));
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b, c.name).toBeGreaterThan(130);
    }
  });

  it('a colour is a preset index; anything else (an old custom colour, a 6th preset) is not valid', () => {
    expect(colorFill(2)).toBe(PLAYER_COLORS[2].fill);
    expect(colorFill(undefined)).toBe(PLAYER_COLORS[0].fill);
    expect(colorFill(5 + 0x40c0a0)).toBe(PLAYER_COLORS[0].fill);
    expect(isValidColor(4)).toBe(true);
    expect(isValidColor(5)).toBe(false);
    expect(isValidColor(-1)).toBe(false);
    expect(isValidColor(1.5)).toBe(false);
    expect(isValidColor('2')).toBe(false);
  });
});
