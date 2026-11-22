import { describe, expect, it } from 'vitest';
import { EDITIONS, EDITION_IDS, editionFor, isEditionId } from '../src/editions';
import {
  MAPS, MAP_ID, DEFAULT_MAP_ID, ROUTES, CITIES, TICKETS, TICKET_BY_ID, ROUTE_BY_ID, CITY_BY_ID,
  withMap, useMap, onMapChange, cityXY,
} from '../src/map';
import * as mapMod from '../src/map';
import * as plan from '../src/bot/plan';
import { BobolandGame, legalActions, withGameMap, mapOfGame } from '../src/game';
import { chooseBotMove } from '../src/bot';
import { seededRandom } from '../src/engine/rng';
import type { GState } from '../src/types';
import { activeMapId } from '../src/map/active';

describe('editions', () => {
  it('has exactly usa, china and europe with their map, skin and theme', () => {
    expect(EDITION_IDS).toEqual(['usa', 'china', 'europe']);
    expect(EDITIONS.usa).toEqual({ id: 'usa', map: 'usa', skin: 'taitoka', theme: 'vintage', label: 'USA' });
    expect(EDITIONS.china).toEqual({ id: 'china', map: 'china', skin: 'beijing', theme: 'hsr', label: 'China' });
    expect(EDITIONS.europe).toEqual({ id: 'europe', map: 'europe', skin: 'europa', theme: 'rail', label: 'Europe' });
  });

  it('isEditionId / editionFor', () => {
    expect(isEditionId('china')).toBe(true);
    expect(isEditionId('sf')).toBe(false);
    expect(isEditionId(undefined)).toBe(false);
    expect(editionFor('europe')).toBe(EDITIONS.europe);
    expect(editionFor('nope')).toBe(EDITIONS.usa);
    expect(editionFor(null)).toBe(EDITIONS.usa);
  });
});

describe('withMap / useMap', () => {
  it('starts on the default map', () => {
    expect(MAP_ID).toBe(DEFAULT_MAP_ID);
    expect(ROUTES).toBe(MAPS[DEFAULT_MAP_ID].routes);
  });

  it('swaps every binding for the duration and restores afterwards', () => {
    const before = { ROUTES, CITIES, TICKETS, TICKET_BY_ID };
    const seen = withMap('china', () => ({
      id: mapMod.MAP_ID, routes: mapMod.ROUTES, cities: mapMod.CITIES, tickets: mapMod.TICKETS,
      ticket: mapMod.TICKET_BY_ID[MAPS.china.tickets[0].id], route: mapMod.ROUTE_BY_ID[MAPS.china.routes[0].id],
      xy: mapMod.cityXY(MAPS.china.cities[0].id),
    }));
    expect(seen.id).toBe('china');
    expect(seen.routes).toBe(MAPS.china.routes);
    expect(seen.cities).toBe(MAPS.china.cities);
    expect(seen.tickets).toBe(MAPS.china.tickets);
    expect(seen.ticket).toBe(MAPS.china.tickets[0]);
    expect(seen.route).toBe(MAPS.china.routes[0]);
    expect(seen.xy).toHaveLength(2);
    expect(mapMod.MAP_ID).toBe(DEFAULT_MAP_ID);
    expect(mapMod.ROUTES).toBe(before.ROUTES);
    expect(mapMod.CITIES).toBe(before.CITIES);
    expect(mapMod.TICKETS).toBe(before.TICKETS);
    expect(mapMod.TICKET_BY_ID).toBe(before.TICKET_BY_ID);
    void ROUTE_BY_ID, CITY_BY_ID, cityXY;
  });

  it('nests and restores each level, also when fn throws', () => {
    withMap('usa', () => {
      expect(mapMod.MAP_ID).toBe('usa');
      withMap('europe', () => expect(mapMod.MAP_ID).toBe('europe'));
      expect(mapMod.MAP_ID).toBe('usa');
      expect(() => withMap('china', () => { throw new Error('boom'); })).toThrow('boom');
      expect(mapMod.MAP_ID).toBe('usa');
    });
    expect(mapMod.MAP_ID).toBe(DEFAULT_MAP_ID);
  });

  it('returns fn result', () => {
    expect(withMap('europe', () => mapMod.ROUTES.length)).toBe(MAPS.europe.routes.length);
  });

  it('caches one model per map (same objects every time)', () => {
    const a = withMap('china', () => mapMod.CITY_BY_ID);
    const b = withMap('china', () => mapMod.CITY_BY_ID);
    expect(a).toBe(b);
  });

  it('onMapChange fires on each swap and can be removed', () => {
    const seen: string[] = [];
    const off = onMapChange((id) => seen.push(id));
    withMap('europe', () => undefined);
    off();
    withMap('usa', () => undefined);
    expect(seen).toEqual(['europe', DEFAULT_MAP_ID]);
  });

  it('useMap switches until switched back', () => {
    const prev = mapMod.MAP_ID;
    useMap('europe');
    expect(mapMod.TICKETS).toBe(MAPS.europe.tickets);
    useMap(prev);
    expect(mapMod.MAP_ID).toBe(prev);
  });
});

describe('bot plan caches follow the map', () => {
  it('rebuilds indexes per map and reuses them', () => {
    const china = withMap('china', () => ({
      n: plan.N_ROUTES, c: plan.N_CITIES, idx: plan.CITY_INDEX, adj: plan.ADJ, len: plan.LEN,
      first: plan.CITY_INDEX.get(MAPS.china.cities[0].id),
    }));
    expect(china.n).toBe(MAPS.china.routes.length);
    expect(china.c).toBe(MAPS.china.cities.length);
    expect(china.adj).toHaveLength(MAPS.china.cities.length);
    expect(china.first).toBe(0);
    expect(withMap('china', () => plan.CITY_INDEX)).toBe(china.idx);
    expect(plan.N_ROUTES).toBe(MAPS[DEFAULT_MAP_ID].routes.length);
    expect(plan.CITY_INDEX).not.toBe(china.idx);
  });

  it('plans paths on the active map', () => {
    for (const id of ['usa', 'china', 'europe'] as const) {
      withMap(id, () => {
        const t = MAPS[id].tickets[0];
        const view = { claims: {}, players: { '0': { hand: undefined } } } as unknown as GState;
        const g = plan.costGraph(view, '0', { hand: null });
        const p = plan.shortestPath(g, t.a, t.b);
        expect(p).not.toBeNull();
        for (const r of p!.routes) expect(MAPS[id].routes.some((x) => x.id === r)).toBe(true);
      });
    }
  });
});

const api = (n: number, seed = 'ed') => {
  const rng = seededRandom(seed);
  return {
    ctx: { numPlayers: n },
    random: {
      Shuffle: <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
      Die: (k: number) => 1 + Math.floor(rng() * k),
    },
  } as never;
};

describe('GState.mapId', () => {
  it('setup with setupData { map: china } deals China tickets and records the map', () => {
    const G = BobolandGame.setup!(api(3), { map: 'china' }) as GState;
    expect(G.mapId).toBe('china');
    const ids = new Set(MAPS.china.tickets.map((t) => t.id));
    for (const p of Object.values(G.players)) for (const t of p.pending) expect(ids.has(t)).toBe(true);
    expect(G.ticketDeck.every((t) => ids.has(t))).toBe(true);
    expect(mapMod.MAP_ID).toBe(DEFAULT_MAP_ID);
  });

  it('setup without setupData uses the default map', () => {
    const G = BobolandGame.setup!(api(2)) as GState;
    expect(G.mapId).toBe(DEFAULT_MAP_ID);
  });

  it('validateSetupData accepts known maps and rejects others', () => {
    const v = BobolandGame.validateSetupData!;
    expect(v(undefined, 2)).toBeUndefined();
    expect(v({}, 2)).toBeUndefined();
    expect(v({ map: 'china' }, 2)).toBeUndefined();
    expect(v({ map: 'usa' }, 2)).toBeUndefined();
    expect(v({ map: 'west' }, 2)).toEqual(expect.any(String));
    expect(v({ map: 'sf' }, 2)).toEqual(expect.any(String));
    expect(v({ map: 'mars' }, 2)).toEqual(expect.any(String));
    expect(v('china' as never, 2)).toEqual(expect.any(String));
  });

  it('playerView keeps mapId; legalActions and withGameMap use the game map', () => {
    const G = BobolandGame.setup!(api(2, 'x'), { map: 'europe' }) as GState;
    const view = BobolandGame.playerView!({ G, ctx: {} as never, playerID: '0' } as never) as GState;
    expect(view.mapId).toBe('europe');
    const europeRoutes = new Set(MAPS.europe.routes.map((r) => r.id));
    const la = legalActions(view, '0');
    for (const r of la.claim) expect(europeRoutes.has(r)).toBe(true);
    expect(withGameMap(view, () => mapMod.MAP_ID)).toBe('europe');
    expect(mapMod.MAP_ID).toBe(DEFAULT_MAP_ID);
  });

  it('legalActions, chooseBotMove and mapOfGame all fall back to the default map for a G without mapId', () => {
    const G = BobolandGame.setup!(api(2, 'x'), undefined) as GState;
    const bare = { ...G } as GState;
    delete (bare as { mapId?: unknown }).mapId;
    const other = DEFAULT_MAP_ID === 'china' ? 'europe' : 'china';
    const seen: string[] = [];
    const off = onMapChange(() => seen.push(mapMod.MAP_ID));
    try {
      withMap(other, () => {
        seen.length = 0;
        legalActions(bare, '0');
        expect(seen[0]).toBe(DEFAULT_MAP_ID);
        seen.length = 0;
        chooseBotMove(bare, { phase: 'main', currentPlayer: '0', turn: 1 } as never, '0', 'easy', () => 0.5);
        expect(seen[0]).toBe(DEFAULT_MAP_ID);
        expect(withGameMap(bare, () => mapMod.MAP_ID)).toBe(DEFAULT_MAP_ID);
        expect(mapOfGame(bare)).toBe(DEFAULT_MAP_ID);
      });
    } finally { off(); }
  });
});

describe('activeMapId in the browser', () => {
  it('follows the edition the client page chose (globalThis.__TTB_EDITION__) before VITE_MAP / TTB_MAP', () => {
    const g = globalThis as { __TTB_EDITION__?: string };
    try {
      g.__TTB_EDITION__ = 'china';
      expect(activeMapId()).toBe('china');
      g.__TTB_EDITION__ = 'europe';
      expect(activeMapId()).toBe('europe');
      g.__TTB_EDITION__ = 'mars';
      expect(activeMapId()).toBe(DEFAULT_MAP_ID);
    } finally {
      delete g.__TTB_EDITION__;
    }
    expect(activeMapId()).toBe(DEFAULT_MAP_ID);
  });
});
