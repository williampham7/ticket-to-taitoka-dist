/**
 * The 12 court cards (SPEC §7): King = pharaoh, Queen = queen, Jack = guardian or scribe, one design per house,
 * double-ended. Each spec below is one card's crown, regalia and held object.
 */
import type { Suit } from '@boboland/shared/src/egyptian';
import { HalfFigure, type FigureSpec } from './figure';
import { HOUSES, INK } from './palette';
import { Indices } from './frame';
import { Pip } from './suits';
import { suitInk } from './palette';

const S = HOUSES.S, H = HOUSES.H, D = HOUSES.D, C = HOUSES.C;
const RED_CROWN = '#b8281f';
const WHITE_CROWN = '#f4efe0';
const line = { stroke: INK.line, strokeWidth: 0.7 } as const;

const Uraeus = ({ x = 129, y = 77 }: { x?: number; y?: number }) => (
  <path d={`M${x - 1} ${y} C${x + 4} ${y - 4} ${x + 5} ${y - 10} ${x + 2} ${y - 13} C${x + 5} ${y - 15} ${x + 8} ${y - 11} ${x + 6} ${y - 6} L${x + 2} ${y + 1} Z`} fill="url(#egw-gold)" {...line} />
);
const Stars = ({ at, size = 6, fill = 'url(#egw-gold)' }: { at: [number, number][]; size?: number; fill?: string }) => (
  <g>{at.map(([x, y], i) => <use key={i} href="#egw-star" x={x - size / 2} y={y - size / 2} width={size} height={size} fill={fill} />)}</g>
);
const Staff = ({ y0, color = 'url(#egw-gold)', w = 4 }: { y0: number; color?: string; w?: number }) => (
  <rect x={150 - w / 2} y={y0} width={w} height={176 - y0} fill={color} {...line} />
);
const Striped = ({ d, a, b, w = 6 }: { d: string; a: string; b: string; w?: number }) => (
  <g fill="none" strokeLinecap="round"><path d={d} stroke={INK.line} strokeWidth={w + 1.4} /><path d={d} stroke={a} strokeWidth={w} /><path d={d} stroke={b} strokeWidth={w} strokeDasharray="3.5 3.5" /></g>
);
const Lotus = ({ x, y, w, fill = H.accent }: { x: number; y: number; w: number; fill?: string }) => (
  <use href="#egw-lotus" x={x - w / 2} y={y - w * 0.4} width={w} height={w * 0.8} fill={fill} stroke={INK.line} strokeWidth="2" />
);
const Umbel = ({ x, y, w, fill = C.main }: { x: number; y: number; w: number; fill?: string }) => (
  <g>
    <path d={`M${x} ${y} L${x - w / 2} ${y - w * 0.8} Q${x} ${y - w * 1.05} ${x + w / 2} ${y - w * 0.8} Z`} fill={fill} {...line} />
    {[-0.3, -0.1, 0.1, 0.3].map((k) => <path key={k} d={`M${x} ${y} L${x + k * w} ${y - w * 0.88}`} stroke={INK.gold} strokeWidth="0.7" />)}
  </g>
);
const Scarab = ({ x, y, k = 1, fill = '#1f5f86' }: { x: number; y: number; k?: number; fill?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}>
    <path d="M-7 -2 L-12 -6 M-7 3 L-13 4 M-6 7 L-10 12 M7 -2 L12 -6 M7 3 L13 4 M6 7 L10 12" stroke={INK.line} strokeWidth="1.4" />
    <ellipse cx="0" cy="3" rx="7.5" ry="9" fill={fill} stroke="url(#egw-gold)" strokeWidth="1.2" />
    <path d="M0 -5 V12" stroke="url(#egw-gold)" strokeWidth="0.9" />
    <path d="M-5 -6 A5 4.4 0 0 1 5 -6 Z" fill={fill} stroke="url(#egw-gold)" strokeWidth="1" />
  </g>
);
const Scroll = ({ x, y, color = INK.papyrus, tie = H.main }: { x: number; y: number; color?: string; tie?: string }) => (
  <g transform={`rotate(-24 ${x} ${y})`}>
    <rect x={x - 17} y={y - 6} width="34" height="12" rx="6" fill={color} {...line} />
    <ellipse cx={x + 17} cy={y} rx="3" ry="6" fill="#d9c595" {...line} />
    <rect x={x - 3} y={y - 6.5} width="5" height="13" fill={tie} />
  </g>
);
const Wing = ({ side, y = 152, color }: { side: 1 | -1; y?: number; color: string }) => (
  <path d={`M${116 + side * 5} ${y - 2} C${116 + side * 18} ${y - 10} ${116 + side * 26} ${y - 8} ${116 + side * 32} ${y - 4} C${116 + side * 26} ${y + 2} ${116 + side * 16} ${y + 4} ${116 + side * 5} ${y + 3} Z`} fill={color} stroke={INK.gold} strokeWidth="1" />
);

/* ---------- House of Night ---------- */

const K_S: FigureSpec = {
  skin: INK.skinMan, wig: 'none', beard: true, collar: [INK.gold, S.main, INK.gold, S.deep], garment: 'bare',
  crown: (
    <g>
      <path d="M96 98 C89 74 92 50 108 42 C120 36 134 42 136 54 C138 64 134 72 129 76 L128 80 C118 76 107 79 101 92 Z" fill={S.main} {...line} />
      <Stars at={[[105, 57], [117, 48], [127, 58], [108, 72], [119, 64], [99, 84]]} size={6.5} />
      <path d="M101 90 C108 80 119 77 129 79" stroke="url(#egw-gold)" strokeWidth="3.4" fill="none" />
      <Uraeus />
    </g>
  ),
  held: (
    <g>
      <Staff y0={62} />
      <path d="M149 64 L148 55 L159 46 L167 47 L164 52 L156 55 L153 64 Z" fill="url(#egw-gold)" {...line} />
      <path d="M155 50 L157 41 L159 48 Z" fill="url(#egw-gold)" {...line} />
    </g>
  ),
};

const Q_S: FigureSpec = {
  skin: INK.skinWoman, wig: 'long', wigStripe: INK.gold, collar: [INK.gold, S.main, S.accent, S.deep], garment: 'dress',
  garmentColor: S.deep, garmentTrim: INK.gold,
  crown: (
    <g>
      <path d="M106 64 L103 27 C105 22 111 22 112 27 L114 64 Z" fill={S.light} {...line} />
      <path d="M115 64 L115 29 C117 24 123 24 124 29 L121 64 Z" fill={S.light} {...line} />
      {[34, 42, 50, 58].map((y) => <path key={y} d={`M103.6 ${y} L113.4 ${y} M115 ${y} L123 ${y}`} stroke={S.main} strokeWidth="2.6" />)}
      <path d="M95 71 C106 64 120 63 129 70" stroke="url(#egw-gold)" strokeWidth="4.2" fill="none" />
      <Stars at={[[101, 68], [110, 65.4], [119, 65.4], [127, 69]]} size={5} fill={S.main} />
    </g>
  ),
  pectoral: <Stars at={[[86, 165], [100, 168], [132, 168], [146, 165], [116, 170]]} size={5} />,
  held: (
    <g>
      <rect x="148" y="104" width="4" height="72" fill="url(#egw-gold)" {...line} />
      <path d="M141 106 C137 82 143 62 150 58 C157 62 163 82 159 106 Z" fill="none" stroke={INK.line} strokeWidth="4.6" />
      <path d="M141 106 C137 82 143 62 150 58 C157 62 163 82 159 106 Z" fill="none" stroke="url(#egw-gold)" strokeWidth="3.2" />
      {[76, 87, 98].map((y) => <g key={y}><path d={`M140 ${y} L160 ${y}`} stroke={INK.line} strokeWidth="1.2" /><circle cx="146" cy={y} r="1.8" fill="url(#egw-gold)" /><circle cx="154" cy={y} r="1.8" fill="url(#egw-gold)" /></g>)}
      <circle cx="150" cy="111" r="5" fill={S.main} stroke="url(#egw-gold)" strokeWidth="1.4" />
    </g>
  ),
};

const J_S: FigureSpec = {
  skin: INK.skinMan, wig: 'none', collar: [INK.gold, S.main, INK.gold, S.deep], garment: 'cuirass', garmentColor: '#7b4f2c', garmentTrim: INK.gold,
  mask: (
    <g>
      <path d="M96 76 L113 72 L115 142 L98 144 C92 120 92 96 96 76 Z" fill={S.main} {...line} />
      {[84, 94, 104, 114, 124, 134].map((y) => <path key={y} d={`M97 ${y} L114 ${y}`} stroke="url(#egw-gold)" strokeWidth="2" />)}
      <path d="M100 118 L98 86 C98 76 102 68 108 64 L106 36 L116 58 L121 40 L124 62 C131 66 138 74 148 84 L152 90 C152 94 148 96 142 95 L126 96 C122 102 122 110 124 118 Z" fill="#15120f" stroke="url(#egw-gold)" strokeWidth="1" />
      <path d="M108.5 60 L107.5 44 L113.5 57 Z M118.5 58 L121 45 L122.5 60 Z" fill="url(#egw-gold)" opacity="0.85" />
      <path d="M118 76 C121 72.5 127 72.5 130 76 C127 79 121 79 118 76 Z" fill="url(#egw-gold)" />
      <circle cx="125" cy="76" r="1.6" fill="#15120f" />
      <path d="M130 76 L137 75" stroke="url(#egw-gold)" strokeWidth="1.2" />
      <path d="M126 92 L144 92" stroke="url(#egw-gold)" strokeWidth="0.9" />
      <circle cx="151" cy="89.5" r="1.8" fill="url(#egw-gold)" />
    </g>
  ),
  pectoral: <Stars at={[[96, 168], [116, 170], [136, 168]]} size={6} />,
  held: (
    <g>
      <rect x="147" y="132" width="6" height="34" fill="#5b3a1e" {...line} />
      <path d="M147 136 L147 104 C147 82 160 64 179 68 C168 72 159 84 156 104 L153 136 Z" fill="#cfd4dc" {...line} />
      <path d="M150 104 C150 86 160 72 174 69" stroke="url(#egw-gold)" strokeWidth="1.2" fill="none" />
    </g>
  ),
  leftHand: true,
  offhand: (
    <g>
      <ellipse cx="84" cy="146" rx="19" ry="25" fill={S.main} stroke="url(#egw-gold)" strokeWidth="3" />
      <Stars at={[[84, 135], [76, 148], [92, 148], [84, 160]]} size={8} />
    </g>
  ),
};

/* ---------- House of the Nile ---------- */

const K_H: FigureSpec = {
  skin: INK.skinMan, wig: 'short', beard: true, collar: [INK.gold, H.main, H.accent, H.main], garment: 'bare', leftHand: true,
  crown: (
    <g>
      <path d="M98 82 C95 66 99 48 107 36 C110 30 117 29 119 35 C123 48 130 64 129 80 C118 76 107 78 98 82 Z" fill={WHITE_CROWN} {...line} />
      <circle cx="113" cy="32" r="4.8" fill={WHITE_CROWN} {...line} />
      <path d="M104 74 C108 58 110 46 113 38" stroke="#d8d0bb" strokeWidth="2" fill="none" />
      <path d="M98 82 C108 77 119 76 129 80" stroke={H.main} strokeWidth="3.6" fill="none" />
      <Uraeus x={128} y={78} />
    </g>
  ),
  held: (
    <g>
      <Striped d="M100 168 L85 96 C80 78 96 72 99 86" a={INK.gold} b={H.main} />
      <Striped d="M147 168 L161 102" a={INK.gold} b={H.main} w={5} />
      {[[176, 112], [179, 104], [173, 120]].map(([x, y], i) => (
        <g key={i}>
          <path d={`M161 102 L${x} ${y}`} stroke={INK.line} strokeWidth="1" />
          {[0.3, 0.55, 0.8, 1].map((t) => <circle key={t} cx={161 + (x - 161) * t} cy={102 + (y - 102) * t} r="2.3" fill={t === 1 ? H.accent : 'url(#egw-gold)'} {...line} />)}
        </g>
      ))}
    </g>
  ),
};

const Q_H: FigureSpec = {
  skin: INK.skinWoman, wig: 'long', wigStripe: H.main, collar: [INK.gold, H.main, H.accent, INK.gold], garment: 'dress',
  garmentColor: H.light, garmentTrim: H.main,
  crown: (
    <g>
      {[[104, 50], [115, 44], [126, 50]].map(([x, y], i) => <g key={i}><path d={`M${x} ${y + 6} L${x + (115 - x) * 0.3} 68`} stroke="#3c7a3a" strokeWidth="2" /><Lotus x={x} y={y} w={15} /></g>)}
      <path d="M95 71 C106 64 120 63 129 70" stroke={H.main} strokeWidth="4.4" fill="none" />
      <path d="M95 71 C106 64 120 63 129 70" stroke="url(#egw-gold)" strokeWidth="1.2" fill="none" />
    </g>
  ),
  pectoral: <g>{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${84 + i * 12} 168 q3 -3 6 0 t6 0`} stroke={H.main} strokeWidth="1.4" fill="none" />)}</g>,
  held: (
    <g>
      <path d="M150 152 C152 122 158 92 154 66" stroke="#3c7a3a" strokeWidth="3.4" fill="none" />
      <Lotus x={154} y={56} w={30} />
      <path d="M154 66 C150 58 146 52 146 46" stroke={H.main} strokeWidth="1.2" fill="none" />
    </g>
  ),
};

const J_H: FigureSpec = {
  skin: INK.skinMan, wig: 'short', collar: [INK.gold, H.main, INK.gold, H.accent], garment: 'kilt', garmentColor: '#f3ecda', leftHand: true,
  back: (
    <g>
      <path d="M100 70 C90 52 94 32 106 22 C102 38 104 54 110 68 Z" fill="#f6f2e6" {...line} />
      <path d="M106 22 C103 28 102 32 102 38" stroke="#15120f" strokeWidth="3" fill="none" />
      <path d="M95 74 C84 60 84 42 92 32 C92 46 96 60 103 72 Z" fill="#ece6d4" {...line} />
    </g>
  ),
  crown: <path d="M96 76 C106 69 119 67 128 72" stroke={H.main} strokeWidth="4" fill="none" />,
  pectoral: (
    <g>
      <path d="M112 128 L121 148" stroke={INK.line} strokeWidth="1" />
      <g transform="rotate(-12 124 160)"><rect x="119" y="148" width="10" height="24" rx="1.5" fill="#efe6cf" {...line} /><circle cx="124" cy="153" r="2" fill={INK.red} /><circle cx="124" cy="159" r="2" fill={INK.black} /></g>
    </g>
  ),
  held: (
    <g>
      <path d="M150 150 L167 92" stroke="#7a5a2e" strokeWidth="3" strokeLinecap="round" />
      <path d="M167 92 L169 86" stroke={INK.black} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  offhand: <Scroll x={92} y={140} />,
};

/* ---------- House of the Sun ---------- */

const K_D: FigureSpec = {
  skin: INK.skinMan, wig: 'short', beard: true, collar: [INK.gold, D.main, INK.gold, '#1d8a8a'], garment: 'bare', leftHand: true,
  crown: (
    <g>
      <path d="M96 86 L96 40 L106 40 L106 60 C114 58 124 60 131 64 L130 82 C120 77 107 79 96 86 Z" fill={RED_CROWN} {...line} />
      <path d="M108 61 C106 48 110 36 116 29 C120 34 124 46 125 63 C119 60 113 60 108 61 Z" fill={WHITE_CROWN} {...line} />
      <circle cx="116.5" cy="29" r="3.8" fill={WHITE_CROWN} {...line} />
      <path d="M127 63 C131 50 143 46 145 54 C146 60 139 60 139 56" stroke="url(#egw-gold)" strokeWidth="2" fill="none" />
      <path d="M97 84 C108 78 119 77 130 81" stroke="url(#egw-gold)" strokeWidth="2.6" fill="none" />
      <Uraeus x={128} y={79} />
    </g>
  ),
  pectoral: <g><Wing side={-1} color={D.main} /><Wing side={1} color={D.main} /><circle cx="116" cy="151" r="5.5" fill={RED_CROWN} stroke="url(#egw-gold)" strokeWidth="1.4" /></g>,
  held: (
    <g>
      <Staff y0={70} />
      <circle cx="150" cy="58" r="12.5" fill={RED_CROWN} stroke="url(#egw-gold)" strokeWidth="2.4" />
      <circle cx="146" cy="54" r="3.5" fill="#e6563a" />
      <use href="#egw-ankh" x="85" y="98" width="24" height="50" fill="url(#egw-gold)" stroke={INK.line} strokeWidth="1.2" />
    </g>
  ),
};

const Q_D: FigureSpec = {
  skin: INK.skinWoman, wig: 'long', collar: [INK.gold, D.main, '#1d8a8a', INK.gold], garment: 'dress', garmentColor: '#f7f2e4', garmentTrim: D.main,
  back: (
    <g>
      <path d="M106 54 C92 44 94 24 106 20" stroke="#2b2118" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <path d="M124 54 C138 44 136 24 124 20" stroke="#2b2118" strokeWidth="3.4" fill="none" strokeLinecap="round" />
      <circle cx="115" cy="36" r="12.5" fill={RED_CROWN} stroke="url(#egw-gold)" strokeWidth="2" />
    </g>
  ),
  crown: (
    <g>
      <path d="M95 74 C104 63 120 61 129 70 L113 78 C109 92 110 112 116 146 L99 148 C92 122 90 96 95 74 Z" fill={D.accent} {...line} />
      {[84, 96, 108, 120, 132].map((y) => <path key={y} d={`M${97 + (y - 84) * 0.02} ${y} q4 4 8 0 q4 -4 7 0`} stroke={D.main} strokeWidth="1.5" fill="none" />)}
      <path d="M127 70 C131 66 133 62 131 58 L128 64 Z" fill={D.accent} {...line} />
      <rect x="103" y="52" width="24" height="10" fill={D.main} stroke="url(#egw-gold)" strokeWidth="1.4" />
    </g>
  ),
  pectoral: <g><path d="M104 132 C102 150 104 160 108 166" stroke={D.main} strokeWidth="2" strokeDasharray="2 2" fill="none" /><circle cx="108" cy="170" r="4.5" fill="url(#egw-gold)" {...line} /></g>,
  held: <use href="#egw-ankh" x="139" y="96" width="23" height="52" fill="url(#egw-gold)" stroke={INK.line} strokeWidth="1.2" />,
};

const J_D: FigureSpec = {
  skin: INK.skinMan, wig: 'none', collar: [INK.gold, D.main, INK.gold, '#1d8a8a'], garment: 'scale', garmentColor: '#b5651d', garmentTrim: INK.goldHi,
  mask: (
    <g>
      <path d="M96 78 L113 74 L115 142 L98 144 C92 120 92 98 96 78 Z" fill={D.main} {...line} />
      {[86, 96, 106, 116, 126, 136].map((y) => <path key={y} d={`M97 ${y} L114 ${y}`} stroke="url(#egw-gold)" strokeWidth="2" />)}
      <path d="M98 116 L96 82 C96 64 108 54 122 55 C134 56 142 64 145 72 C147 78 146 85 140 86 C141 81 139 78 136 80 L131 92 C127 100 125 108 127 116 Z" fill="#41507a" stroke={INK.line} strokeWidth="0.9" />
      {[0, 1, 2].map((r) => <path key={r} d={`M${100 + r * 3} ${70 + r * 12} q5 -4 10 0 q5 -4 10 0`} stroke="url(#egw-gold)" strokeWidth="1" fill="none" />)}
      <path d="M114 70 C120 64 131 64 137 70 L131 90 C125 94 118 92 114 86 Z" fill="#efe2c4" {...line} />
      <circle cx="125" cy="74" r="4.8" fill="#f0c33c" stroke="#15120f" strokeWidth="1" />
      <circle cx="125.6" cy="74" r="2.3" fill="#15120f" />
      <path d="M122 79 C121 86 118 92 113 97" stroke="#15120f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M136 69 C144 69 149 76 146 85 C144 82 141 80 137 80 Z" fill="#d9a62f" stroke="#15120f" strokeWidth="0.8" />
    </g>
  ),
  held: (
    <g>
      <Staff y0={54} color="#7a5230" w={3.4} />
      <path d="M150 30 L156.5 54 L143.5 54 Z" fill="#cfd4dc" {...line} />
      <path d="M152 58 L178 65 L152 73 Z" fill={D.main} {...line} />
      <circle cx="161" cy="65.5" r="3.2" fill="url(#egw-gold)" />
    </g>
  ),
  leftHand: true,
  offhand: (
    <g>
      <circle cx="84" cy="148" r="23" fill={D.accent} stroke={D.deep} strokeWidth="2.4" />
      {Array.from({ length: 12 }, (_, i) => { const a = (i * 30 * Math.PI) / 180; return <path key={i} d={`M${84 + 12 * Math.cos(a)} ${148 + 12 * Math.sin(a)} L${84 + 19 * Math.cos(a)} ${148 + 19 * Math.sin(a)}`} stroke={D.deep} strokeWidth="1.6" />; })}
      <circle cx="84" cy="148" r="9" fill={RED_CROWN} stroke="url(#egw-gold)" strokeWidth="1.6" />
    </g>
  ),
};

/* ---------- House of the Delta ---------- */

const K_C: FigureSpec = {
  skin: INK.skinMan, wig: 'short', beard: true, collar: [INK.gold, C.main, C.accent, C.main], garment: 'bare',
  crown: (
    <g>
      <path d="M96 88 L96 34 L106 34 L106 58 C116 57 125 59 131 63 L130 82 C120 77 107 79 96 88 Z" fill={RED_CROWN} {...line} />
      <path d="M100 40 L100 80" stroke="#8e1d16" strokeWidth="1.4" />
      <path d="M124 60 C128 46 142 42 144 50 C145 57 137 57 137 53" stroke="url(#egw-gold)" strokeWidth="2.2" fill="none" />
      <path d="M97 86 C108 79 119 77 130 81" stroke="url(#egw-gold)" strokeWidth="2.6" fill="none" />
      <Uraeus x={128} y={79} />
    </g>
  ),
  pectoral: <g><Wing side={-1} color={C.main} y={153} /><Wing side={1} color={C.main} y={153} /><Scarab x={116} y={151} k={0.9} /></g>,
  held: (
    <g>
      <Staff y0={74} color={C.main} />
      {[90, 110, 130].map((y) => <rect key={y} x="147.5" y={y} width="5" height="3" fill="url(#egw-gold)" />)}
      <Umbel x={150} y={76} w={24} />
      <Scarab x={150} y={50} k={1.15} />
    </g>
  ),
};

const Q_C: FigureSpec = {
  skin: INK.skinWoman, wig: 'long', wigStripe: C.main, collar: [INK.gold, C.main, INK.gold, C.accent], garment: 'dress', garmentColor: C.light, garmentTrim: C.main,
  crown: (
    <g>
      {[105, 115, 125].map((x, i) => <g key={x}><path d={`M${x} 54 L${x} ${i === 1 ? 36 : 40}`} stroke={C.main} strokeWidth="2" /><Umbel x={x} y={i === 1 ? 37 : 41} w={14} /></g>)}
      <rect x="102" y="53" width="26" height="11" fill={C.main} stroke="url(#egw-gold)" strokeWidth="1.4" />
      <path d="M104 58.5 h22" stroke="url(#egw-gold)" strokeWidth="1.2" strokeDasharray="2 2" />
    </g>
  ),
  held: (
    <g>
      <path d="M150 152 C148 120 152 92 150 74" stroke={C.main} strokeWidth="3.6" fill="none" />
      <Umbel x={150} y={76} w={28} />
    </g>
  ),
};

const J_C: FigureSpec = {
  skin: INK.skinMan, wig: 'none', collar: [INK.gold, C.main, INK.gold, C.accent], garment: 'kilt', garmentColor: '#f3ecda', leftHand: true,
  crown: (
    <g>
      <path d="M95 110 C92 92 92 74 104 64 C114 58 126 60 129 70 L128 75 L112 77 C108 87 108 99 110 106 C104 113 99 114 95 110 Z" fill={C.light} {...line} />
      {['M98 106 C96 92 97 78 106 68', 'M103 102 C101 90 102 78 110 70', 'M108 98 C106 88 107 80 115 72'].map((d) => <path key={d} d={d} stroke={C.main} strokeWidth="2.2" fill="none" />)}
      <path d="M104 66 C114 60 125 62 129 71" stroke={C.main} strokeWidth="4" fill="none" />
      <path d="M95 106 C88 110 86 118 90 126 L97 120 Z" fill={C.light} {...line} />
    </g>
  ),
  pectoral: <g><path d="M104 130 C110 142 122 142 128 130" stroke={INK.line} strokeWidth="1" fill="none" /><Scarab x={116} y={146} k={0.8} fill="#1f5f86" /></g>,
  held: (
    <g>
      <path d="M150 150 L163 92" stroke="#7a5a2e" strokeWidth="3" strokeLinecap="round" />
      <path d="M163 92 L165 84" stroke={C.main} strokeWidth="3.4" strokeLinecap="round" />
    </g>
  ),
  offhand: <Scroll x={92} y={140} tie={C.main} />,
};

export const COURT_SPECS: Record<Suit, Record<11 | 12 | 13, FigureSpec>> = {
  S: { 11: J_S, 12: Q_S, 13: K_S },
  H: { 11: J_H, 12: Q_H, 13: K_H },
  D: { 11: J_D, 12: Q_D, 13: K_D },
  C: { 11: J_C, 12: Q_C, 13: K_C },
};

/** A court card's face: house panel, the figure twice (double-ended), the divider, shoulder pips, indices. */
export function CourtCentre({ rank, suit }: { rank: 11 | 12 | 13; suit: Suit }) {
  const h = HOUSES[suit];
  const half = (
    <g transform="translate(125 175) scale(0.92) translate(-125 -175)"><HalfFigure {...COURT_SPECS[suit][rank]} /></g>
  );
  return (
    <g data-art={`court-${rank}-${suit}`}>
      <rect x="52" y="36" width="146" height="278" rx="3" fill={`url(#egw-bg-${suit})`} />
      <g clipPath="url(#egw-panel-clip)">
        <g data-half="top">{half}</g>
        <g data-half="bottom" transform="rotate(180 125 175)">{half}</g>
      </g>
      <rect x="52" y="170.5" width="146" height="9" fill={h.main} stroke="url(#egw-gold)" strokeWidth="1.2" />
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${60 + i * 16.2} 175 l4 -3 l4 3 l-4 3 Z`} fill="url(#egw-gold)" />)}
      <rect x="52" y="36" width="146" height="278" rx="3" fill="none" stroke="url(#egw-gold)" strokeWidth="1.8" />
      <Pip suit={suit} cx={66} cy={51} size={17} fill={suitInk(suit)} inlay={false} />
      <Pip suit={suit} cx={184} cy={299} size={17} fill={suitInk(suit)} inlay={false} flip />
      <Indices rank={rank} suit={suit} />
    </g>
  );
}
