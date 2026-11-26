import { describe, expect, it } from 'vitest';
import { encodeCfg, readCfg, type LocalCfg } from './setup';

const q = (c: unknown) => `?s=${encodeCfg(c as LocalCfg)}`;
const ok: LocalCfg = { seats: [{ kind: 'human', name: 'Ana', avatar: 0 }, { kind: 'hard', name: 'Bot', avatar: 3 }], board: 'duo', hints: true };

describe('blocky setup', () => {
  it('readCfg rejects bad seats, duo needs 2', () => {
    expect(readCfg(q(ok))).toEqual(ok);
    expect(readCfg('')).toBeNull();
    expect(readCfg('?s=garbage')).toBeNull();
    expect(readCfg(q({ ...ok, seats: [ok.seats[0]] }))).toBeNull();
    expect(readCfg(q({ ...ok, seats: [ok.seats[0], { ...ok.seats[1], kind: 'god' }] }))).toBeNull();
    expect(readCfg(q({ ...ok, seats: [ok.seats[0], { ...ok.seats[1], avatar: 0 }] }))).toBeNull();
    expect(readCfg(q({ ...ok, seats: [ok.seats[0], { ...ok.seats[1], avatar: 9 }] }))).toBeNull();
    expect(readCfg(q({ ...ok, seats: ok.seats.map((s) => ({ ...s, kind: 'easy' })) }))).toBeNull();
    const three = { ...ok, seats: [...ok.seats, { kind: 'easy', name: 'C', avatar: 2 }] };
    expect(readCfg(q(three))).toBeNull();
    expect(readCfg(q({ ...three, board: 'classic' }))?.seats).toHaveLength(3);
    expect(readCfg(q({ ...ok, board: 'huge' }))).toBeNull();
  });
});
