import type { MapId } from '@boboland/shared';

/** The docked ticket chooser: its width, the tallest it gets (3-4 tickets with long, wrapped names; checked in e2e), and its gap from the map edges, in CSS px. */
export const DOCK_PANEL = { w: 260, h: 300, margin: 12 };

export interface DockZone { x0: number; y0: number }

/** Per map: the bottom-right area free of gameplay (map units), running from (x0, y0) to the right and bottom edges. */
export const DOCK_ZONE: Record<MapId, DockZone> = {
  usa: { x0: 1490, y0: 640 }, // east of Miami, Jacksonville and Charlotte (labels included); covers the compass
  china: { x0: 1505, y0: 700 }, // East China Sea: east of Fuzhou and Xiamen, south of Shanghai (labels included)
  europe: { x0: 1700, y0: 560 }, // Black Sea: east of the Istanbul and Bucharest labels
};
