import { HEROES, HERO_NAME, TREASURE_NAME, type KEvent, type KView } from '@boboland/shared/src/kingdom';

/** Hero colours: Knight scarlet, Ranger forest green, Sorceress violet-blue, Bard honey gold. */
export const HERO_COLOR = ['#c8323c', '#2f7d3a', '#5a4fcf', '#d79b1c'];
export const HERO_DEEP = ['#7d1820', '#174a20', '#2f2580', '#8a5c06'];
export const HERO_LIGHT = ['#f6c9c6', '#cfe8c4', '#d8d3f6', '#f8e2a8'];

export const heroOf = (v: Pick<KView, 'heroes'>, p: string) => v.heroes[Number(p)] ?? Number(p);
export const heroName = (v: Pick<KView, 'heroes'>, p: string) => HERO_NAME[HEROES[heroOf(v, p)]];

/** One line of the narrated log scroll ("The Knight found the Music Box!"). Never mentions a hidden target. */
export function narrate(e: KEvent, v: Pick<KView, 'heroes'>, names: Record<string, string>): string | null {
  const who = (p: string) => `the ${heroName(v, p)}`;
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  switch (e.k) {
    case 'shift': return `${cap(who(e.p))} pushed the maze${e.wraps.length ? `, and ${e.wraps.map(who).join(' and ')} tumbled round to the far side` : ''}.`;
    case 'move': return e.path.length > 1 ? `${cap(who(e.p))} walked ${e.path.length - 1} step${e.path.length > 2 ? 's' : ''}.` : `${cap(who(e.p))} stayed put.`;
    case 'collect': return `${cap(who(e.p))} found the ${TREASURE_NAME[e.t]}!`;
    case 'home': return `${cap(who(e.p))} has every treasure and heads for home!`;
    case 'turn': return `${names[e.p] ?? cap(who(e.p))}'s turn (${heroName(v, e.p)}).`;
    case 'resign': return e.by ? `${cap(who(e.p))} was sent home to rest.` : `${cap(who(e.p))} bowed out of the adventure.`;
    case 'win': return e.reason === 'home' ? `${cap(who(e.p))} is home: the adventure is won!` : `${cap(who(e.p))} is the last hero standing!`;
    default: return null;
  }
}
