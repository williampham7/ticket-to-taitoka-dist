/**
 * Rules for the LAN / online waiting room. The waiting room is a 5-seat match; when the host starts,
 * a fresh match sized to the people who joined is created and everyone moves into it, in seat order.
 */
export const MAX_SEATS = 5;

export interface WaitingSeat { id: number; name?: string; color?: number }

/** People who have taken a seat, in seat order. */
export function joinedSeats<T extends WaitingSeat>(seats: T[]): T[] {
  return seats.filter((s) => !!s.name).sort((a, b) => a.id - b.id);
}

/** The first colour (index) that no joined player has; 0 if every colour is taken. */
export function firstFreeColor(seats: WaitingSeat[], colorCount: number): number {
  const used = new Set(joinedSeats(seats).map((s) => s.color));
  for (let c = 0; c < colorCount; c++) if (!used.has(c)) return c;
  return 0;
}

/**
 * One colour per joined seat (in seat order): chosen presets (0..colorCount-1) kept; a clash, a missing
 * choice or a code that is not a preset gets the first free one.
 */
export function seatColors(seats: WaitingSeat[], colorCount: number): number[] {
  const joined = joinedSeats(seats);
  const used = new Set<number>();
  const out: (number | null)[] = joined.map((s) => {
    if (s.color === undefined || !Number.isInteger(s.color) || s.color < 0 || s.color >= colorCount || used.has(s.color)) return null;
    used.add(s.color);
    return s.color;
  });
  return out.map((c) => {
    if (c !== null) return c;
    let free = 0;
    while (used.has(free) && free < colorCount - 1) free++;
    used.add(free);
    return free;
  });
}

export const canStart = (seats: WaitingSeat[]) => joinedSeats(seats).length >= 2;

/** Seat (playerID) in the real game for the person in waiting-room seat `waitingID`, or null if they hadn't joined. */
export function gameSeatOf(seats: WaitingSeat[], waitingID: string): string | null {
  const i = joinedSeats(seats).findIndex((s) => String(s.id) === waitingID);
  return i < 0 ? null : String(i);
}
