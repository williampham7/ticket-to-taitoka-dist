import type { ReactNode } from 'react';
import type { PlayerID, Rank } from '@boboland/shared/src/frontline';

/*
 * Unit illustrations: stencil silhouettes on a 64x64 box. Colours come from the tile (CSS variables):
 * k = ink (the silhouette), a = accent (brass / oxblood), c = cut (the tile colour, for gaps and details).
 * The -s classes are the same colours as strokes.
 */

const Shoulders = () => <path className="k" d="M8 64 C8 52 16 46.5 32 46.5 C48 46.5 56 52 56 64 Z" />;
const Neck = () => <path className="k" d="M27.5 39 h9 v9 h-9 z" />;
const Head = () => <ellipse className="k" cx="32" cy="32" rx="9" ry="10.5" />;
const Collar = () => <path className="c" d="M28 46.6 L32 53 L36 46.6 Z" />;
const Bust = ({ collar = true }: { collar?: boolean }) => <><Shoulders /><Neck /><Head />{collar && <Collar />}</>;

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

function PeakedCap({ tall = false, goldVisor = false, badge }: { tall?: boolean; goldVisor?: boolean; badge?: ReactNode }) {
  return (
    <>
      <path className="k" d={`M17.5 ${tall ? 20 : 23} Q32 ${tall ? 6 : 12.5} 46.5 ${tall ? 20 : 23} L43 27 L21 27 Z`} />
      <rect className="k" x="21" y="26" width="22" height="4.4" />
      <path className="c-s" strokeWidth="1" d="M20.5 26.4 H43.5 M20.5 30.4 H43.5" />
      <path className={goldVisor ? 'a' : 'k'} d="M20.5 30.6 Q32 33.6 43.5 30.6 L45.2 32.6 Q32 37.4 18.8 32.6 Z" />
      {goldVisor && <path className="a" d="M22 27.6 H42 V29.3 H22 Z" />}
      {badge}
    </>
  );
}

function Ribbons({ rows }: { rows: number }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < 3; j++) out.push(<rect key={`${i}-${j}`} className={(i + j) % 2 ? 'a' : 'c'} x={36.6 + j * 3.5} y={51 + i * 2.7} width="3.1" height="2.1" rx=".3" />);
  }
  return <>{out}</>;
}

const ART: Record<string, () => ReactNode> = {
  /** Command post: a sandbagged bunker with a flag and a radio mast. */
  F: () => (
    <>
      <path className="k-s" strokeWidth="1.8" d="M20 40 V8.5" />
      <path className="a" d="M20.9 9 H35 L31.2 13.2 L35 17.4 H20.9 Z" />
      <path className="k-s" strokeWidth="1.6" d="M45 40 L47 15" />
      <path className="a-s" strokeWidth="1.6" strokeLinecap="round" d="M50.5 13 a4.8 4.8 0 0 1 0 7.2 M54 10 a9 9 0 0 1 0 13" />
      <path className="k" d="M6 57 Q6 36 32 36 Q58 36 58 57 Z" />
      <path className="c-s" strokeWidth="1.1" d="M9.5 49.5 Q32 41.5 54.5 49.5 M7.2 55 H56.8 M17 40.4 V49 M27 37.5 V45 M37 37.5 V45 M47 40.4 V49 M13 46 V55 M22 44.6 V55 M42 44.6 V55 M51 46 V55" />
      <path className="c" d="M27 57 v-7.4 a5 5 0 0 1 10 0 V57 Z" />
      <path className="k-s" strokeWidth="1.4" opacity=".55" d="M2 58.5 H62" />
    </>
  ),
  /** Mine: an anti-tank mine with its pressure plate, prongs and a live light. */
  B: () => (
    <>
      <path className="k" d="M10 38 V45 A22 8 0 0 0 54 45 V38 Z" />
      <ellipse className="k" cx="32" cy="38" rx="22" ry="8" />
      <ellipse className="c-s" strokeWidth="1.1" cx="32" cy="38" rx="22" ry="8" />
      <path className="a-s" strokeWidth="1.5" d="M15 44.5 l2.5 4.4 M22 46.4 l2.5 4.4 M29 47.2 l2.5 4.4 M36 47.2 l2.5 4.4 M43 46.4 l2.5 4.4" />
      <ellipse className="a" cx="32" cy="36.6" rx="8.5" ry="3.4" />
      <ellipse className="c" cx="32" cy="36" rx="5" ry="1.8" />
      <path className="k-s" strokeWidth="1.7" strokeLinecap="round" d="M32 35 V23 M28.5 35.4 L24.5 25 M35.5 35.4 L39.5 25" />
      <circle className="a" cx="32" cy="22.5" r="1.7" /><circle className="a" cx="24.3" cy="24.4" r="1.5" /><circle className="a" cx="39.7" cy="24.4" r="1.5" />
      <circle className="fl-led" cx="46.5" cy="40.4" r="1.6" />
      <path className="k-s" strokeWidth="1.4" opacity=".5" d="M3 54 H61" />
    </>
  ),
  /** Operative: balaclava, night-vision goggles up, a knife. */
  1: () => (
    <>
      <Shoulders /><Neck />
      <path className="k" d="M20.5 33 C20 20.5 25 14.5 32 14.5 C39 14.5 44 20.5 43.5 33 C43.5 40.5 39 45 32 45 C25 45 20.5 40.5 20.5 33 Z" />
      <rect className="c" x="22.8" y="26.6" width="18.4" height="5.6" rx="2.8" />
      <circle className="a" cx="28" cy="29.4" r="1.4" /><circle className="a" cx="36" cy="29.4" r="1.4" />
      <rect className="k" x="24" y="15.5" width="16" height="6" rx="2.4" />
      <path className="c-s" strokeWidth="1" d="M24 21.5 H40 M30 15.5 V21.5 M34 15.5 V21.5" />
      <path className="a" d="M37.5 62 L52.5 40.5 Q55 38.2 54.4 41.4 L41.2 63.4 Z" />
      <path className="c" d="M35 64 L38.2 59.4 L41.8 61.8 L39.6 64 Z" />
    </>
  ),
  /** Scout: boonie hat, binoculars up. */
  2: () => (
    <>
      <Bust collar={false} />
      <path className="k" d="M13.5 53 Q14 41 20.5 36.4 L25 39.6 Q20.5 45 20.5 53 Z" />
      <path className="k" d="M50.5 53 Q50 41 43.5 36.4 L39 39.6 Q43.5 45 43.5 53 Z" />
      <path className="c-s" strokeWidth=".9" d="M20.5 53 Q20.5 45 25 39.6 M43.5 53 Q43.5 45 39 39.6" />
      <path className="k" d="M23 24.5 Q23 13.5 32 13.5 Q41 13.5 41 24.5 Z" />
      <ellipse className="k" cx="32" cy="24.6" rx="17.5" ry="3.6" />
      <path className="c-s" strokeWidth="1" d="M23 21.4 Q32 19.6 41 21.4" />
      <rect className="a" x="20.4" y="27.6" width="10" height="7.4" rx="2.2" />
      <rect className="a" x="33.6" y="27.6" width="10" height="7.4" rx="2.2" />
      <rect className="a" x="29.6" y="29.6" width="4.8" height="3" />
      <circle className="c" cx="25.4" cy="31.3" r="2.3" /><circle className="c" cx="38.6" cy="31.3" r="2.3" />
    </>
  ),
  /** Engineer: hard hat and a big wrench. */
  3: () => (
    <>
      <Bust />
      <path className="a" d="M20.5 27.5 C20.5 18.5 25.5 14.5 32 14.5 C38.5 14.5 43.5 18.5 43.5 27.5 Z" />
      <path className="c-s" strokeWidth="1.2" d="M32 15 V27 M26.5 17 L27.5 27 M37.5 17 L36.5 27" />
      <rect className="a" x="16.5" y="26.6" width="31" height="3.4" rx="1.7" />
      <g transform="rotate(38 47 50)">
        <rect className="a" x="44.6" y="42" width="4.8" height="21" rx="1.8" />
        <circle className="a" cx="47" cy="39" r="6" />
        <rect className="c" x="45" y="31.6" width="4" height="6.6" rx=".6" />
      </g>
    </>
  ),
  /** Sergeant: combat helmet, rifle over the shoulder, stripes. */
  4: () => (
    <>
      <path className="k" d="M10.4 58.6 L49.4 14.4 L52.6 17 L13.6 61.2 Z" />
      <rect className="k" x="45" y="16" width="4" height="7" transform="rotate(41 47 19.5)" />
      <Bust />
      <path className="k" d="M20 31.5 C20 20 25.5 15.4 32 15.4 C38.5 15.4 44 20 44 31.5 L46 33 L18 33 Z" />
      <path className="c-s" strokeWidth="1.3" d="M18.4 33.2 H45.6" />
      <path className="c-s" strokeWidth=".9" d="M23.2 33.6 Q32 45.5 40.8 33.6 M25 21 L28 24 M36 19.5 L39.5 22.5 M30 17.5 L33 20.5" />
      <path className="a-s" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" d="M13.5 54.5 L17.5 52 L21.5 54.5 M13.5 57.6 L17.5 55.1 L21.5 57.6 M13.5 60.7 L17.5 58.2 L21.5 60.7" />
    </>
  ),
  /** Lieutenant: patrol cap, radio pack, one bar. */
  5: () => (
    <>
      <path className="k-s" strokeWidth="1.5" d="M48.5 50 L54 15.5" />
      <circle className="a" cx="54.2" cy="14.6" r="1.7" />
      <Bust />
      <rect className="k" x="43.5" y="43" width="10" height="13" rx="2.2" />
      <path className="c-s" strokeWidth=".9" d="M43.5 47.5 H53.5" />
      <path className="k" d="M22 27.5 L22.8 17.6 Q32 15 41.2 17.6 L42 27.5 Z" />
      <path className="k" d="M21 26.6 Q33 24.2 46.5 28.4 L45.6 30.4 Q33 27.8 21 29.4 Z" />
      <path className="c-s" strokeWidth="1" d="M21.5 27.2 H42.5" />
      <rect className="a" x="37.6" y="50.4" width="7.5" height="2.6" rx=".6" />
    </>
  ),
  /** Captain: beret with a badge, two bars. */
  6: () => (
    <>
      <Bust />
      <path className="k" d="M20.6 28 C18.4 20 25.6 14.4 35 15.4 C43.6 16.4 47 21 44.4 25.6 C40 23.2 30 24.4 20.6 28 Z" />
      <path className="c-s" strokeWidth="1.1" d="M21 27.4 C30 24 39.6 23 44 25.4" />
      <circle className="a" cx="25.6" cy="22.4" r="2.6" />
      <circle className="c" cx="25.6" cy="22.4" r="1" />
      <rect className="a" x="38.4" y="49.4" width="2.4" height="7" rx=".5" />
      <rect className="a" x="42" y="49.4" width="2.4" height="7" rx=".5" />
    </>
  ),
  /** Major: peaked cap with an oak leaf, a cross strap. */
  7: () => (
    <>
      <Bust />
      <path className="c-s" strokeWidth="1.3" d="M41.5 47.6 L24 64" />
      <PeakedCap badge={<path className="a" d="M32 14.6 C35.4 17 35.4 21.6 32 24.6 C28.6 21.6 28.6 17 32 14.6 Z M32 17 V24" />} />
      <rect className="a" x="13" y="49.6" width="8" height="2.6" rx="1" />
      <rect className="a" x="43" y="49.6" width="8" height="2.6" rx="1" />
      <Ribbons rows={1} />
    </>
  ),
  /** Colonel: eagle on the cap, aviator glasses, ribbons. */
  8: () => (
    <>
      <Bust />
      <PeakedCap badge={<path className="a" d="M24.5 19.6 Q28.5 16.4 32 19.2 Q35.5 16.4 39.5 19.6 Q35.6 19.4 32 23.2 Q28.4 19.4 24.5 19.6 Z" />} />
      <path className="c" d="M23 34 H30.4 V36.4 A3.7 3.3 0 0 1 23 36.4 Z M33.6 34 H41 V36.4 A3.7 3.3 0 0 1 33.6 36.4 Z" />
      <path className="c-s" strokeWidth=".9" d="M30.4 34.6 H33.6" />
      <Ribbons rows={2} />
    </>
  ),
  /** General: gold visor, stars on cap and shoulders, a full ribbon rack. */
  9: () => (
    <>
      <Bust />
      <PeakedCap goldVisor badge={<><path className="a" d={star(28, 19.4, 2.6)} /><path className="a" d={star(36, 19.4, 2.6)} /></>} />
      <path className="a" d={star(15, 52, 2.3)} /><path className="a" d={star(20, 50.6, 2.3)} />
      <path className="a" d={star(44, 50.6, 2.3)} /><path className="a" d={star(49, 52, 2.3)} />
      <Ribbons rows={3} />
    </>
  ),
  /** Marshal: tall cap with laurels and a star, fringed epaulettes, sash and baton. */
  10: () => (
    <>
      <Bust collar={false} />
      <path className="a" d="M41.6 47.2 L46.6 49.4 L21.6 64 L15 64 Z" />
      <PeakedCap tall goldVisor badge={<path className="a" d={star(32, 16.4, 3.6)} />} />
      <path className="a-s" strokeWidth="1.1" fill="none" d="M21.5 28.4 Q24 25 27.5 25.4 M42.5 28.4 Q40 25 36.5 25.4" />
      <rect className="a" x="9.5" y="49.2" width="11.5" height="3.6" rx="1.4" />
      <rect className="a" x="43" y="49.2" width="11.5" height="3.6" rx="1.4" />
      <path className="a-s" strokeWidth="1" d="M11 53 v4 M13.5 53 v4 M16 53 v4 M18.5 53 v4 M45 53 v4 M47.5 53 v4 M50 53 v4 M52.5 53 v4" />
      <g transform="rotate(-34 50 56)">
        <rect className="a" x="47.6" y="44" width="5" height="20" rx="1.6" />
        <path className="k-s" strokeWidth="1" d="M47.6 47.5 H52.6 M47.6 60.5 H52.6" />
      </g>
    </>
  ),
};

/** The illustration for one rank. */
export function UnitArt({ rank, className = '' }: { rank: Rank; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={`fla ${className}`} data-testid="fl-insignia">
      {ART[String(rank)]()}
    </svg>
  );
}

/** The back of an enemy tile: the army crest, nothing that tells one piece from another. */
export function TileBack({ owner }: { owner: PlayerID }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="fla flt-crest">
      <circle className="k-s" strokeWidth="1.2" strokeDasharray="2.2 3.2" cx="32" cy="32" r="22" opacity=".5" />
      <path className="k-s" strokeWidth="1.2" opacity=".5" d="M32 4 V10 M32 54 V60 M4 32 H10 M54 32 H60" />
      <path className="k" d="M32 14.5 L46 19.8 V30.6 C46 40.2 40 46.4 32 49.5 C24 46.4 18 40.2 18 30.6 V19.8 Z" />
      <path className="c-s" strokeWidth="1.1" d="M32 17.6 L43.2 21.8 V30.6 C43.2 38.4 38.4 43.6 32 46.4 C25.6 43.6 20.8 38.4 20.8 30.6 V21.8 Z" />
      {owner === '0'
        ? <path className="c" d={star(32, 31, 8.2)} />
        : <path className="c" d="M23.5 27 L32 22 L40.5 27 V31 L32 26 L23.5 31 Z M23.5 34.6 L32 29.6 L40.5 34.6 V38.6 L32 33.6 L23.5 38.6 Z" />}
    </svg>
  );
}
