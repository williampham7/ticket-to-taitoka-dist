import { useMemo, useState } from 'react';
import { LAND_PATHS, MAP_H, MAP_W, TERRITORY_GEO } from '@boboland/shared/src/warfront';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { MusicButton } from '../lib/AudioButtons';
import { FACTIONS } from './factions';
import { Manual } from './Manual';
import { KIND_LABEL, encodeCfg, lastCfg, rememberCfg, type LocalCfg, type SeatKind } from './setup';
import { WarDefs } from './Units';

/** The start menu: an overhead general's desk. The map plans a battle, the phone opens an online war room, the binder is the Field Manual. */
export function WarMenu() {
  const party = usePartyState();
  const [muster, setMuster] = useState(false);
  const [manual, setManual] = useState(false);
  const act = (f: () => void) => ({ onClick: f, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }, role: 'button', tabIndex: 0 });
  return (
    <div className="warfront wf-desk-page" data-testid="wf-menu">
      <header className="wf-menu-head">
        <div className="wf-row wf-menu-tools"><button type="button" className="wf-btn wf-btn-ghost" onClick={() => navigate('/')}>‹ All games</button><MusicButton className="wf-tool" /></div>
        <div className="wf-title"><h1>WARFRONT</h1><p>The General's War Table · 2-6 players</p></div>
        <span className="wf-menu-spacer" aria-hidden />
      </header>
      <div className="wf-desk">
        <svg viewBox="0 0 1200 680" className="wf-desk-svg" aria-label="The general's desk">
          <WarDefs />
          <defs>
            <linearGradient id="wf-paperg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5ecd2" /><stop offset="1" stopColor="#e3d3a9" /></linearGradient>
            <linearGradient id="wf-leather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6b3a1f" /><stop offset="1" stopColor="#3e1f0f" /></linearGradient>
            <linearGradient id="wf-bake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b3f36" /><stop offset="1" stopColor="#1f221d" /></linearGradient>
          </defs>
          {/* the operations map */}
          <g className="wf-obj wf-obj-map" {...act(() => setMuster(true))} aria-label="Plan a battle on this device" data-testid="wf-plan">
            <g transform="translate(300,120) rotate(-2)">
              <rect x="-8" y="-8" width="616" height="320" fill="#000" opacity=".25" filter="url(#wf-lift)" />
              <rect width="600" height="304" fill="url(#wf-paperg)" stroke="#b9a476" />
              <g transform={`translate(12,14) scale(${576 / MAP_W})`}>
                <rect width={MAP_W} height={MAP_H} fill="#cfe0d8" opacity=".75" />
                {LAND_PATHS.map((d, i) => <path key={i} d={d} fill="#c8b98a" stroke="#6d5a33" strokeWidth="2" />)}
                <MenuFront />
              </g>
              {[[6, 6], [594, 6], [6, 298], [594, 298]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill="url(#wf-brass)" stroke="#4d3510" />)}
              <text x="300" y="296" textAnchor="middle" className="wf-desk-cap">OPERATIONS MAP · CLASSIFIED</text>
            </g>
            <Tag x={600} y={448} text="Plan a battle" sub="vs Computer · Pass and play" />
          </g>
          {/* field phone */}
          <g className="wf-obj wf-obj-phone" {...act(() => navigate('/warfront/host'))} aria-label="Open an online war room" data-testid="wf-online">
            <g transform="translate(1000,300)">
              <ellipse cx="0" cy="92" rx="92" ry="16" fill="#000" opacity=".3" />
              <rect x="-80" y="-10" width="160" height="100" rx="12" fill="url(#wf-bake)" stroke="#11130f" strokeWidth="2" />
              <rect x="-68" y="2" width="136" height="76" rx="8" fill="none" stroke="#5c6152" />
              <circle cx="0" cy="40" r="28" fill="#2a2d26" stroke="#8b8e80" strokeWidth="2" />
              {Array.from({ length: 10 }, (_, i) => <circle key={i} cx={Math.cos(i * 0.55 - 2.4) * 19} cy={40 + Math.sin(i * 0.55 - 2.4) * 19} r="3.4" fill="#e9e3cf" />)}
              <path d="M-74,-14 Q-82,-52 -40,-58 L40,-58 Q82,-52 74,-14 L56,-14 Q58,-36 36,-38 L-36,-38 Q-58,-36 -56,-14Z" fill="url(#wf-bake)" stroke="#11130f" strokeWidth="2" className="wf-handset" />
              <path d="M74,40 C120,40 110,110 60,120 C20,128 -20,120 -60,124" fill="none" stroke="#1b1d18" strokeWidth="4" strokeDasharray="1 5" strokeLinecap="round" />
              <circle cx="58" cy="-2" r="6" fill="#c8323c" className="wf-phone-lamp" />
            </g>
            <Tag x={1000} y={470} text="Online war room" sub="Invite up to 5 generals" />
          </g>
          {/* binder */}
          <g className="wf-obj wf-obj-binder" {...act(() => setManual(true))} aria-label="Read the Field Manual" data-testid="wf-manual">
            <g transform="translate(150,440) rotate(-8)">
              <rect x="-6" y="6" width="190" height="150" rx="6" fill="#000" opacity=".3" />
              <rect width="180" height="146" rx="6" fill="#33462f" stroke="#1a2418" strokeWidth="2" />
              <rect x="0" width="22" height="146" rx="4" fill="#26361f" />
              {[30, 60, 90].map((y, i) => <rect key={y} x="178" y={y} width="16" height="22" rx="3" fill={['#c8323c', '#e2a01a', '#2f63d6'][i]} />)}
              <rect x="44" y="34" width="112" height="62" fill="#e9e3cf" stroke="#1a2418" />
              <text x="100" y="60" textAnchor="middle" className="wf-desk-stencil">FIELD</text>
              <text x="100" y="84" textAnchor="middle" className="wf-desk-stencil">MANUAL</text>
            </g>
            <Tag x={235} y={640} text="Field Manual" sub="Rules and controls" />
          </g>
          {/* lamp */}
          <g aria-hidden pointerEvents="none">
            <ellipse cx="110" cy="120" rx="70" ry="22" fill="#000" opacity=".3" />
            <ellipse cx="110" cy="112" rx="60" ry="18" fill="url(#wf-brass)" stroke="#4d3510" />
            <path d="M110,108 L160,30 L230,70" fill="none" stroke="#6f5a32" strokeWidth="9" strokeLinecap="round" />
            <path d="M206,52 L280,36 L298,108 L222,122Z" fill="#2f5a3a" stroke="#14261a" strokeWidth="2" />
            <ellipse cx="260" cy="115" rx="40" ry="8" fill="#fff3c2" opacity=".9" />
          </g>
          {/* cap, medals, coffee, clock */}
          <g aria-hidden pointerEvents="none">
            <g transform="translate(1030,110) rotate(12)">
              <ellipse cx="0" cy="30" rx="88" ry="22" fill="#000" opacity=".3" />
              <ellipse cx="0" cy="18" rx="84" ry="40" fill="#3e4a32" stroke="#1d2418" strokeWidth="2" />
              <path d="M-60,18 Q0,72 60,18 Q0,48 -60,18Z" fill="#14140f" />
              <ellipse cx="0" cy="14" rx="52" ry="22" fill="#4a5a3b" />
              <path d="M-40,10 Q0,-6 40,10" stroke="url(#wf-brass)" strokeWidth="5" fill="none" />
              <path d={FACTIONS[0].emblem} transform="translate(0,-2) scale(1.4)" fill="url(#wf-brass)" />
            </g>
            <g transform="translate(860,560)">
              {[0, 1, 2].map((i) => (
                <g key={i} transform={`translate(${i * 46},${i % 2 ? 8 : 0}) rotate(${i * 6 - 6})`}>
                  <path d="M-11,-34 L11,-34 L6,-4 L-6,-4Z" fill={[FACTIONS[1].color, FACTIONS[0].color, FACTIONS[3].color][i]} stroke="#2a1d0c" />
                  <circle cy="12" r="16" fill="url(#wf-brass)" stroke="#4d3510" />
                  <path d={FACTIONS[i * 2].emblem} transform="translate(0,12) scale(1.1)" fill="#5d4214" />
                </g>
              ))}
            </g>
            <g transform="translate(470,560)">
              <ellipse cx="0" cy="40" rx="46" ry="14" fill="#000" opacity=".3" />
              <circle r="40" fill="#e9e3cf" stroke="#9c8f6e" strokeWidth="3" />
              <circle r="31" fill="#3a2414" />
              <circle r="31" fill="none" stroke="#5b3a20" strokeWidth="3" />
              <path d="M38,-6 Q66,-4 60,18 Q56,30 34,20" fill="none" stroke="#e9e3cf" strokeWidth="8" />
              {[0, 1, 2].map((i) => <path key={i} className={`wf-steam wf-steam-${i}`} d={`M${i * 12 - 12},-20 q-10,-16 0,-30 q10,-14 0,-30`} fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />)}
            </g>
            <g transform="translate(700,580)">
              <ellipse cx="0" cy="44" rx="50" ry="12" fill="#000" opacity=".3" />
              <circle r="46" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth="2" />
              <circle r="38" fill="#fbf4df" />
              {Array.from({ length: 12 }, (_, i) => <line key={i} x1="0" y1="-34" x2="0" y2={i % 3 ? -30 : -26} stroke="#2b2116" strokeWidth={i % 3 ? 1.4 : 2.6} transform={`rotate(${i * 30})`} />)}
              <line x1="0" y1="4" x2="0" y2="-20" stroke="#2b2116" strokeWidth="3.4" strokeLinecap="round" transform="rotate(-50)" />
              <line x1="0" y1="4" x2="0" y2="-28" stroke="#2b2116" strokeWidth="2.2" strokeLinecap="round" transform="rotate(64)" />
              <line x1="0" y1="8" x2="0" y2="-32" stroke="#c8323c" strokeWidth="1.2" className="wf-second" />
              <circle r="3" fill="#c8323c" />
            </g>
          </g>
        </svg>
      </div>
      {muster && <Muster onClose={() => setMuster(false)} name={party.name?.trim() || 'You'} />}
      {manual && <Manual onClose={() => setManual(false)} />}
    </div>
  );
}

function Tag({ x, y, text, sub }: { x: number; y: number; text: string; sub: string }) {
  return (
    <g transform={`translate(${x},${y})`} className="wf-tag">
      <rect x="-110" y="-22" width="220" height="46" rx="4" fill="url(#wf-brass)" stroke="#4d3510" />
      <circle cx="-100" cy="0" r="3" fill="#4d3510" />
      <text textAnchor="middle" y="-2" className="wf-tag-text">{text}</text>
      <text textAnchor="middle" y="14" className="wf-tag-sub">{sub}</text>
    </g>
  );
}

/** Grease-pencil fronts on the menu map. */
function MenuFront() {
  const arrows: [string, string, number][] = [['WEU', 'MAG', 0], ['CHN', 'SEA', 1], ['PLN', 'GUL', 3], ['EEU', 'URL', 4], ['CAP', 'MAD', 2]];
  return (
    <g filter="url(#wf-pencil)">
      {arrows.map(([a, b, f]) => {
        const p = TERRITORY_GEO[a], q = TERRITORY_GEO[b];
        return <g key={a}><path d={`M${p.x},${p.y} Q${(p.x + q.x) / 2 + 30},${(p.y + q.y) / 2 - 40} ${q.x},${q.y}`} fill="none" stroke={FACTIONS[f].color} strokeWidth="9" strokeLinecap="round" className="wf-menu-arrow" />
          <circle cx={p.x} cy={p.y} r="12" fill={FACTIONS[f].color} stroke="#fff" strokeWidth="3" /></g>;
      })}
    </g>
  );
}

/** Muster the armies: seats (human or computer), names, factions, mode and deployment. */
function Muster({ onClose, name }: { onClose: () => void; name: string }) {
  const [cfg, setCfg] = useState<LocalCfg>(() => lastCfg(name));
  const humans = cfg.seats.filter((s) => s.kind === 'human').length;
  const used = useMemo(() => new Set(cfg.seats.map((s) => s.faction)), [cfg.seats]);
  const set = (i: number, patch: Partial<LocalCfg['seats'][number]>) => setCfg((c) => ({ ...c, seats: c.seats.map((s, k) => (k === i ? { ...s, ...patch } : s)) }));
  const add = () => setCfg((c) => {
    const faction = [0, 1, 2, 3, 4, 5].find((f) => !c.seats.some((s) => s.faction === f))!;
    return { ...c, seats: [...c.seats, { kind: 'medium', name: `Colonel ${c.seats.length}`, faction }] };
  });
  const launch = () => {
    const c = { ...cfg, mode: cfg.seats.length === 2 ? 'domination' as const : cfg.mode };
    rememberCfg(c);
    navigate(`/warfront/${humans > 1 ? 'local' : 'bot'}?s=${encodeCfg(c)}`);
  };
  return (
    <div className="wf-modal" role="dialog" aria-label="Muster the armies" onClick={onClose}>
      <div className="wf-sheet wf-muster" onClick={(e) => e.stopPropagation()}>
        <header className="wf-sheet-head"><span className="wf-stencil">OPERATION ORDER</span><small>Muster the armies</small><button type="button" className="wf-x" onClick={onClose} aria-label="Close">×</button></header>
        <ol className="wf-roster">
          {cfg.seats.map((s, i) => (
            <li key={i} className="wf-roster-row" style={{ ['--fc' as string]: FACTIONS[s.faction].color }} data-testid={`wf-muster-${i}`}>
              <span className="wf-roster-flag" />
              <input value={s.name} maxLength={24} aria-label={`General ${i + 1} name`} onChange={(e) => set(i, { name: e.target.value })} />
              <select value={s.kind} aria-label={`General ${i + 1} commander`} onChange={(e) => {
                const kind = e.target.value as SeatKind;
                set(i, { kind, ...(kind !== 'human' && s.kind === 'human' ? { name: KIND_LABEL[kind].split(' ')[0] } : {}) });
              }}>
                {(Object.keys(KIND_LABEL) as SeatKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
              <span className="wf-swatches" role="group" aria-label="Faction">
                {FACTIONS.map((f, k) => <button key={k} type="button" style={{ background: f.color }} aria-label={f.name} aria-pressed={s.faction === k} disabled={used.has(k) && s.faction !== k} onClick={() => set(i, { faction: k })} />)}
              </span>
              <button type="button" className="wf-x" aria-label="Remove" disabled={cfg.seats.length <= 2 || (s.kind === 'human' && humans === 1)} onClick={() => setCfg((c) => ({ ...c, seats: c.seats.filter((_, k) => k !== i) }))}>×</button>
            </li>
          ))}
        </ol>
        <button type="button" className="wf-btn" onClick={add} disabled={cfg.seats.length >= 6} data-testid="wf-add-seat">+ Add a general</button>
        <div className="wf-settings wf-settings-row">
          <label className="wf-opt"><input type="radio" checked={cfg.mode === 'domination' || cfg.seats.length === 2} onChange={() => setCfg({ ...cfg, mode: 'domination' })} /> World Domination</label>
          <label className="wf-opt"><input type="radio" disabled={cfg.seats.length === 2} checked={cfg.mode === 'mission' && cfg.seats.length > 2} onChange={() => setCfg({ ...cfg, mode: 'mission' })} /> Secret Mission</label>
          <label className="wf-opt"><input type="checkbox" checked={cfg.autoDeploy} onChange={(e) => setCfg({ ...cfg, autoDeploy: e.target.checked })} /> Deal territories at random</label>
        </div>
        <p className="wf-hint">{humans > 1 ? `Pass and play: ${humans} generals share this device; a map case hides each turn.` : 'You against the computer.'} Two generals fight with a neutral army on the map.</p>
        <button type="button" className="wf-key" onClick={launch} data-testid="wf-launch">Launch the operation</button>
      </div>
    </div>
  );
}
