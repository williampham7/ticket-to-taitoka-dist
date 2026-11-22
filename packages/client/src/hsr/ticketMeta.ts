import type { Ticket } from '@boboland/shared';

/**
 * Made-up but stable details printed on an HSR (China Railway style) destination ticket: a G train number,
 * a red serial, a coach and seat, and a QR-like pattern. All derived from the ticket id, so a ticket always
 * looks the same on every screen. Pure decoration: no rule reads any of it.
 */

/** FNV-1a: a small, well-spread string hash. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** mulberry32: a tiny seeded random generator. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TicketMeta { train: string; serial: string; seat: string }

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const pad = (n: number, w: number) => String(n).padStart(w, '0');

export function ticketMeta(id: string): TicketMeta {
  const r = rng(hash(id));
  const train = `G${1 + Math.floor(r() * 1999)}`;
  const serial = `${LETTERS[Math.floor(r() * LETTERS.length)]}${pad(Math.floor(r() * 1e6), 6)}`;
  const seat = `${pad(1 + Math.floor(r() * 16), 2)}车${pad(1 + Math.floor(r() * 18), 2)}${'ABCDF'[Math.floor(r() * 5)]}号`;
  return { train, serial, seat };
}

/** Long tickets (20 points or more) travel business class: the special red-and-gold ticket. */
export const isBusiness = (t: Ticket) => t.points >= 20;

const QR = 15;
/** A 15×15 grid of on/off modules: QR-style finder squares in three corners, a timing line, the rest from the id. */
export function qrModules(id: string): boolean[][] {
  const r = rng(hash(`qr:${id}`));
  const finder = (y: number, x: number) => {
    for (const [fy, fx] of [[0, 0], [0, QR - 5], [QR - 5, 0]]) {
      const dy = y - fy, dx = x - fx;
      if (dy >= 0 && dy < 5 && dx >= 0 && dx < 5) return dy === 0 || dy === 4 || dx === 0 || dx === 4 || (dy === 2 && dx === 2);
    }
    return null;
  };
  return Array.from({ length: QR }, (_, y) => Array.from({ length: QR }, (_, x) => {
    const f = finder(y, x);
    if (f !== null) return f;
    // keep a quiet gap around the finders, like a real code
    if ((y === 5 && (x < 6 || x > QR - 7)) || (x === 5 && (y < 6 || y > QR - 7)) || (x === QR - 6 && y < 6) || (y === QR - 6 && x < 6)) return false;
    if (y === 6 && x > 5 && x < QR - 6) return x % 2 === 0;
    return r() < 0.48;
  }));
}

/** The modules as one SVG path (one 1×1 square per dark module), for a crisp, light-weight code. */
export function qrPath(id: string): string {
  let d = '';
  qrModules(id).forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x} ${y}h1v1h-1z`; }));
  return d;
}
export const QR_SIZE = QR;
