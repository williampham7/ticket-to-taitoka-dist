import { useMemo, useRef, useState } from 'react';
import { act, cell, cellOf, distances, lineCells, newGame, resign, viewFor, type Action, type KState, type TreasureId } from '@boboland/shared/src/kingdom';
import { KgScreen } from './Screen';
import { setFlat } from './fx';

/**
 * /kingdom/scenes: a playable mid-game fixture (4 heroes, two sharing a square, treasures found, one hero heading
 * home) for the board gate, and buttons that play every animation on demand for the motion gate.
 * ?board=mid shows the fixture only; ?flat=1 drops the tilt; ?tod=night|sunset forces the time of day.
 */
const ME = '0';
function fixture(): KState {
  let s = 11;
  const G = newGame(4, () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }, { length: 'medium', heroes: [0, 1, 2, 3], young: [false, false, true, false] });
  const take = (p: string, n: number) => { for (let k = 0; k < n; k++) { const t = G.stacks[p].shift(); if (t) G.found[p].push(t); } };
  take('0', 1); take('1', 2); take('2', 5); take('3', 1);
  G.pos = { '0': cell(1, 2), '1': cell(3, 3), '2': cell(5, 4), '3': cell(3, 3) };
  G.order = ['0', '1', '2', '3'];
  G.home = { '0': 0, '1': 6, '2': 48, '3': 42 };
  G.current = ME; G.step = 'shift'; G.turn = 14; G.lastAt = 7;
  return G;
}

export function KgScenes() {
  const q = new URLSearchParams(window.location.search);
  useMemo(() => { if (q.get('flat') !== null) setFlat(q.get('flat') === '1'); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const G = useRef<KState>(fixture());
  const [view, setView] = useState(() => viewFor(G.current, ME));
  const [msg, setMsg] = useState('');
  const sync = () => setView(viewFor(G.current, ME));
  const run = (f: (g: KState) => string | undefined | void) => { const e = f(G.current); setMsg(e || ''); sync(); };
  const turnTo = (g: KState, p: string, step: 'shift' | 'move') => { g.current = p; g.step = step; g.result = null; };
  const scenes: [string, (g: KState) => string | undefined | void][] = [
    ['Push the maze', (g) => { turnTo(g, ME, 'shift'); g.lastAt = null; return act(g, ME, { k: 'shift', at: 4, rot: 1 }); }],
    ['Push with a wrap', (g) => { turnTo(g, ME, 'shift'); g.lastAt = null; g.pos['1'] = lineCells(0)[6]; return act(g, ME, { k: 'shift', at: 0, rot: 0 }); }],
    ['Walk', (g) => {
      turnTo(g, ME, 'move');
      const d = distances(g.board, g.pos[ME]);
      const far = [...d.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return act(g, ME, { k: 'move', to: far });
    }],
    ['Find a treasure', (g) => {
      turnTo(g, ME, 'move');
      const t = g.stacks[ME][0] as TreasureId;
      const d = [...distances(g.board, g.pos[ME]).keys()].filter((c) => !g.board[c].t);
      const to = d[Math.min(d.length - 1, 3)];
      g.board = g.board.map((x, i) => (x.t === t ? { id: x.id, m: x.m } : i === to ? { ...x, t } : x));
      return act(g, ME, { k: 'move', to });
    }],
    ['Head home (last treasure)', (g) => {
      turnTo(g, ME, 'move');
      g.stacks[ME] = g.stacks[ME].slice(0, 1);
      const t = g.stacks[ME][0];
      const d = [...distances(g.board, g.pos[ME]).keys()].filter((c) => !g.board[c].t && c !== g.home[ME] && c !== g.pos[ME]);
      const to = d[Math.min(d.length - 1, 2)];
      g.board = g.board.map((x, i) => (x.t === t ? { id: x.id, m: x.m } : i === to ? { ...x, t } : x));
      return act(g, ME, { k: 'move', to });
    }],
    ['Turn change', (g) => { turnTo(g, ME, 'move'); return act(g, ME, { k: 'move', to: g.pos[ME] }); }],
    ['A hero bows out', (g) => { if (g.out.includes('3')) return 'already gone'; return resign(g, '3'); }],
    ['Win at home', (g) => { turnTo(g, '2', 'move'); g.stacks['2'] = []; g.pos['2'] = g.home['2']; return act(g, '2', { k: 'move', to: g.home['2'] }); }],
    ['Reset', (g) => { Object.assign(g, fixture()); }],
  ];
  const only = q.get('board') === 'mid';
  const send = (a: Action) => run((g) => act(g, g.current, a));
  const tod = q.get('tod');
  const shown = useMemo(() => {
    if (!tod) return view;
    if (tod === 'night') return { ...view, result: view.result ?? { winner: '2', reason: 'home' as const } };
    return view;
  }, [view, tod]);
  return (
    <>
      <KgScreen view={shown} me={ME} names={{ '0': 'Ana', '1': 'Ben', '2': 'Cleo', '3': 'Dev' }} kind="bot" send={send} resign={() => {}} onExit={() => setMsg('exit')} />
      {!only && (
        <nav className="kg-scenebar" aria-label="Scenes" data-testid="kg-scenebar">
          {scenes.map(([name, f]) => <button key={name} type="button" className="kg-btn kg-btn-sm" onClick={() => run(f)}>{name}</button>)}
          {msg && <span className="kg-err">{msg}</span>}
          <span className="kg-scene-where">{cellOf(view, (view.targets[ME][0] ?? 'harp') as TreasureId)}</span>
        </nav>
      )}
    </>
  );
}
