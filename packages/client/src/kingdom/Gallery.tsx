import { useMemo } from 'react';
import { HEROES, HERO_NAME, I_MASK, L_MASK, T_MASK, TREASURE_IDS, TREASURE_NAME, cell, isFixed, newGame, rotMask, HOMES } from '@boboland/shared/src/kingdom';
import { TileSvg, Tent } from './art/tiles';
import { TreasureIcon } from './art/treasures';
import { HeroFigure, HERO_VIEWBOX } from './art/heroes';
import { HeroPortrait } from './art/portraits';
import { CardBack, HomeCard, StoryCard } from './art/cards';
import { Scene } from './art/scene';

/** /kingdom/gallery: every piece of art for the art quality gate (Gate A). */
export function KgGallery() {
  const patch = useMemo(() => {
    let s = 5;
    const g = newGame(2, () => { s = (s * 9301 + 49297) % 233280; return s / 233280; });
    const out = [];
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) out.push({ i: cell(r, c), t: g.board[cell(r, c)] });
    return { out, board: g.board };
  }, []);
  return (
    <div className="kingdom kg-page kg-gallery" data-testid="kg-gallery">
      <Scene phase="morning" />
      <section className="kg-gal-sec">
        <h2>Tiles at four rotations</h2>
        {[['Straight', I_MASK], ['Corner', L_MASK], ['T-junction', T_MASK]].map(([name, m]) => (
          <div key={name as string} className="kg-gal-row">
            {[0, 1, 2, 3].map((r) => <figure key={r} style={{ margin: 0 }}><div className="kg-gal-tile"><TileSvg tile={{ id: 20 + r + (m as number), m: rotMask(m as number, r) }} /></div><figcaption className="kg-gal-cap">{name} {r * 90}°</figcaption></figure>)}
            {[0, 1].map((r) => <figure key={`t${r}`} style={{ margin: 0 }}><div className="kg-gal-tile"><TileSvg tile={{ id: 30 + r, m: rotMask(m as number, r), t: TREASURE_IDS[(r * 7 + (m as number)) % 24] }} /></div><figcaption className="kg-gal-cap">with treasure</figcaption></figure>)}
          </div>
        ))}
        <div className="kg-gal-row">
          {HOMES.map((h, k) => <figure key={h} style={{ margin: 0 }}><div className="kg-gal-tile"><TileSvg tile={{ id: k, m: [6, 12, 9, 3][k] }} fixed homeHero={k} /></div><figcaption className="kg-gal-cap">Home ({HERO_NAME[HEROES[k]]})</figcaption></figure>)}
          {[cell(0, 2), cell(2, 2)].map((i, k) => <figure key={i} style={{ margin: 0 }}><div className="kg-gal-tile"><TileSvg tile={{ id: 5 + k, m: k ? 14 : 14, t: k ? 'musicbox' : 'harp' }} fixed /></div><figcaption className="kg-gal-cap">Fixed tile</figcaption></figure>)}
        </div>
      </section>
      <section className="kg-gal-sec">
        <h2>Paths join across neighbours (a 3x3 patch of a real board)</h2>
        <div className="kg-gal-patch">{patch.out.map(({ i, t }) => <TileSvg key={i} tile={t} fixed={isFixed(i)} />)}</div>
      </section>
      <section className="kg-gal-sec">
        <h2>Treasures at 32px</h2>
        <div className="kg-gal-row">{TREASURE_IDS.map((t) => <TreasureIcon key={t} t={t} size={32} />)}</div>
        <h2 style={{ marginTop: 14 }}>Treasures at 120px</h2>
        <div className="kg-gal-row">{TREASURE_IDS.map((t) => <figure key={t} className="kg-gal-t" style={{ margin: 0 }}><TreasureIcon t={t} size={120} /><figcaption>{TREASURE_NAME[t]}</figcaption></figure>)}</div>
      </section>
      <section className="kg-gal-sec">
        <h2>Heroes: idle, walking, portraits, tents</h2>
        <div className="kg-gal-row">
          {HEROES.map((h, k) => <svg key={h} viewBox={HERO_VIEWBOX} className="kg-gal-hero kg-hero-svg"><HeroFigure hero={k} /></svg>)}
          {HEROES.map((h, k) => <svg key={`w${h}`} viewBox={HERO_VIEWBOX} className="kg-gal-hero"><HeroFigure hero={k} walking /></svg>)}
        </div>
        <div className="kg-gal-row">
          {HEROES.map((h, k) => <span key={h} className="kg-seat-face" style={{ ['--pc' as string]: '#d2a23a' }}><HeroPortrait hero={k} /></span>)}
          {HEROES.map((h, k) => <svg key={`t${h}`} viewBox="-20 -24 40 36" width="80"><Tent x={0} y={0} hero={k} /></svg>)}
        </div>
      </section>
      <section className="kg-gal-sec">
        <h2>Cards: front, back, home, small</h2>
        <div className="kg-gal-row">
          <StoryCard t="unicorn" /><StoryCard t="musicbox" /><CardBack /><HomeCard hero={2} /><StoryCard t="comb" small /><StoryCard t="phoenix" small /><CardBack small />
        </div>
      </section>
      <section className="kg-gal-sec">
        <h2>Times of day</h2>
        <p>The background follows the game: see <code>/kingdom/scenes</code> for each.</p>
      </section>
    </div>
  );
}
