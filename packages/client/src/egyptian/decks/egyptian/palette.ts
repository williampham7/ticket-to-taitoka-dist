import type { Suit } from '@boboland/shared/src/egyptian';

/** Card stock, ink and gold. Suits keep classic red and black so they read at a glance. */
export const INK = {
  red: '#b3231b',
  black: '#18140f',
  gold: '#c99a2e',
  goldHi: '#f6dc84',
  goldLo: '#7d5a14',
  papyrus: '#efe2bf',
  papyrusDeep: '#dcc693',
  line: '#3a2a18',
  lapis: '#1d3478',
  lapisDeep: '#0f1b47',
  white: '#f7f1e1',
  /** Egyptian art paints men red-brown and women a lighter ochre */
  skinMan: '#a85f37',
  skinWoman: '#d09a5c',
  hair: '#1a1720',
};

export interface House { name: string; motif: string; main: string; deep: string; light: string; accent: string }

export const HOUSES: Record<Suit, House> = {
  S: { name: 'House of Night', motif: 'jackal and stars', main: '#28479a', deep: '#132457', light: '#dfe3f1', accent: '#e8c25a' },
  H: { name: 'House of the Nile', motif: 'lotus and ibis', main: '#16807e', deep: '#0b4c4c', light: '#dcefe9', accent: '#d8708a' },
  D: { name: 'House of the Sun', motif: 'sun disc and falcon', main: '#c2461b', deep: '#7c2610', light: '#f6e2c6', accent: '#e3a323' },
  C: { name: 'House of the Delta', motif: 'papyrus and scarab', main: '#2d7a4d', deep: '#174a2c', light: '#dde9d4', accent: '#bb8530' },
};

export const suitInk = (s: Suit) => (s === 'H' || s === 'D' ? INK.red : INK.black);
