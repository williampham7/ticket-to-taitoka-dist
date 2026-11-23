// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** Loads the client modules as if the page had opened on ?edition=singapore (theme.ts reads the edition once, at load). */
async function onSingapore() {
  vi.resetModules();
  vi.stubGlobal('window', { location: { search: '?edition=singapore', href: 'http://x/?edition=singapore' }, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal('document', { documentElement: { dataset: {} }, title: '' });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  await import('../edition'); // sets the edition global before the shared map code loads
  const theme = await import('../theme');
  const shared = await import('@boboland/shared');
  const fx = await import('./ClaimCelebration');
  const cards = await import('../game/CardFace');
  const tickets = await import('../game/TicketCard');
  return { shared, theme, fx, cards, tickets };
}

afterEach(() => { vi.unstubAllGlobals(); delete (globalThis as { __TTB_EDITION__?: string }).__TTB_EDITION__; });

describe('Singapore (merlion) theme renders', () => {
  it('the page is on the Singapore map and theme', async () => {
    const { shared, theme } = await onSingapore();
    expect(theme.MERLION).toBe(true);
    expect(theme.HSR || theme.RAIL).toBe(false);
    expect(shared.MAP_ID).toBe('sg');
  });

  it('a long route gets the train, petals at both stations and a firework shell; a short one has no shell', async () => {
    const { shared, fx } = await onSingapore();
    const long = shared.ROUTES.find((r) => r.length >= 4)!, short = shared.ROUTES.find((r) => r.length <= 2)!;
    const html = (route: typeof long) => renderToStaticMarkup(createElement('svg', null, createElement(fx.ClaimCelebration, { route, fill: '#3fa9ff' })));
    const big = html(long), small = html(short);
    expect((big.match(/mrt-fx-petal/g) ?? []).length).toBe(18);
    expect((big.match(/mrt-fx-spark/g) ?? []).length).toBe(16);
    expect((small.match(/mrt-fx-petal/g) ?? []).length).toBe(18);
    expect(small).not.toContain('mrt-fx-spark');
  });

  it('Marina Bay / Sentosa routes get the Merlion jet, Changi gets its tower, HarbourFront-Sentosa a cable car', async () => {
    const { shared, fx } = await onSingapore();
    const html = (route: (typeof shared.ROUTES)[number]) => renderToStaticMarkup(createElement('svg', null, createElement(fx.ClaimCelebration, { route, fill: '#3fa9ff' })));
    const touching = (id: string) => shared.ROUTES.find((r) => r.a === id || r.b === id)!;
    expect(html(touching('BOB'))).toContain('mrt-fx-arc');
    expect(html(touching('SEN'))).toContain('mrt-fx-arc');
    expect(html(touching('CHG'))).toContain('mrt-fx-tower');
    const plain = shared.ROUTES.find((r) => !['BOB', 'SEN', 'CHG'].some((c) => r.a === c || r.b === c))!;
    expect(html(plain)).not.toMatch(/mrt-fx-arc|mrt-fx-tower/);
  });

  it('every train card colour, the locomotive, the card back and a ticket draw in the Singapore style', async () => {
    const { cards, tickets, shared } = await onSingapore();
    for (const c of ['red', 'orange', 'yellow', 'green', 'blue', 'black', 'white', 'locomotive'] as const) {
      expect(renderToStaticMarkup(createElement(cards.CardTile, { card: c, count: 2 }))).toContain(`data-mrt-card="${c}"`);
    }
    expect(renderToStaticMarkup(createElement(cards.CardBack, {}))).toContain('mrt-card-back');
    const t = shared.TICKETS[0];
    for (const compact of [false, true]) {
      const html = renderToStaticMarkup(createElement(tickets.TicketCard, { ticket: t, compact }));
      expect(html).toContain('mrt-ticket');
      expect(html).toContain(`data-ticket="${t.id}"`);
    }
  });
});
