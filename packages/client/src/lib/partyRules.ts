/**
 * Where a party member's screen goes, given where the host is. Pure, so it is unit-tested.
 * Members follow the host everywhere, except that games move people in and out of matches themselves
 * (the waiting room enters the game, the game opens the next waiting room), so during those hand-overs a
 * member who is already on their way stays put. Egyptian War works the same way with its own waiting room. Modes on one device (pass-and-play, Frontline or Fleet vs the
 * computer) leave members on a hold screen. The two-seat games (Frontline, Fleet) have no edition.
 */
export const HOLD = '/party/hold';
/** The host's location must be this old before members follow (the host may be passing through, e.g. /host). */
export const SETTLE_MS = 1200;

export interface FollowInput {
  at: { path: string; edition?: string };
  atAge: number;
  here: string;
  edition: string;
  hasSeat: (matchID: string) => boolean;
  hasFrontlineSeat: (matchID: string) => boolean;
  hasFleetSeat: (matchID: string) => boolean;
  /** a seat in an Egyptian War waiting room or game */
  hasEgyptianSeat: (matchID: string) => boolean;
  /** Warfront: I hold a seat in this war room or battle */
  hasWarfrontSeat?: (matchID: string) => boolean;
  /** Kingdom: I hold a seat in this waiting room or game */
  hasKingdomSeat?: (matchID: string) => boolean;
  /** I am the first member after the host (Frontline and Fleet seat one opponent; the rest watch) */
  firstMember: boolean;
}

export function followTarget(i: FollowInput): { path: string; edition?: string } | null {
  if (i.atAge < SETTLE_MS) return null;
  const path = targetPath(i);
  if (!path) return null;
  const ttr = path !== '/' && path !== HOLD && !NO_EDITION.some((g) => path.startsWith(`/${g}`)) && !path.startsWith('/warfront') && !path.startsWith('/kingdom'); // Kingdom: no edition
  if (ttr && i.at.edition && i.at.edition !== i.edition) return { path, edition: i.at.edition };
  return path === i.here ? null : { path };
}

/** The separate 2-player games: no edition; the first member takes seat 1, the rest watch. */
const TWO_SEAT = ['frontline', 'fleet'] as const;
/** The separate games: none of them has an edition. */
const NO_EDITION = [...TWO_SEAT, 'egyptian'] as const;

/**
 * Egyptian War (2-5 seats, a waiting room like the main game): members take free seats in the room and follow
 * into the game; anyone without a seat watches. While the room hands over to the game, stay put.
 */
function egyptian(b: string | undefined, c: string | undefined, here: string, seated: boolean): string | null {
  if (!b) return '/egyptian';
  if (b === 'local') return HOLD;
  if (!c) return null;
  if (b === 'wait') return seated ? `/egyptian/wait/${c}` : here.startsWith('/egyptian/play/') ? null : `/egyptian/join/${c}`;
  if (b === 'play') return seated ? `/egyptian/play/${c}` : here.startsWith('/egyptian/wait/') || here.startsWith('/egyptian/join/') ? null : `/egyptian/watch/${c}`;
  if (b === 'watch') return `/egyptian/watch/${c}`;
  return null;
}

function twoSeat(game: (typeof TWO_SEAT)[number], b: string | undefined, c: string | undefined, seated: boolean, firstMember: boolean): string | null {
  if (!b) return `/${game}`;
  if (b === 'local' || b === 'bot') return HOLD;
  if (b === 'watch' && c) return `/${game}/watch/${c}`;
  if (b === 'play' && c) return seated ? `/${game}/play/${c}` : firstMember ? `/${game}/join/${c}` : `/${game}/watch/${c}`;
  return null;
}

/** Warfront (2-6 players): a war room like Ticket's; members without a battle seat watch. */
function warfront(b: string | undefined, c: string | undefined, here: string, seated: boolean): string | null {
  if (!b) return '/warfront';
  if (b === 'local' || b === 'bot') return HOLD;
  if (b === 'wait' && c) return seated ? `/warfront/wait/${c}` : here.startsWith('/warfront/play/') ? null : `/warfront/join/${c}`;
  if (b === 'play' && c) return seated ? `/warfront/play/${c}` : here.startsWith('/warfront/wait/') || here.startsWith('/warfront/join/') ? null : `/warfront/watch/${c}`;
  if (b === 'watch' && c) return `/warfront/watch/${c}`;
  return null;
}

// Kingdom (2-4 players): a waiting room like Warfront's; members take free seats, the rest watch.
function kingdom(b: string | undefined, c: string | undefined, here: string, seated: boolean): string | null {
  if (!b) return '/kingdom';
  if (b === 'local' || b === 'bot' || b === 'gallery' || b === 'scenes') return HOLD;
  if (b === 'wait' && c) return seated ? `/kingdom/wait/${c}` : here.startsWith('/kingdom/play/') ? null : `/kingdom/join/${c}`;
  if (b === 'play' && c) return seated ? `/kingdom/play/${c}` : here.startsWith('/kingdom/wait/') || here.startsWith('/kingdom/join/') ? null : `/kingdom/watch/${c}`;
  if (b === 'watch' && c) return `/kingdom/watch/${c}`;
  return null;
}

function targetPath({ at, here, hasSeat, hasFrontlineSeat, hasFleetSeat, hasEgyptianSeat, hasWarfrontSeat, hasKingdomSeat, firstMember }: FollowInput): string | null {
  const [, a, b, c] = at.path.split('/');
  const inGame = here.startsWith('/play/');
  const inRoom = here.startsWith('/wait/') || here.startsWith('/join/');
  switch (a) {
    case '': return '/';
    case 'menu': return '/menu';
    case 'local': return HOLD;
    case 'wait': return !b ? null : hasSeat(b) ? `/wait/${b}` : inGame ? null : `/join/${b}`;
    case 'play': return !b ? null : hasSeat(b) ? `/play/${b}` : inRoom ? null : HOLD;
    case 'frontline': return twoSeat('frontline', b, c, !!c && hasFrontlineSeat(c), firstMember);
    case 'fleet': return twoSeat('fleet', b, c, !!c && hasFleetSeat(c), firstMember);
    case 'egyptian': return egyptian(b, c, here, !!c && hasEgyptianSeat(c));
    case 'warfront': return warfront(b, c, here, !!c && !!hasWarfrontSeat?.(c)); // Warfront
    case 'kingdom': return kingdom(b, c, here, !!c && !!hasKingdomSeat?.(c)); // Kingdom
    default: return null;
  }
}
