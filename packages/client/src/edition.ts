/**
 * The edition this page plays (USA, China or Europe): it fixes the map, the skin (game name) and the theme.
 * Imported FIRST in main.tsx: it sets `globalThis.__TTB_EDITION__` before the shared map code loads, so the
 * map bindings start on this edition's map. Switching edition saves the choice and reloads the page, because
 * many modules read the theme and map once, when they load.
 *
 * Order: `?edition=` in the URL, then the saved choice (localStorage `ttb.edition`), then USA.
 * Only the shared edition/skin tables are imported here (not the shared index), so nothing map-related loads first.
 */
import { EDITIONS, isEditionId, type Edition, type EditionId } from '@boboland/shared/src/editions';
import { gameTitle, skinFor } from '@boboland/shared/src/skins';

export const EDITION_KEY = 'ttb.edition';

/** The edition named by the URL's `?edition=`, else the saved one, else USA. */
export function resolveEditionId(search: string, stored: string | null): EditionId {
  const fromUrl = new URLSearchParams(search).get('edition');
  if (isEditionId(fromUrl)) return fromUrl;
  return isEditionId(stored) ? stored : 'usa';
}

interface DocLike { documentElement: { dataset: Record<string, string | undefined> }; title: string }

/** Point the page at an edition: the global the shared map reads, the theme attribute and the tab title. */
export function applyEdition(id: EditionId, g: { __TTB_EDITION__?: string }, doc: DocLike): void {
  const ed = EDITIONS[id];
  g.__TTB_EDITION__ = id;
  doc.documentElement.dataset.theme = ed.theme;
  doc.title = gameTitle(skinFor(ed.skin));
}

/** `href` without its `edition` parameter (and on `path`, if given). */
export function urlWithoutEdition(href: string, path?: string): string {
  const url = new URL(href);
  url.searchParams.delete('edition');
  if (path !== undefined) url.pathname = path;
  return url.toString();
}

function readStored(): string | null {
  try {
    return localStorage.getItem(EDITION_KEY);
  } catch {
    return null;
  }
}

function store(id: EditionId): void {
  try {
    localStorage.setItem(EDITION_KEY, id);
  } catch {
    /* blocked storage: the choice lasts until the page reloads */
  }
}

function boot(): Edition {
  if (typeof window === 'undefined' || typeof document === 'undefined') return EDITIONS.usa;
  const id = resolveEditionId(window.location.search, readStored());
  store(id); // a link with ?edition= keeps that edition for the rest of the visit
  applyEdition(id, globalThis as { __TTB_EDITION__?: string }, document as unknown as DocLike);
  return EDITIONS[id];
}

/** The edition this page was loaded with. */
export const EDITION: Edition = boot();

/**
 * Switch to edition `id`: save it, then (by default) reload so every module starts on it.
 * The `edition` URL parameter is removed, or it would override the saved choice. `path` loads another page instead.
 * `reload: false` only saves the choice and tidies the URL (the caller reloads later).
 */
export function setEdition(id: EditionId, { reload = true, path }: { reload?: boolean; path?: string } = {}): void {
  store(id);
  const here = window.location.href;
  const next = urlWithoutEdition(here, path);
  if (!reload) {
    if (next !== here) window.history.replaceState(null, '', next);
    return;
  }
  if (next === here) window.location.reload();
  else window.location.assign(next);
}
