import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { act, legalMoves, newGame, squaresOf, type BView } from '@boboland/shared/src/blocky';
import { BlyScreen } from './Screen';
import { fixture, rng, type FixtureName } from './fixtures';
import { BoardView } from './Board';
import { BoardFx, sceneAnim } from './BoardFx';
import { Reveal, Ribbon } from './Moments';
import { Banner } from './Hud';
import { Sky } from './art/sky';
import { banners } from './derive';
import { BEAT } from './fx';
import type { Anim } from './useBlockyFx';

const NAMES = { 0: 'Ana', 1: 'Bo', 2: 'Kit', 3: 'Moss' };
export const SCENE_ANIMS = ['place-tide', 'place-sun', 'place-ember', 'place-grove', 'opponent', 'first', 'big', 'last', 'growth', 'stuck', 'turn', 'reveal'] as const;
type SceneAnim = typeof SCENE_ANIMS[number];
/** Filmstrip frame times (ms): dense through the action, sparse through the residue. */
const STRIP_AT = [0, 150, 320, 480, 640, 850, 1250, 1900];

/**
 * /blocky/scenes: QA for every animation and every clarity state.
 * ?screen=mid|duo|grounded|last|end|three|classic2&as=<seat>: the full game screen from a fixture.
 * ?play=<anim>: one animation, live (buttons replay each one). &scrub=<0..1> freezes it at that fraction.
 * ?strip=<anim>: an 8-frame filmstrip (scrub 0, 1/7 … 1) for the motion gate.
 */
export function BlyScenes() {
  useEffect(() => { document.body.classList.add('bly-noparty'); return () => document.body.classList.remove('bly-noparty'); }, []);
  const q = new URLSearchParams(window.location.search);
  const play = q.get('play') as SceneAnim | null, strip = q.get('strip') as SceneAnim | null;
  if (play || strip) return <AnimScenes anim={(play ?? strip)!} scrub={q.get('scrub')} strip={!!strip} />;
  return <ScreenScene name={(q.get('screen') ?? q.get('board') ?? 'mid') as FixtureName} as={q.get('as')} />;
}

function ScreenScene({ name, as }: { name: FixtureName; as: string | null }) {
  const replay = new URLSearchParams(window.location.search).get('replay');
  const final = useMemo(() => fixture(name), [name]);
  const prev = useMemo(() => (replay ? fixture(name, 1) : final), [name, replay, final]);
  const [view, setView] = useState(prev);
  useEffect(() => { if (prev !== final) { const t = setTimeout(() => setView(final), 600); return () => clearTimeout(t); } }, [prev, final]);
  const me = as ?? final.actor;
  return <BlyScreen view={view} me={me === 'watch' ? null : me} names={NAMES} kind="local" send={() => {}} resign={() => {}} onExit={() => {}} again={{ label: 'Play again', onClick: () => {} }} />;
}

/** The scene for one animation: a view, the anim, and where to look (cells). */
function build(anim: SceneAnim): { view: BView; a: Anim | null; focus: [number, number] } {
  const mid = fixture('mid');
  const idxOf = (v: BView, f: (i: number) => boolean) => { for (let i = v.placed.length - 1; i >= 0; i--) if (f(i)) return i; return v.placed.length - 1; };
  const focusOf = (v: BView, a: Anim) => (a.e.k === 'place' ? [Math.floor(a.e.at / v.size) + 1, (a.e.at % v.size) + 1] : [v.size / 2, v.size / 2]) as [number, number];
  if (anim.startsWith('place-')) {
    const g = anim.slice(6);
    const a = sceneAnim(mid, { index: idxOf(mid, (i) => mid.placed[i].guild === g) });
    return { view: mid, a, focus: focusOf(mid, a) };
  }
  if (anim === 'opponent') { const a = sceneAnim(mid, { travel: true, index: idxOf(mid, (i) => mid.placed[i].guild === 'ember') }); return { view: mid, a, focus: focusOf(mid, a) }; }
  if (anim === 'big') { const a = sceneAnim(mid, { index: idxOf(mid, (i) => squaresOf(mid.placed[i].piece) === 5 && mid.placed[i].guild === 'ember') }); return { view: mid, a, focus: focusOf(mid, a) }; }
  if (anim === 'growth') {
    const a = sceneAnim(mid, { index: idxOf(mid, (i) => mid.placed[i].guild === 'tide') });
    const g = mid.placed.filter((q, j) => q.guild === 'tide' && j < mid.placed.length).slice(-3)[0];
    return { view: mid, a, focus: g ? [Math.floor(g.at / mid.size) + 1, (g.at % mid.size) + 1] : focusOf(mid, a) };
  }
  if (anim === 'last') {
    const a = sceneAnim(mid, { index: idxOf(mid, (i) => mid.placed[i].guild === 'grove') });
    if (a.e.k === 'place') a.after = { ...a.after, shelf: { ...a.after.shelf, [a.e.guild]: [] } };
    return { view: mid, a, focus: focusOf(mid, a) };
  }
  if (anim === 'first') {
    const s = newGame(2, rng(3), { board: 'duo' }) as BView;
    const m = legalMoves(s, s.current).find((p) => squaresOf(p.piece) === 5)!;
    act(s, s.actor, { k: 'place', ...m });
    const a = sceneAnim(s, { index: 0 });
    return { view: s, a, focus: focusOf(s, a) };
  }
  return { view: mid, a: null, focus: [10, 10] };
}

function AnimScenes({ anim, scrub, strip }: { anim: SceneAnim; scrub: string | null; strip: boolean }) {
  const [n, setN] = useState(0);
  const sc = useMemo(() => build(anim), [anim]);
  const total = sc.a ? sc.a.total : anim === 'turn' ? BEAT.turn.ribbon : anim === 'reveal' ? BEAT.start.ms : 2000;
  const frame = (f: number | null, key: string | number) => (
    <div key={key} className={`bly-scene-frame${f !== null ? ' bly-scrub' : ''}`} style={{ ['--scrub' as string]: f !== null ? `${Math.round(f * total)}ms` : '0ms' } as CSSProperties}>
      <SceneBody anim={anim} sc={sc} />
      {f !== null && <span className="bly-scene-t">{Math.round(f * total)} ms</span>}
    </div>
  );
  return (
    <div className={`blocky bly-scenes${strip ? ' bly-strip' : ''}`} data-testid="bly-scenes">
      <Sky progress={0.3} />
      {!strip && (
        <nav className="bly-scene-nav">
          {SCENE_ANIMS.map((x) => <a key={x} className={`bly-key bly-key-sm${x === anim ? ' bly-key-go' : ''}`} href={`/blocky/scenes?play=${x}`} onClick={(e) => { if (x === anim) { e.preventDefault(); setN((k) => k + 1); } }}>{x}</a>)}
        </nav>
      )}
      {strip ? <div className="bly-strip-grid">{STRIP_AT.map((t, i) => frame(Math.min(1, t / total), i))}</div> : frame(scrub !== null ? Number(scrub) : null, n)}
    </div>
  );
}

function SceneBody({ anim, sc }: { anim: SceneAnim; sc: ReturnType<typeof build> }) {
  const { view, a, focus } = sc;
  if (anim === 'turn') return <div className="bly-scene-moment"><Ribbon guild="sun" name="Your turn" avatar={5} k={1} /></div>;
  if (anim === 'reveal') return <div className="bly-scene-moment"><Reveal view={view} me={view.seats.sun} names={NAMES} k={1} /></div>;
  if (anim === 'stuck') {
    const b = banners(view, '0', NAMES)[1];
    return <div className="bly-scene-banner"><Banner b={{ ...b, grounded: b.guilds }} /></div>;
  }
  const z = 5.5;
  const box = `${focus[1] - z} ${focus[0] - z - 1.5} ${z * 2} ${z * 2}`;
  const shown = a ? a.after : view;
  return (
    <div className="bly-scene-board">
      <BoardView view={shown} names={NAMES} progress={0.3} zoom={box} appear={a && a.e.k === 'place' ? { n: shown.placed[shown.placed.length - 1].n, at: a.land } : undefined} fx={a ? <BoardFx anims={[a]} k={1} /> : null} />
    </div>
  );
}
