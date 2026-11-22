import { describe, expect, it } from 'vitest';
import { isBusiness, qrModules, ticketMeta } from './ticketMeta';

describe('HSR ticket details', () => {
  it('derives a stable train number, serial and seat from the ticket id', () => {
    const a = ticketMeta('T-NGQ-BOB'), b = ticketMeta('T-NGQ-BOB');
    expect(a).toEqual(b);
    expect(a.train).toMatch(/^G[1-9]\d{0,3}$/);
    expect(a.serial).toMatch(/^[A-Z]\d{6}$/);
    expect(a.seat).toMatch(/^\d{2}车\d{2}[ABCDF]号$/);
  });

  it('gives different tickets different details', () => {
    const ids = ['T-NGQ-BOB', 'T-URC-SHA', 'T-HTN-HAK', 'T-HRB-HAK', 'T-NNG-CGQ', 'T-CGQ-TAO'];
    expect(new Set(ids.map((id) => ticketMeta(id).train)).size).toBe(ids.length);
    expect(new Set(ids.map((id) => ticketMeta(id).serial)).size).toBe(ids.length);
  });

  it('draws a QR-like pattern: three finder squares, the rest decided by the id', () => {
    const q = qrModules('T-NGQ-BOB');
    expect(q.length).toBe(15);
    expect(q.every((row) => row.length === 15)).toBe(true);
    // finder patterns: solid rings in three corners
    for (const [r, c] of [[0, 0], [0, 10], [10, 0]]) {
      expect(q[r][c] && q[r + 4][c + 4] && q[r + 2][c + 2]).toBe(true);
      expect(q[r + 1][c + 1]).toBe(false);
    }
    expect(qrModules('T-NGQ-BOB')).toEqual(q);
    expect(qrModules('T-URC-SHA')).not.toEqual(q);
  });

  it('makes the long tickets (20+ points) business class', () => {
    expect(isBusiness({ id: 'x', a: 'A', b: 'B', points: 20 })).toBe(true);
    expect(isBusiness({ id: 'x', a: 'A', b: 'B', points: 19 })).toBe(false);
  });
});
