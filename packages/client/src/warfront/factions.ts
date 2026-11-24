/** The six factions: enamel paint colours, a hatch pattern and an emblem each (colour is never the only cue). */
export interface Faction { name: string; color: string; deep: string; light: string; hatch: 'diag' | 'cross' | 'dots' | 'vert' | 'horiz' | 'grid'; emblem: string }
export const FACTIONS: Faction[] = [
  { name: 'Crimson Legion', color: '#c8323c', deep: '#7d1a22', light: '#f2a3a3', hatch: 'diag', emblem: 'M0,-7 L2,-2 L7,-2 L3,1.5 L4.5,7 L0,3.6 L-4.5,7 L-3,1.5 L-7,-2 L-2,-2Z' },
  { name: 'Cobalt Guard', color: '#2f63d6', deep: '#183a85', light: '#a9c1f5', hatch: 'cross', emblem: 'M-7,-1 L0,-7 L7,-1 L7,3 L0,-3 L-7,3Z M-7,5 L0,-1 L7,5 L7,8 L0,2 L-7,8Z' },
  { name: 'Saffron Corps', color: '#e2a01a', deep: '#8f5f00', light: '#f7dc93', hatch: 'dots', emblem: 'M0,-7 A7,7 0 1,0 0.01,-7Z M0,-3.5 A3.5,3.5 0 1,1 -0.01,-3.5Z' },
  { name: 'Emerald Brigade', color: '#1e9b5c', deep: '#0d5a33', light: '#a3e2c0', hatch: 'vert', emblem: 'M0,-7 L7,0 L0,7 L-7,0Z' },
  { name: 'Violet Division', color: '#8b4fd0', deep: '#4f2682', light: '#d4b8f3', hatch: 'horiz', emblem: 'M0,-7 L7,6 L-7,6Z' },
  { name: 'Graphite Command', color: '#4d545e', deep: '#23272d', light: '#c3c8cf', hatch: 'grid', emblem: 'M-2.5,-7 H2.5 V-2.5 H7 V2.5 H2.5 V7 H-2.5 V2.5 H-7 V-2.5 H-2.5Z' },
];
export const NEUTRAL_FACTION: Faction = { name: 'Neutral', color: '#9b9484', deep: '#5d584d', light: '#e2ddd0', hatch: 'dots', emblem: 'M-6,-6 L6,6 M6,-6 L-6,6' };
export const factionOf = (factions: number[], owner: string | null | undefined): Faction =>
  owner === 'N' || owner == null ? NEUTRAL_FACTION : FACTIONS[factions[Number(owner)] ?? Number(owner)] ?? NEUTRAL_FACTION;
