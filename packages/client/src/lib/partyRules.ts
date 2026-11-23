/**
 * Where a party member's screen goes, given where the host is. Pure, so it is unit-tested.
 * Members follow the host everywhere, except that games move people in and out of matches themselves
 * (the waiting room enters the game, the game opens the next waiting room), so during those hand-overs a
 * member who is already on their way stays put. Modes on one device (pass-and-play, Frontline vs the computer)
 * leave members on a hold screen.
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
  /** I am the first member after the host (Frontline seats one opponent; the rest watch) */
  firstMember: boolean;
}

export function followTarget(i: FollowInput): { path: string; edition?: string } | null {
  if (i.atAge < SETTLE_MS) return null;
  const path = targetPath(i);
  if (!path) return null;
  const ttr = path !== '/' && path !== HOLD && !path.startsWith('/frontline');
  if (ttr && i.at.edition && i.at.edition !== i.edition) return { path, edition: i.at.edition };
  return path === i.here ? null : { path };
}

function targetPath({ at, here, hasSeat, hasFrontlineSeat, firstMember }: FollowInput): string | null {
  const [, a, b, c] = at.path.split('/');
  const inGame = here.startsWith('/play/');
  const inRoom = here.startsWith('/wait/') || here.startsWith('/join/');
  switch (a) {
    case '': return '/';
    case 'menu': return '/menu';
    case 'local': return HOLD;
    case 'wait': return !b ? null : hasSeat(b) ? `/wait/${b}` : inGame ? null : `/join/${b}`;
    case 'play': return !b ? null : hasSeat(b) ? `/play/${b}` : inRoom ? null : HOLD;
    case 'frontline':
      if (!b) return '/frontline';
      if (b === 'local' || b === 'bot') return HOLD;
      if (b === 'watch' && c) return `/frontline/watch/${c}`;
      if (b === 'play' && c) return hasFrontlineSeat(c) ? `/frontline/play/${c}` : firstMember ? `/frontline/join/${c}` : `/frontline/watch/${c}`;
      return null;
    default: return null;
  }
}
