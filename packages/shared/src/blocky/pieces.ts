/** The 21 free polyominoes of size 1-5 (89 squares) and their 91 fixed orientations. Cells are [row, col]. */
export type PieceId = 'I1' | 'I2' | 'I3' | 'V3' | 'I4' | 'L4' | 'T4' | 'S4' | 'O4' | 'F' | 'I5' | 'L5' | 'N' | 'P' | 'T5' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
/** A shape normalised so its bounding box starts at (0,0). */
export interface Shape { cells: [number, number][]; w: number; h: number }
/** `orient` indexes `orientations(piece)`; `at` = r*size+c of the shape's (0,0) (its bounding-box corner). */
export interface Place { piece: PieceId; orient: number; at: number }

export const PIECE_IDS: PieceId[] = ['I1', 'I2', 'I3', 'V3', 'I4', 'L4', 'T4', 'S4', 'O4', 'F', 'I5', 'L5', 'N', 'P', 'T5', 'U', 'V', 'W', 'X', 'Y', 'Z'];

/** The same name in every guild: a builder's vocabulary. */
export const PIECE_NAME: Record<PieceId, string> = {
  I1: 'Keystone', I2: 'Lintel', I3: 'Beam', V3: 'Corbel', I4: 'Girder', L4: 'Buttress', T4: 'Gatehouse', S4: 'Staircase', O4: 'Plaza',
  F: 'Windmill', I5: 'Causeway', L5: 'Jetty', N: 'Footbridge', P: 'Courtyard', T5: 'Watchtower', U: 'Harbour', V: 'Bastion',
  W: 'Terrace', X: 'Crossroads', Y: 'Lighthouse', Z: 'Switchback',
};

const BASE: Record<PieceId, [number, number][]> = {
  I1: [[0, 0]],
  I2: [[0, 0], [0, 1]],
  I3: [[0, 0], [0, 1], [0, 2]],
  V3: [[0, 0], [1, 0], [1, 1]],
  I4: [[0, 0], [0, 1], [0, 2], [0, 3]],
  L4: [[0, 0], [1, 0], [2, 0], [2, 1]],
  T4: [[0, 0], [0, 1], [0, 2], [1, 1]],
  S4: [[0, 1], [0, 2], [1, 0], [1, 1]],
  O4: [[0, 0], [0, 1], [1, 0], [1, 1]],
  F: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]],
  I5: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  L5: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  N: [[0, 1], [1, 1], [1, 0], [2, 0], [3, 0]],
  P: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]],
  T5: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]],
  U: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]],
  V: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  W: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
  X: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
  Y: [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
};

function normalise(cells: [number, number][]): Shape {
  const r0 = Math.min(...cells.map((c) => c[0])), c0 = Math.min(...cells.map((c) => c[1]));
  const out = cells.map(([r, c]) => [r - r0, c - c0] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { cells: out, h: Math.max(...out.map((c) => c[0])) + 1, w: Math.max(...out.map((c) => c[1])) + 1 };
}

/** Rotate 4 ways, then flip and rotate 4 ways; drop duplicates (first occurrence wins, so the order is fixed). */
function build(id: PieceId): Shape[] {
  const seen = new Set<string>();
  const out: Shape[] = [];
  for (const flip of [false, true]) {
    let cells = BASE[id].map(([r, c]) => [r, flip ? -c : c] as [number, number]);
    for (let k = 0; k < 4; k++) {
      const sh = normalise(cells);
      const key = sh.cells.join(';');
      if (!seen.has(key)) { seen.add(key); out.push(sh); }
      cells = cells.map(([r, c]) => [c, -r] as [number, number]);
    }
  }
  return out;
}

const ORIENTS = Object.fromEntries(PIECE_IDS.map((id) => [id, build(id)])) as Record<PieceId, Shape[]>;
export const orientations = (id: PieceId): Shape[] => ORIENTS[id];
/** The piece as drawn on the shelf (its first orientation). */
export const PIECES = Object.fromEntries(PIECE_IDS.map((id) => [id, ORIENTS[id][0]])) as Record<PieceId, Shape>;
export interface Orient { piece: PieceId; orient: number; shape: Shape; gid: number }
/** All 91 orientations, `gid` = the index in this list. */
export const ALL_ORIENTS: Orient[] = PIECE_IDS.flatMap((piece) => ORIENTS[piece].map((shape, orient) => ({ piece, orient, shape, gid: 0 }))).map((o, gid) => ({ ...o, gid }));
const FIRST_GID = Object.fromEntries(PIECE_IDS.map((id) => [id, ALL_ORIENTS.find((o) => o.piece === id)!.gid])) as Record<PieceId, number>;
/** Global orientation index of (piece, orient). */
export const orientId = (piece: PieceId, orient: number): number => FIRST_GID[piece] + orient;
export const squaresOf = (id: PieceId): number => BASE[id].length;
export const TOTAL_SQUARES = 89;
