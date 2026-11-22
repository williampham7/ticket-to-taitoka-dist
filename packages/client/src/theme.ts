import type { Card, RouteColor } from '@boboland/shared';
import { EDITION } from './edition';

/**
 * Visual theme, set by the edition (edition.ts): 'vintage' (faded travel poster; USA), 'hsr' (modern
 * high-speed rail; China) or 'rail' (1930s continental railway; Europe). Rules never depend on it, only looks and sounds.
 * Every colour below exists in every palette under the same name, so components just import the name.
 * Tailwind tokens (bg-paper, text-ink, font-display, ...) switch through CSS variables scoped by [data-theme].
 */
export type ThemeId = 'vintage' | 'hsr' | 'rail';
export const THEME_ID: ThemeId = EDITION.theme;
export const HSR = THEME_ID === 'hsr';
/** European retro railway (1930s continental: enamel, brass, deco posters; Europe). */
export const RAIL = THEME_ID === 'rail';

const VINTAGE = {
  INK: '#3b2a1e',
  SOFT_INK: '#5b4636',
  PAPER: '#efe2c4',
  HALO: '#f3e8cf',
  OCEAN: '#a9c3bd',
  OCEAN_INK: '#5f8782',
  RIVER: '#6f9a95',
  ACCENT: '#b23a2e',
  /** Bright signal red for the cities on a hovered destination ticket: has to pop off the busy map. */
  TARGET: '#d23a2d',
  MUSTARD: '#e3b23c',
  /** Board/card colours: faded poster tones, kept light so players' trains stand out. */
  ROUTE_FILL: {
    red: '#d8705f', orange: '#eba25a', yellow: '#f0d06a', green: '#8fb77f', blue: '#78a6cf',
    black: '#5d5550', white: '#fbf8f1', gray: '#cbc3b3',
  } as Record<RouteColor, string>,
  ROUTE_STROKE: '#6b5848',
  /** Train cards: the same hues as the board, but brighter, so they read as something you can pick up. */
  CARD_FILL: {
    red: '#cf4a3a', orange: '#ea8a2c', yellow: '#f2c230', green: '#55a14a', blue: '#3b82c4',
    black: '#2f2a26', white: '#fffdf7',
  } as Record<Exclude<Card, 'locomotive'>, string>,
  LOCO_BG: 'linear-gradient(135deg,#cf4a3a 0%,#ea8a2c 18%,#f2c230 34%,#55a14a 52%,#3b82c4 70%,#2f2a26 100%)',
  /** Dark text on light cards, light text on dark cards. */
  CARD_INK_DARK: 'rgba(40,28,18,.85)',
  CARD_INK_LIGHT: '#fffaf0',
};
type Palette = typeof VINTAGE;

/** Modern high-speed rail: cool off-white and grey, deep navy ink, China Railway red, a teal sea; flat, saturated route colours. */
export const HSR_PALETTE: Palette = {
  INK: '#14213d',
  SOFT_INK: '#3d4b66',
  PAPER: '#f1f3f5',
  HALO: '#ffffff',
  OCEAN: '#bfe3e1',
  OCEAN_INK: '#3e8e8a',
  RIVER: '#6fb7cf',
  ACCENT: '#c8102e',
  TARGET: '#e0102f',
  MUSTARD: '#f2a900',
  /** Pale, so the players' bright trains stand out on the board (the cards keep the strong colours below). */
  ROUTE_FILL: {
    red: '#f6adb5', orange: '#fbcca5', yellow: '#fceaab', green: '#9fe1c2', blue: '#a7c9f8',
    black: '#3a3f55', white: '#ffffff', gray: '#c9d0da',
  },
  ROUTE_STROKE: '#4a5872',
  CARD_FILL: {
    red: '#d62839', orange: '#f07b1d', yellow: '#f5bf1f', green: '#1fa35c', blue: '#1f6fd6',
    black: '#1f2333', white: '#ffffff',
  },
  LOCO_BG: 'linear-gradient(135deg,#d62839 0%,#f07b1d 18%,#f5bf1f 34%,#1fa35c 52%,#1f6fd6 70%,#1f2333 100%)',
  CARD_INK_DARK: 'rgba(20,33,61,.88)',
  CARD_INK_LIGHT: '#ffffff',
};

/** European retro railway (1930s continental): cream timetable paper, deep green enamel, oxblood and brass. */
export const RAIL_PALETTE: Palette = {
  INK: '#1f2a24',
  SOFT_INK: '#4a5a50',
  PAPER: '#f2ead6',
  HALO: '#f7f1e1',
  OCEAN: '#b7cfc6',
  OCEAN_INK: '#3f6b5c',
  RIVER: '#7aa79b',
  ACCENT: '#7b1e2b',
  TARGET: '#c4262e',
  MUSTARD: '#b8903a',
  /** Faded gouache tones on the antique map, paler than the cards, so the players' bright trains stand out. */
  ROUTE_FILL: {
    red: '#e39a8d', orange: '#efbf8a', yellow: '#f1db8c', green: '#a8cba0', blue: '#9fbfdc',
    black: '#57524b', white: '#fdfaf1', gray: '#cdc6b1',
  },
  ROUTE_STROKE: '#4a4335',
  CARD_FILL: {
    red: '#b3262e', orange: '#d9772a', yellow: '#e3b92a', green: '#2f7d4a', blue: '#2f64a8',
    black: '#26231f', white: '#fbf7ea',
  },
  LOCO_BG: 'linear-gradient(135deg,#b3262e 0%,#d9772a 18%,#e3b92a 34%,#2f7d4a 52%,#2f64a8 70%,#26231f 100%)',
  CARD_INK_DARK: 'rgba(31,42,36,.88)',
  CARD_INK_LIGHT: '#fbf7ea',
};

export const PALETTE: Palette = HSR ? HSR_PALETTE : RAIL ? RAIL_PALETTE : VINTAGE;
export const {
  INK, SOFT_INK, PAPER, HALO, OCEAN, OCEAN_INK, RIVER, ACCENT, TARGET, MUSTARD,
  ROUTE_FILL, ROUTE_STROKE, CARD_FILL, LOCO_BG,
} = PALETTE;
export const cardBackground = (c: Card) => (c === 'locomotive' ? LOCO_BG : CARD_FILL[c]);
export const cardInk = (c: Card) => (c === 'white' || c === 'yellow' ? PALETTE.CARD_INK_DARK : PALETTE.CARD_INK_LIGHT);
export const cardName = (c: Card) => (c === 'locomotive' ? 'Locomotive' : c[0].toUpperCase() + c.slice(1));

/** Players: light, high-contrast colours (never black). Trains are outlined in ink, so light fills read well on the board. */
export interface PlayerColor { name: string; fill: string }
/**
 * The same five presets on every build (one per seat; there is no custom colour). Player 1 gets the first
 * colour, player 2 the second, and so on: a sharp green and a sharp blue lead.
 */
export const PLAYER_COLORS: PlayerColor[] = [
  { name: 'Lime', fill: '#a6e22e' },
  { name: 'Sky', fill: '#3fa9ff' },
  { name: 'Pink', fill: '#ff6fb5' },
  { name: 'Violet', fill: '#b08cff' },
  { name: 'Orange', fill: '#ff8c2a' },
];

/** A player's colour is a preset index (0-4); it travels through the lobby as a plain number. */
export const isValidColor = (code: unknown): code is number =>
  typeof code === 'number' && Number.isInteger(code) && code >= 0 && code < PLAYER_COLORS.length;
/** The fill for a colour code; anything unreadable (e.g. a custom colour saved by an older version) falls back to the first colour. */
export const colorFill = (code: number | undefined): string => PLAYER_COLORS[isValidColor(code) ? code : 0].fill;
