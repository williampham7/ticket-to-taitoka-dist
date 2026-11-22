import { describe, expect, it } from 'vitest';
import { canStart, firstFreeColor, gameSeatOf, joinedSeats, seatColors, MAX_SEATS } from './lobbyRules';

const seat = (id: number, name?: string, color?: number) => ({ id, name, color });

describe('waiting room', () => {
  it('has room for five, and lists only the people who joined, in seat order', () => {
    expect(MAX_SEATS).toBe(5);
    const seats = [seat(0, 'Host', 0), seat(1), seat(2, 'Bo', 3), seat(3), seat(4, 'Cy', 1)];
    expect(joinedSeats(seats).map((s) => s.name)).toEqual(['Host', 'Bo', 'Cy']);
  });

  it('gives a newcomer the first colour nobody has', () => {
    expect(firstFreeColor([seat(0, 'Host', 0)], 5)).toBe(1);
    expect(firstFreeColor([seat(0, 'Host', 1), seat(1, 'Bo', 0)], 5)).toBe(2);
    expect(firstFreeColor([seat(0, 'A', 0), seat(1, 'B', 1), seat(2, 'C', 2), seat(3, 'D', 3), seat(4, 'E', 4)], 5)).toBe(0);
  });

  it('settles colours: chosen ones are kept, a clash or a missing one gets the first free colour', () => {
    expect(seatColors([seat(0, 'Host', 2), seat(1, 'Bo', 2), seat(2, 'Cy')], 5)).toEqual([2, 0, 1]);
    expect(seatColors([seat(0, 'Host', 4), seat(3, 'Bo', 1)], 5)).toEqual([4, 1]);
  });

  it('a code that is not a preset (an old custom colour, or one from a build with more presets) gets the first free preset', () => {
    expect(seatColors([seat(0, 'Host', 5000), seat(1, 'Bo', 0)], 5)).toEqual([1, 0]);
    expect(seatColors([seat(0, 'Host', 4), seat(1, 'Bo', 7)], 5)).toEqual([4, 0]);
  });

  it('the host can start once at least two people are in', () => {
    expect(canStart([seat(0, 'Host', 0)])).toBe(false);
    expect(canStart([seat(0, 'Host', 0), seat(1), seat(2, 'Bo', 1)])).toBe(true);
  });

  it('each person takes the seat in the real game that matches their place in the joined list', () => {
    const seats = [seat(0, 'Host', 0), seat(1), seat(2, 'Bo', 3), seat(4, 'Cy', 1)];
    expect(gameSeatOf(seats, '0')).toBe('0');
    expect(gameSeatOf(seats, '2')).toBe('1');
    expect(gameSeatOf(seats, '4')).toBe('2');
    expect(gameSeatOf(seats, '1')).toBeNull();
  });
});
