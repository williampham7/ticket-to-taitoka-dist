import { useMemo } from 'react';
import { anchors, fits, squaresOf, type PieceId } from '@boboland/shared/src/blocky';
import { Sky } from './art/sky';
import { Icon } from './art/icons';
import { ShelfPiece } from './art/blocks';
import { BoardView } from './Board';
import { SkyFront } from './art/skyfront';
import { Banner, LogPanel, StatusLine } from './Hud';
import { Shelf } from './Shelf';
import { fixture } from './fixtures';
import { banners, fitSets, noRoomOf, progressOf } from './derive';
import { GUILD_NAME } from './text';

/** /blocky/mock: the static full-fidelity mid-game screen (Gate A0's reference). Real components, fixed data. */
export function BlyMock() {
  const view = useMemo(() => fixture('mid'), []);
  const me = view.actor, g = view.current;
  const names: Record<string, string> = { 0: 'Ana', 1: 'Bo', 2: 'Kit', 3: 'Moss' };
  const noRoom = noRoomOf(view, g);
  // hold the shelf piece with the most room: a big piece shows the fit glows best
  const piece = view.shelf[g].reduce<PieceId>((b, p) => (fits(view, g, p).length * squaresOf(p) > fits(view, g, b).length * squaresOf(b) ? p : b), view.shelf[g][0]);
  const mid = (view.size - 1) / 2;
  const place = fits(view, g, piece).reduce((b, p) => { const d = (q: typeof p) => Math.hypot(Math.floor(q.at / view.size) - mid + 1, (q.at % view.size) - mid + 1); return d(p) < d(b) ? p : b; });
  const sets = fitSets(view, g, piece, place.orient);
  const size = view.size;
  const bs = banners(view, me, names);
  // mock only: show the danger and grounded cues that a real mid-game may not have yet
  const other = bs.filter((b) => !b.you && !b.shared);
  if (!bs.some((b) => b.danger)) other[0].danger = { guild: other[0].guilds[0], n: 2 };
  other[other.length - 1].grounded = other[other.length - 1].guilds;
  const cell = typeof window !== 'undefined' && window.innerHeight > 1000 ? 21 : 15;
  const bump = view.placed.reduce((b, q) => (q.n > b.n ? q : b));
  const progress = progressOf(view);
  const ghost = { guild: g, piece, orient: place.orient, r: Math.floor(place.at / size), c: place.at % size, legal: true, pending: true };
  // mock only: show the "No room" tag even if every piece still fits somewhere
  if (!noRoom.size) noRoom.add(view.shelf[g].find((p) => p !== piece && p.length > 1) ?? view.shelf[g][0]);
  // inspect a big opponent piece well away from the ghost and the newest move
  const far = (i: number) => { const q = view.placed[i]; return Math.hypot(Math.floor(q.at / size) - ghost.r, (q.at % size) - ghost.c); };
  const opp = view.placed.map((q, i) => i).filter((i) => view.placed[i].guild !== g && squaresOf(view.placed[i].piece) >= 4 && view.placed[i].n !== bump.n).sort((a, b) => far(b) - far(a))[0] ?? -1;
  return (
    <div className="blocky bly-game" data-testid="bly-mock">
      <Sky progress={progress} />
      <div className="bly-bar">
        <span className="bly-brand bly-brass"><ShelfPiece guild="sun" piece="T4" orient={2} cell={9} className="bly-brand-mark" /><span className="bly-brand-word">Blocky</span></span>
        <button type="button" className="bly-key bly-key-icon" aria-label="Leave"><Icon name="leave" /></button>
        <button type="button" className="bly-key bly-key-icon" aria-label="Settings"><Icon name="settings" /></button>
        <button type="button" className="bly-key bly-key-icon" aria-label="Sound"><Icon name="sound" /></button>
      </div>
      <aside className="bly-left">
        <div className="bly-banners">
          {bs.map((b, i) => <Banner key={b.key} b={b} open={i === 2} bubble={i === 1 ? <span className="bly-bubble bly-cloud" aria-label="Bo cheers">🎉</span> : undefined} />)}
        </div>
        <LogPanel log={view.log} names={names} tappable={() => true} action={<button type="button" className="bly-key bly-key-sm bly-key-icon" aria-label="Chat"><Icon name="chat" /></button>} />
      </aside>
      <main className="bly-stage">
        <BoardView view={view} names={names} progress={progress} anchors={{ guild: g, cells: anchors(view, g), fit: sets.fit, fitNow: sets.now }}
          ghost={ghost} inspect={opp >= 0 ? { index: opp } : null}
          pendingKeys={<><button type="button" className="bly-key bly-key-go" aria-label="Build here" data-testid="bly-confirm"><Icon name="confirm" size={28} /></button><button type="button" className="bly-key" aria-label="Put it back" data-testid="bly-cancel"><Icon name="cancel" size={28} /></button></>}
          fx={<text className="bly-plus" x={(bump.at % size) + 1} y={Math.floor(bump.at / size) - 0.6}>+{squaresOf(bump.piece)}</text>} />
        <SkyFront />
      </main>
      <aside className="bly-side">
        <StatusLine guild={g} text={`Your turn · place a ${GUILD_NAME[g]} piece`} sub="Tap ✓ to build it there, or drag it to adjust" step={2} />
        <Shelf guild={g} pieces={view.shelf[g]} held={{ piece, orient: place.orient }} noRoom={noRoom} cell={cell}>
          <div className="bly-tools">
            <button type="button" className="bly-key"><Icon name="rotate" />Rotate<span className="bly-kbd">R</span></button>
            <button type="button" className="bly-key"><Icon name="flip" />Flip<span className="bly-kbd">F</span></button>
            <button type="button" className="bly-key" data-testid="bly-suggest"><Icon name="suggest" />Suggest<span className="bly-kbd">S</span></button>
            <button type="button" className="bly-key" aria-label="Clean view"><Icon name="eye" />View<span className="bly-kbd">V</span></button>
            <button type="button" className="bly-key" aria-label="Done building"><Icon name="done" />Done<span className="bly-kbd">D</span></button>
          </div>
        </Shelf>
        <div className="bly-coach bly-coach-dock bly-cloud" role="note"><span className="bly-coach-arrow" /><b>Touch your guild only at the corners</b><small>Glowing diamonds are your open corners.</small><button type="button" className="bly-key bly-key-sm">Got it</button></div>

      </aside>
    </div>
  );
}
