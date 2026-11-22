import { afterEach, describe, expect, it, vi } from 'vitest';
import { EDITION, EDITION_KEY, applyEdition, resolveEditionId, setEdition, urlWithoutEdition } from './edition';

describe('which edition a page opens on', () => {
  it('?edition= in the URL wins over the saved choice', () => {
    expect(resolveEditionId('?edition=china', 'europe')).toBe('china');
    expect(resolveEditionId('?seed=4&edition=europe', 'usa')).toBe('europe');
  });

  it('without a (valid) URL edition, the saved choice is used', () => {
    expect(resolveEditionId('', 'europe')).toBe('europe');
    expect(resolveEditionId('?edition=mars', 'china')).toBe('china');
    expect(resolveEditionId('?seed=1', 'china')).toBe('china');
  });

  it('with neither, it is USA', () => {
    expect(resolveEditionId('', null)).toBe('usa');
    expect(resolveEditionId('?edition=sf', 'sf')).toBe('usa');
    expect(resolveEditionId('?edition=', '')).toBe('usa');
  });

  it('outside a browser (tests, server) the module loads on USA without touching the DOM', () => {
    expect(EDITION.id).toBe('usa');
  });
});

describe('applyEdition', () => {
  it('sets the global the shared map reads, the theme attribute and the tab title', () => {
    const g: { __TTB_EDITION__?: string } = {};
    const doc = { documentElement: { dataset: {} as Record<string, string> }, title: '' };
    applyEdition('china', g, doc);
    expect(g.__TTB_EDITION__).toBe('china');
    expect(doc.documentElement.dataset.theme).toBe('hsr');
    expect(doc.title).toBe('Ticket to Beijing');
    applyEdition('europe', g, doc);
    expect(doc.documentElement.dataset.theme).toBe('rail');
    expect(doc.title).toBe('Ticket to Europa');
    applyEdition('usa', g, doc);
    expect(doc.documentElement.dataset.theme).toBe('vintage');
    expect(doc.title).toBe('Ticket to Taitoka');
  });
});

describe('urlWithoutEdition', () => {
  it('drops only the edition parameter and can change the path', () => {
    expect(urlWithoutEdition('http://h:8000/menu?edition=china&seed=3#x')).toBe('http://h:8000/menu?seed=3#x');
    expect(urlWithoutEdition('http://h:8000/?edition=china', '/menu')).toBe('http://h:8000/menu');
    expect(urlWithoutEdition('http://h:8000/local')).toBe('http://h:8000/local');
  });
});

describe('setEdition', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubBrowser(href: string) {
    const store = new Map<string, string>();
    const loc = { href, assign: vi.fn(), reload: vi.fn() };
    const replaceState = vi.fn();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    vi.stubGlobal('window', { location: loc, history: { replaceState } });
    return { store, loc, replaceState };
  }

  it('saves the choice and reloads the same page without ?edition (so the URL cannot override it)', () => {
    const { store, loc } = stubBrowser('http://h/host?edition=china');
    setEdition('europe');
    expect(store.get(EDITION_KEY)).toBe('europe');
    expect(loc.assign).toHaveBeenCalledWith('http://h/host');
  });

  it('reloads in place when the URL does not change', () => {
    const { loc } = stubBrowser('http://h/menu');
    setEdition('china');
    expect(loc.reload).toHaveBeenCalled();
    expect(loc.assign).not.toHaveBeenCalled();
  });

  it('can go to another path', () => {
    const { loc } = stubBrowser('http://h/');
    setEdition('china', { path: '/menu' });
    expect(loc.assign).toHaveBeenCalledWith('http://h/menu');
  });

  it('with reload: false only saves it and tidies the URL', () => {
    const { store, loc, replaceState } = stubBrowser('http://h/wait/abc?edition=usa');
    setEdition('china', { reload: false });
    expect(store.get(EDITION_KEY)).toBe('china');
    expect(loc.assign).not.toHaveBeenCalled();
    expect(loc.reload).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, '', 'http://h/wait/abc');
  });
});
