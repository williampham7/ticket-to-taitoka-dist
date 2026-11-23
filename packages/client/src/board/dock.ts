import type { MapId } from '@boboland/shared';

/** The docked ticket chooser: its width, the tallest it gets (3-4 tickets with long, wrapped names; checked in e2e), and its gap from the map edges, in CSS px. */
export const DOCK_PANEL = { w: 260, h: 300, margin: 12 };

/** Maps fitted to their pieces (Singapore) deal 4 starting tickets, so their chooser is taller (about 322 px with two-line names). */
export const dockPanel = (id: MapId) => (id === 'sg' ? { ...DOCK_PANEL, h: 330 } : DOCK_PANEL);

export interface DockZone { x0: number; y0: number }

/**
 * Maps fitted to their drawn pieces instead of MAP_BOUNDS: the board zooms in until the cars, places and labels
 * fill it, cropping water and land, and keeps them clear of the docked panel and MAP_BUTTONS (fit.ts fitPiecesWithDock).
 */
export const FIT_PIECES: ReadonlySet<MapId> = new Set<MapId>(['sg']);

/** The map's floating top-left button ("Highlight my routes"), with room for its longer pressed label, in CSS px from the map's corner. */
export const MAP_BUTTONS = { x0: 0, y0: 0, x1: 215, y1: 58 };

/** Per map: the bottom-right area free of gameplay (map units), running from (x0, y0) to the right and bottom edges. */
export const DOCK_ZONE: Record<MapId, DockZone> = {
  usa: { x0: 1490, y0: 640 }, // east of Miami, Jacksonville and Charlotte (labels included); covers the compass
  china: { x0: 1505, y0: 700 }, // East China Sea: east of Fuzhou and Xiamen, south of Shanghai (labels included)
  europe: { x0: 1700, y0: 560 }, // Black Sea: east of the Istanbul and Bucharest labels
  sg: { x0: 1500, y0: 800 }, // South China Sea: east of the Gardens by the Bay label, south of East Coast Park
};
