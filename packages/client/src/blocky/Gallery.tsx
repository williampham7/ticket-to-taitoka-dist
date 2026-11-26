import type { ReactNode } from 'react';
import { GUILDS, PIECE_IDS, PIECE_NAME, orientations, type Guild, type PieceId } from '@boboland/shared/src/blocky';
import { PieceArt } from './art/blocks';
import { Plateau, Sigil, Sockets } from './art/plateau';
import { Crest } from './art/crests';
import { Avatar } from './art/avatars';
import { ICONS, Icon } from './art/icons';
import { Sky } from './art/sky';
import { AVATAR_NAME, GUILD_NAME } from './text';
import { BlockyCard } from './PickerCard';
import { KingdomCard } from '../kingdom/PickerCard';
import { Banner } from './Hud';

/** One piece in its own SVG at `cell` px per square, at a growth stage. */
function P({ g, id, cell, stage = 1, orient = 0, n = 3 }: { g: Guild; id: PieceId; cell: number; stage?: 1 | 2 | 3; orient?: number; n?: number }) {
  const sh = orientations(id)[orient];
  return (
    <svg className={cell < 22 ? 'bly-small' : undefined} width={(sh.w + 0.5) * cell} height={(sh.h + 0.6) * cell} viewBox={`-.15 -.3 ${sh.w + 0.5} ${sh.h + 0.6}`} aria-label={`${GUILD_NAME[g]} ${PIECE_NAME[id]}`}>
      <PieceArt guild={g} piece={id} orient={orient} x={0} y={0} stage={stage} n={n} />
    </svg>
  );
}
const Sec = ({ title, children, gray }: { title: string; children: ReactNode; gray?: boolean }) => (
  <section className={`bly-gal-sec bly-stone${gray ? ' bly-gal-gray' : ''}`}><h2>{title}</h2><div className="bly-gal-row">{children}</div></section>
);

/** /blocky/gallery: every piece of art (Gate A). */
export function BlyGallery() {
  return (
    <div className="blocky bly-gallery">
      <Sky progress={0.3} />
      <h1 className="bly-gal-title bly-brass">Blocky · art gallery</h1>
      {GUILDS.map((g) => (
        <Sec key={g} title={`${GUILD_NAME[g]}: all 21 pieces`}>{PIECE_IDS.map((id) => <P key={id} g={g} id={id} cell={26} n={PIECE_IDS.indexOf(id)} />)}</Sec>
      ))}
      <Sec title="Scale: 16, 28 and 48 px per square (the same four pieces, every guild)">
        {[16, 28, 48].map((c) => (
          <figure key={c} className="bly-gal-fig">
            <div className="bly-gal-scale">{GUILDS.map((g) => <div key={g} className="bly-gal-cell">{(['X', 'I4', 'T4', 'P'] as PieceId[]).map((id) => <P key={id} g={g} id={id} cell={c} />)}</div>)}</div>
            <figcaption>{c} px per square</figcaption>
          </figure>
        ))}
      </Sec>
      <Sec title="Joints and the shared guild">
        {GUILDS.map((g, i) => (
          <figure key={g} className="bly-gal-fig">
            <svg width="200" height="210" viewBox="-.5 -.6 6 6.3"><rect x="-.5" y="-.6" width="6" height="6.3" fill="#ebe2cf" />
              <PieceArt guild={g} piece="L4" orient={0} x={0} y={0} n={1 + i} /><PieceArt guild={g} piece="T4" orient={0} x={2} y={3} n={2 + i} /><PieceArt guild={g} piece="I2" orient={1} x={4} y={1} n={3 + i} />
              <use href="#bly-stud" x={2 - 0.12} y={3 - 0.21} className={`bly-g-${g}`} /><use href="#bly-stud" x={4 - 0.12} y={3 - 0.21} className={`bly-g-${g}`} /></svg>
            <figcaption>{GUILD_NAME[g]}: joint studs at the corners</figcaption>
          </figure>
        ))}
        <figure className="bly-gal-fig">
          <svg width="200" height="170" viewBox="-.4 -.5 5 4.8"><rect x="-.4" y="-.5" width="5" height="4.8" fill="#ebe2cf" /><PieceArt guild="grove" piece="W" orient={0} x={0.6} y={0.6} n={3} shared /></svg>
          <figcaption>Shared guild piece: striped rim</figcaption>
        </figure>
      </Sec>
      <Sec title="Growth: stage 1, 2 and 3">
        {GUILDS.map((g) => <span key={g} className="bly-gal-cell">{([1, 2, 3] as const).map((s) => <P key={s} g={g} id="P" cell={48} stage={s} n={1} />)}<small>{GUILD_NAME[g]}</small></span>)}
      </Sec>
      <Sec title="Guild patterns in grayscale" gray>
        {GUILDS.map((g) => <span key={g} className="bly-gal-cell"><P g={g} id="O4" cell={48} n={99} /><small>{GUILD_NAME[g]}</small></span>)}
      </Sec>
      <Sec title="Start sigils and crests">
        {GUILDS.map((g) => (
          <span key={g} className="bly-gal-cell">
            <svg width="64" height="64" viewBox="-.3 -.3 1.6 1.6"><rect x="-.3" y="-.3" width="1.6" height="1.6" fill="#ebe2cf" /><Sigil guild={g} r={0} c={0} /></svg>
            <Crest guild={g} size={64} /><Crest guild={g} size={40} /><Crest guild={g} size={24} /><small>{GUILD_NAME[g]}</small>
          </span>
        ))}
        <span className="bly-gal-cell"><Crest guild="grove" size={64} shared /><small>Shared</small></span>
      </Sec>
      <Sec title="Builders (96 px, 40 px, blink, grayscale 40 px, thinking)">
        {AVATAR_NAME.map((n, i) => <span key={n} className="bly-gal-cell"><Avatar id={i} size={96} /><Avatar id={i} size={40} /><Avatar id={i} size={40} blink /><span className="bly-gal-grayone"><Avatar id={i} size={40} /></span><Avatar id={i} size={40} thinking /><small>{n}</small></span>)}
      </Sec>
      <Sec title="Plateau: a whole Classic board by day, its corner, and a Duo board at night">
        <svg className="bly-gal-plat" width="420" height="560" viewBox="-2.2 -2.8 24.4 33"><Plateau size={20} /><Sockets size={20} />{(['tide', 'sun', 'ember', 'grove'] as Guild[]).map((g, i) => <Sigil key={g} guild={g} r={i > 1 ? 19 : 0} c={i === 1 || i === 2 ? 19 : 0} />)}</svg>
        <svg className="bly-gal-plat" width="300" height="300" viewBox="-2.2 -2.2 8 8"><Plateau size={20} /><Sockets size={20} /><Sigil guild="tide" r={0} c={0} /></svg>
        <div className="bly-gal-night"><Sky progress={1} /><svg width="340" height="520" viewBox="-1.8 -2.2 17.6 25" style={{ ['--night' as string]: 1, position: 'relative' }}><Plateau size={14} /><Sockets size={14} /><Sigil guild="tide" r={4} c={4} /><Sigil guild="ember" r={9} c={9} /></svg></div>
      </Sec>
      <Sec title="Materials in every state">
        <div className="bly-gal-mats">
          {(['', ' is-hover', ' is-pressed', ' is-disabled', ' bly-is-focus'] as const).map((st) => (
            <div key={st} className="bly-gal-matcol">
              <small>{st.trim().replace('is-', '').replace('bly-', '') || 'idle'}</small>
              <button type="button" className={`bly-key${st}`} disabled={st === ' is-disabled'}><Icon name="rotate" />Stone key</button>
              <button type="button" className={`bly-key bly-key-go${st}`} disabled={st === ' is-disabled'}><Icon name="confirm" />Brass key</button>
              <button type="button" className={`bly-key bly-key-ghost${st}`} disabled={st === ' is-disabled'}>Quiet key</button>
              <div className={`bly-stone bly-gal-swatch${st}`}>Carved stone</div>
              <div className={`bly-plank bly-gal-swatch bly-gal-plank${st}`}><span className="bly-rope" style={{ left: '22%' }} /><span className="bly-rope" style={{ right: '22%' }} />Oiled plank</div>
              <div className={`bly-brass bly-gal-swatch${st}`}>Brass plate</div>
              <div className={`bly-cloud bly-gal-swatch${st}`}>Cloud</div>
              <div className={`bly-gal-pen${st}`}><Banner b={{ key: `p${st}`, name: 'Ana', avatar: 0, guilds: ['tide'], placed: 34, score: -55, rank: 0, grounded: [], shelves: { tide: PIECE_IDS.slice(9) }, you: true }} /></div>
            </div>
          ))}
        </div>
        <div className="bly-gal-pennants">
          {[{ active: true, thinking: true }, { out: true }].map((x, i) => (
            <Banner key={i} b={{ key: String(i), name: ['Bo', 'Kit'][i], avatar: i + 2, guilds: [(['ember', 'grove'] as Guild[])[i]], placed: 25 - i * 9, score: -51 + i * 4, rank: i + 1, grounded: i === 1 ? ['grove'] : [], shelves: { ember: PIECE_IDS.slice(8), grove: PIECE_IDS.slice(2) }, ...x }} />
          ))}
          <Banner b={{ key: 'sh', name: 'Shared guild', avatar: null, guilds: ['grove'], shared: true, placed: 18, score: null, grounded: [], shelves: { grove: PIECE_IDS.slice(6) } }} />
        </div>
      </Sec>
      <Sec title="Icons (24 and 40 px)">
        {ICONS.map((n) => <span key={n} className="bly-gal-cell bly-gal-icon"><Icon name={n} size={24} /><Icon name={n} size={40} /><small>{n}</small></span>)}
      </Sec>
      <Sec title="Picker card on the library page">
        <div className="bly-gal-pickers"><div className="bly-gal-picker"><KingdomCard follower /></div><div className="bly-gal-picker"><BlockyCard follower /></div></div>
      </Sec>
    </div>
  );
}
