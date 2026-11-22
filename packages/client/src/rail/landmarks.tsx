import type { ReactNode } from 'react';

/**
 * Small pen-and-ink landmark vignettes for the Europe board, in the manner of an antique map's margins.
 * Each one is drawn about 100 units tall, its base at (0, 0) and growing upwards (negative y), as plain
 * strokes in `currentColor` (the layer sets the sepia ink and the opacity). Decoration only: no text.
 */
export type LandmarkId =
  | 'eiffel' | 'bigben' | 'colosseum' | 'brandenburg' | 'sagrada' | 'windmill'
  | 'parthenon' | 'hagiasophia' | 'alps' | 'viking';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Ground line with a few tufts, shared by the buildings. */
const ground = (w: number) => <path d={`M${-w / 2},0 H${w / 2} M${-w / 2 + 6},3.5 H${-w / 2 + 16} M${w / 2 - 20},3.5 H${w / 2 - 8}`} />;

export const LANDMARK_ART: Record<LandmarkId, ReactNode> = {
  eiffel: (
    <g>
      {ground(70)}
      {/* the two curved legs, waist and spire */}
      <path d="M-26,0 C-18,-22 -9,-48 -4,-78 L-2,-96 M26,0 C18,-22 9,-48 4,-78 L2,-96 M0,-96 V-106" />
      <path d="M-14,0 C-10,-12 10,-12 14,0" />
      {/* platforms */}
      <path d="M-22,-16 H22 M-21,-19 H21 M-10,-50 H10 M-9,-53 H9 M-4,-80 H4" />
      {/* lattice */}
      {range(5).map((i) => {
        const y = -22 - i * 5.5, w = 18 - i * 2.2;
        return <path key={i} d={`M${-w},${y} L${-w + 3.4},${y - 5.5} M${w},${y} L${w - 3.4},${y - 5.5}`} />;
      })}
      {range(4).map((i) => {
        const y = -56 - i * 6, w = 8 - i * 1.4;
        return <path key={`u${i}`} d={`M${-w},${y} L${w},${y - 6} M${w},${y} L${-w},${y - 6}`} strokeWidth=".7" />;
      })}
    </g>
  ),
  bigben: (
    <g>
      {ground(60)}
      <path d="M-11,0 V-62 H11 V0" />
      <path d="M-11,-62 H11 M-13,-66 H13 V-62 M-13,-66 V-62" />
      {/* clock stage */}
      <path d="M-13,-66 V-84 H13 V-66" />
      <circle cx="0" cy="-75" r="7.4" />
      <path d="M0,-75 V-80 M0,-75 L3.5,-73" />
      {/* belfry and spire */}
      <path d="M-11,-84 L-9,-92 H9 L11,-84 M-6,-92 V-86 M0,-92 V-86 M6,-92 V-86" />
      <path d="M-9,-92 L0,-112 L9,-92 M0,-112 V-118" />
      {/* tall windows down the shaft */}
      {range(5).map((i) => <path key={i} d={`M-5,${-8 - i * 11} V${-15 - i * 11} M5,${-8 - i * 11} V${-15 - i * 11}`} />)}
      {/* a bit of the long hall beside it */}
      <path d="M11,-26 H38 V0 M16,-26 V-31 M22,-26 V-31 M28,-26 V-31 M34,-26 V-31" />
    </g>
  ),
  colosseum: (
    <g>
      {ground(100)}
      {/* outer wall, broken down on the right */}
      <path d="M-46,0 V-44 C-20,-50 10,-50 30,-46 L36,-30 L40,-20 L46,-12 V0" />
      <path d="M-46,-14 H44 M-46,-28 H38 M-46,-40 H31" />
      {/* arcades: three tiers of arches */}
      {range(9).map((i) => {
        const x = -42 + i * 9.6;
        return <path key={i} d={`M${x},-1 V-8 A3.4,3.4 0 0 1 ${x + 6.8},-8 V-1`} />;
      })}
      {range(8).map((i) => {
        const x = -42 + i * 9.6;
        return <path key={`b${i}`} d={`M${x},-15 V-21 A3.4,3.4 0 0 1 ${x + 6.8},-21 V-15`} />;
      })}
      {range(7).map((i) => {
        const x = -42 + i * 9.6;
        return <path key={`c${i}`} d={`M${x + 1.6},-30 V-35 h3.4 V-30`} />;
      })}
      {/* the inner wall seen through the break */}
      <path d="M34,-34 C38,-36 42,-30 44,-22" strokeWidth=".8" />
    </g>
  ),
  brandenburg: (
    <g>
      {ground(100)}
      {/* steps, six columns, entablature and attic */}
      <path d="M-44,0 V-4 H44 V0" />
      {[-40, -26, -12, 12, 26, 40].map((x) => <path key={x} d={`M${x - 2.6},-4 V-46 M${x + 2.6},-4 V-46`} />)}
      <path d="M-46,-46 H46 V-54 H-46 Z M-46,-50 H46" />
      <path d="M-36,-54 V-62 H36 V-54" />
      <path d="M-14,-62 L-14,-66 H14 V-62" />
      {/* quadriga, much simplified: four horses' heads and the chariot's figure */}
      <path d="M-12,-66 c2,-6 6,-8 8,-6 M-4,-66 c2,-7 6,-8 8,-6 M4,-66 c2,-6 6,-8 8,-6" />
      <path d="M0,-66 V-80 M-4,-76 L0,-80 L4,-76 M0,-84 a3,3 0 1 0 0.1,0" />
    </g>
  ),
  sagrada: (
    <g>
      {ground(80)}
      {/* nave front and four tall honeycomb spires */}
      <path d="M-32,0 V-34 L-22,-46 H22 L32,-34 V0" />
      <path d="M-10,0 V-22 A10,10 0 0 1 10,-22 V0" />
      {[-24, -9, 9, 24].map((x, i) => {
        const h = i === 1 || i === 2 ? 108 : 94;
        return (
          <g key={x}>
            <path d={`M${x - 5},-34 C${x - 5},${-h + 30} ${x - 2},${-h + 8} ${x},${-h} C${x + 2},${-h + 8} ${x + 5},${-h + 30} ${x + 5},-34`} />
            {range(5).map((k) => <path key={k} d={`M${x - 3.6},${-44 - k * 10} h7.2`} strokeWidth=".7" />)}
            <circle cx={x} cy={-h - 3} r="2" />
          </g>
        );
      })}
    </g>
  ),
  windmill: (
    <g>
      {ground(70)}
      {/* tapering tower, cap, gallery */}
      <path d="M-16,0 L-11,-50 H11 L16,0" />
      <path d="M-13,-50 C-12,-60 12,-60 13,-50" />
      <path d="M-20,-28 H20 M-20,-28 V-25 M20,-28 V-25" />
      <path d="M-4,0 V-10 A4,4 0 0 1 4,-10 V0 M-3,-38 h6 v5 h-6 z" />
      {/* four sails with their lattice */}
      {[35, 125, 215, 305].map((d) => (
        <g key={d} transform={`translate(0,-54) rotate(${d})`}>
          <path d="M0,0 H44 M10,-1 H44 V-8 H10 Z" />
          {range(5).map((k) => <path key={k} d={`M${16 + k * 6.5},-1 V-8`} strokeWidth=".6" />)}
        </g>
      ))}
      <circle cx="0" cy="-54" r="2.4" />
    </g>
  ),
  parthenon: (
    <g>
      {/* the rock and its stepped base */}
      <path d="M-56,6 C-40,0 40,0 56,6" />
      <path d="M-48,0 H48 M-46,-3 H46 M-44,-6 H44" />
      {range(8).map((i) => {
        const x = -38 + i * 10.86;
        return <path key={i} d={`M${x - 2.2},-6 V-36 M${x + 2.2},-6 V-36`} />;
      })}
      {/* entablature, a broken pediment */}
      <path d="M-44,-36 H44 V-42 H-44 Z" />
      <path d="M-44,-42 L-14,-54 M14,-54 L22,-51 M30,-48 L44,-42" />
      <path d="M-30,-42 L-26,-46 L-20,-44" strokeWidth=".7" />
    </g>
  ),
  hagiasophia: (
    <g>
      {ground(110)}
      {/* body, the great dome on its drum, two half domes */}
      <path d="M-34,0 V-30 H34 V0" />
      <path d="M-20,-30 A20,14 0 0 1 20,-30" />
      <path d="M-34,-30 A12,9 0 0 1 -18,-34 M34,-30 A12,9 0 0 0 18,-34" />
      <path d="M-14,-42 H14 M-18,-42 A18,18 0 0 1 18,-42" />
      <path d="M0,-60 V-66" />
      {range(7).map((i) => <path key={i} d={`M${-12 + i * 4},-42 v-3`} strokeWidth=".7" />)}
      {/* four minarets with pencil tops */}
      {[-50, -40, 40, 50].map((x) => (
        <g key={x}>
          <path d={`M${x - 2},0 V-58 M${x + 2},0 V-58 M${x - 2},-58 L${x},-72 L${x + 2},-58`} />
          <path d={`M${x - 3.5},-40 h7 M${x - 3},-24 h6`} />
        </g>
      ))}
      {range(5).map((i) => <path key={`w${i}`} d={`M${-24 + i * 12},-6 V-16 A2.6,2.6 0 0 1 ${-18.8 + i * 12},-16 V-6`} strokeWidth=".7" />)}
    </g>
  ),
  alps: (
    <g>
      {/* three peaks, snow lines, a few firs at their feet */}
      <path d="M-70,0 L-40,-44 L-28,-30 L-6,-70 L16,-36 L26,-48 L60,0" />
      <path d="M-40,-44 L-46,-30 M-40,-44 L-34,-34 M-6,-70 L-14,-50 L-8,-54 L-4,-46 L2,-56 M-6,-70 L6,-52 M26,-48 L22,-38 M26,-48 L32,-40" />
      {range(9).map((i) => <path key={i} d={`M${-20 + i * 4},${-30 + (i % 3) * 3} l-6,10`} strokeWidth=".55" />)}
      {[-58, -50, 38, 46, 52].map((x) => <path key={x} d={`M${x},0 V-3 M${x - 4},-3 L${x},-13 L${x + 4},-3 Z`} />)}
      <path d="M-70,0 H64" />
    </g>
  ),
  viking: (
    <g>
      {/* waves */}
      <path d="M-62,4 q6,-4 12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0" />
      <path d="M-50,10 q6,-4 12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0 t12,0" strokeWidth=".7" />
      {/* hull, prow and stern curling up */}
      <path d="M-46,-6 C-30,4 30,4 46,-6" />
      <path d="M-46,-6 C-52,-12 -54,-22 -48,-28 C-44,-31 -42,-26 -45,-24" />
      <path d="M46,-6 C52,-12 54,-22 48,-28 C44,-31 42,-26 45,-24" />
      <path d="M-44,-8 C-28,-2 28,-2 44,-8" />
      {/* shields along the rail */}
      {range(7).map((i) => <circle key={i} cx={-30 + i * 10} cy="-4" r="3.4" />)}
      {/* mast and square striped sail */}
      <path d="M0,-6 V-72 M-26,-64 H26" />
      <path d="M-26,-64 C-28,-44 -26,-30 -24,-24 H24 C26,-30 28,-44 26,-64" />
      {[-15, -5, 5, 15].map((x) => <path key={x} d={`M${x},-64 V-24`} strokeWidth=".7" />)}
    </g>
  ),
};
