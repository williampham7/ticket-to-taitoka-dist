import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { QRCodeSVG } from 'qrcode.react';
import { LAND_PATHS, MAP_H, MAP_W, WarfrontGame, project, type Action, type WarBotLevel } from '@boboland/shared/src/warfront';
import { joinedSeats } from '@boboland/shared/src/lobbyRules';
import type { BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { WarScreen, type WarClientView } from './WarScreen';
import { FACTIONS } from './factions';
import { BOT_TITLE } from './setup';
import { WarDefs } from './Units';
import './room.css';
import {
  addBot, enterBattle, hostRoom, joinRoom, leaveRoom, matchNames, nextRoom, rejoinRoom, removeBot, renameSeat, roomInfo, roomUrl, savedSeat,
  setColor, setSettings, startBattle, type RoomInfo, type WarSeat,
} from './lobby';

const myName = (n?: string) => n?.trim() || 'General';

export function WarHost() {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => { hostRoom(myName(party.name)).then((s) => navigate(`/warfront/wait/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Opening the war room" text={err || 'Securing a line'} error={!!err} />;
}

export function WarJoin({ matchID }: { matchID: string }) {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => {
    if (savedSeat(matchID)) { navigate(`/warfront/wait/${matchID}`, true); return; }
    joinRoom(matchID, myName(party.name)).then(() => navigate(`/warfront/wait/${matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [matchID]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Joining the war room" text={err || 'Presenting credentials'} error={!!err} />;
}

/** A field radio raising the line: dial sweeping, signal bars pulsing, static. */
function Shell({ title, text, error }: { title: string; text: string; error?: boolean }) {
  return (
    <div className="warfront wf-desk-page wf-shellpage">
      <div className={`wf-radio${error ? ' wf-radio-err' : ''}`} role="status" aria-live="polite">
        <svg viewBox="0 0 320 150" className="wf-radio-set" aria-hidden>
          <RoomDefs />
          <rect x="6" y="14" width="308" height="128" rx="12" fill="url(#wf-rm-olive)" stroke="#141a10" strokeWidth="3" />
          <rect x="16" y="24" width="288" height="108" rx="8" fill="none" stroke="#5c6a4a" strokeDasharray="2 4" />
          {[[18, 26], [302, 26], [18, 130], [302, 130]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" fill="url(#wf-brass)" stroke="#3b2a08" />)}
          <path d="M40,14 L40,0" stroke="#1d2417" strokeWidth="4" strokeLinecap="round" />
          <rect x="30" y="40" width="150" height="56" rx="6" fill="#1b2414" stroke="#0b0f08" strokeWidth="2" />
          <g className="wf-radio-scope">
            <path d="M34,68 Q48,52 62,68 T90,68 T118,68 T146,68 T174,68" fill="none" stroke="#9cf07a" strokeWidth="2" />
          </g>
          <rect x="30" y="40" width="150" height="56" rx="6" fill="url(#wf-rm-glass)" />
          {Array.from({ length: 5 }, (_, i) => <rect key={i} className="wf-radio-bar" style={{ ['--i' as string]: i }} x={200 + i * 11} y={92 - i * 9} width="7" height={8 + i * 9} rx="1.5" fill="#f2c14e" />)}
          <g transform="translate(78,116)">
            <rect x="-48" y="-7" width="96" height="14" rx="3" fill="#e9e3cf" stroke="#3b3a2c" />
            {Array.from({ length: 13 }, (_, i) => <line key={i} x1={-42 + i * 7} x2={-42 + i * 7} y1="-5" y2={i % 3 ? -1 : 2} stroke="#2b2116" strokeWidth=".9" />)}
            <rect className="wf-radio-needle" x="-1" y="-7" width="2" height="14" fill="#c62f2f" />
          </g>
          {[[262, 112, 15], [214, 118, 10]].map(([x, y, r], i) => (
            <g key={i} transform={`translate(${x},${y})`}>
              <circle r={r} fill="#1d2016" stroke="#0b0f08" strokeWidth="2" />
              <g className={i ? 'wf-radio-knob wf-radio-knob2' : 'wf-radio-knob'}><circle r={r - 4} fill="url(#wf-rm-knob)" /><rect x="-1.2" y={-(r - 4)} width="2.4" height={r - 7} fill="#f6dc93" /></g>
            </g>
          ))}
          <circle cx="292" cy="44" r="5" className="wf-radio-lamp" fill={error ? '#c62f2f' : '#f2c14e'} />
        </svg>
        <span className="wf-stencil-sm">Field radio · Channel {error ? 'lost' : 'open'}</span>
        <h1>{title}</h1>
        <p className={error ? 'wf-err' : undefined}>{error ? <>The line went dead. <small>({text})</small></> : <>{text}<span className="wf-dots" /></>}</p>
        <button type="button" className="wf-btn" onClick={() => navigate('/warfront')}>‹ Back to the desk</button>
      </div>
    </div>
  );
}

/** Gradients the war room's drawings share (the faction and brass ones come from WarDefs). */
function RoomDefs() {
  return (
    <defs>
      <linearGradient id="wf-rm-olive" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#56623f" /><stop offset="1" stopColor="#2c3420" /></linearGradient>
      <linearGradient id="wf-rm-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <radialGradient id="wf-rm-knob" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#7a7f70" /><stop offset="1" stopColor="#23261d" /></radialGradient>
    </defs>
  );
}

const OP_A = ['Iron', 'Silent', 'Granite', 'Midnight', 'Crimson', 'Northern', 'Thunder', 'Copper', 'Steel', 'Amber', 'Winter', 'Distant'];
const OP_B = ['Tide', 'Anvil', 'Lance', 'Harvest', 'Meridian', 'Gambit', 'Sentinel', 'Horizon', 'Rampart', 'Falcon', 'Compass', 'Bastion'];
const opName = (id: string) => {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `Operation ${OP_A[h % OP_A.length]} ${OP_B[(h >>> 8) % OP_B.length]}`;
};
/** Where each seat's headquarters pin sits on the theatre preview. */
const HQ: [number, number][] = [[-100, 44], [12, 49], [98, 36], [-58, -14], [22, 2], [134, -25]];

function Emblem({ color, path, size = 34 }: { color: string; path: string; size?: number }) {
  return (
    <svg viewBox="-12 -12 24 24" width={size} height={size} className="wf-rm-emblem" aria-hidden>
      <circle r="11" fill={color} stroke="#fff8e2" strokeWidth="1.6" />
      <circle r="11" fill="none" stroke="#2b2116" strokeOpacity=".5" strokeWidth=".6" />
      <path d={path} fill="#fff" stroke="#fff" strokeWidth=".5" transform="scale(.95)" />
    </svg>
  );
}

/** Rank insignia: one chevron (Cadet), three chevrons (Colonel), a wreathed star (Field Marshal), a star (host), a bar (general). */
function Insignia({ rank }: { rank: WarBotLevel | 'host' | 'general' }) {
  return (
    <svg viewBox="-12 -12 24 24" className="wf-rm-insignia" aria-hidden>
      <circle r="11.4" fill="url(#wf-brass)" stroke="#4d3510" />
      {rank === 'easy' && <path d="M-6,-1 L0,4 L6,-1" fill="none" stroke="#3b2606" strokeWidth="2.6" strokeLinejoin="round" />}
      {rank === 'medium' && [-5, 0, 5].map((y) => <path key={y} d={`M-6,${y - 2} L0,${y + 2} L6,${y - 2}`} fill="none" stroke="#3b2606" strokeWidth="2" strokeLinejoin="round" />)}
      {rank === 'hard' && <>
        <path d="M-7,5 Q-9,-2 -4,-8 M7,5 Q9,-2 4,-8" fill="none" stroke="#3b2606" strokeWidth="1.6" strokeDasharray="1.6 1.2" />
        <path d="M0,-6 L1.8,-1.6 L6.2,-1.6 L2.7,1.2 L4,5.6 L0,3 L-4,5.6 L-2.7,1.2 L-6.2,-1.6 L-1.8,-1.6Z" fill="#3b2606" />
      </>}
      {rank === 'host' && <path d="M0,-7 L2.1,-2.2 L7,-2.2 L3.1,1.1 L4.5,6.4 L0,3.4 L-4.5,6.4 L-3.1,1.1 L-7,-2.2 L-2.1,-2.2Z" fill="#3b2606" />}
      {rank === 'general' && <rect x="-6" y="-2" width="12" height="4" rx="1" fill="#3b2606" />}
    </svg>
  );
}

const RULES = {
  domination: { title: 'World Domination', text: 'Conquer every territory on the map to win.' },
  mission: { title: 'Secret Mission', text: 'Each general draws a secret objective. First to complete it wins.' },
  deal: { title: 'Deal territories', text: 'Territories are dealt out at random; you start by placing armies.' },
  claim: { title: 'Claim one by one', text: 'Generals take turns picking territories before the armies go down.' },
};

export function WarWait({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(seat?.name ?? '');
  useEffect(() => { if (!seat) navigate(`/warfront/join/${matchID}`, true); }, [seat, matchID]);
  useEffect(() => {
    let alive = true;
    const poll = () => roomInfo(matchID).then((i) => alive && setInfo(i)).catch(() => {});
    poll();
    const t = setInterval(poll, 1000);
    roomUrl(matchID).then(setUrl);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);
  useEffect(() => {
    if (!seat || !info?.nextMatchID) return;
    enterBattle(seat, info).then((s) => navigate(`/warfront/play/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [info?.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1800); return () => clearTimeout(t); }, [copied]);
  if (!seat || !info) return <Shell title="War room" text="Connecting" />;
  const host = seat.playerID === '0';
  const joined = joinedSeats(info.seats);
  const taken = new Set(joined.map((s) => s.color));
  const run = (p: Promise<unknown>) => p.catch((e) => setErr(String(e.message ?? e)));
  const two = joined.length === 2;
  const mode = info.settings.mode === 'mission' && !two ? 'mission' : 'domination';
  const setMode = (m: 'domination' | 'mission') => host && run(setSettings(seat, { ...info.settings, mode: m }));
  const setDeal = (d: boolean) => host && run(setSettings(seat, { ...info.settings, autoDeploy: d }));
  const copy = () => { void navigator.clipboard?.writeText(url); setCopied(true); };
  const option = (key: keyof typeof RULES, on: boolean, pick: () => void, opts: { disabled?: boolean; note?: string; icon: React.ReactNode }) => (
    <label className={`wf-rm-opt${on ? ' wf-rm-opt-on' : ''}${!host || opts.disabled ? ' wf-rm-opt-locked' : ''}`}>
      <input type="radio" checked={on} disabled={!host || opts.disabled} onChange={pick} />
      <span className="wf-rm-opt-icon" aria-hidden>{opts.icon}</span>
      <span className="wf-rm-opt-text"><b>{RULES[key].title}</b><small>{RULES[key].text}</small>{opts.note && <em>{opts.note}</em>}</span>
    </label>
  );
  return (
    <div className="warfront wf-desk-page wf-roompage">
      <svg className="wf-rm-defs" aria-hidden focusable="false"><WarDefs /><RoomDefs /></svg>
      <header className="wf-rm-head">
        <button type="button" className="wf-btn wf-btn-ghost wf-rm-leave" onClick={() => run(leaveRoom(seat).then(() => navigate('/warfront')))} data-testid="wf-room-leave">‹ Leave</button>
        <div className="wf-rm-plate">
          <span className="wf-rm-rivet" /><span className="wf-rm-rivet" />
          <h1>War Room</h1>
          <small>{opName(matchID)}</small>
        </div>
        <div className="wf-rm-count" aria-label={`${joined.length} of 6 generals present`}>
          <span className="wf-rm-lamps">{info.seats.slice(0, 6).map((s) => <i key={s.id} className={s.name ? 'wf-on' : ''} style={s.name && s.color !== undefined ? { ['--fc' as string]: FACTIONS[s.color].color } : undefined} />)}</span>
          <span><b>{joined.length}</b> of 6 generals present</span>
        </div>
      </header>

      <div className="wf-rm-grid">
        <section className="wf-rm-roster" aria-label="Order of battle">
          <h2 className="wf-rm-h">Order of battle</h2>
          <ol className="wf-roster wf-rm-list">
            {info.seats.map((s, i) => {
              const mine = String(s.id) === seat.playerID;
              const f = s.color !== undefined ? FACTIONS[s.color] : null;
              const rank = s.bot ?? (s.id === 0 ? 'host' : 'general');
              return (
                <li key={s.id} className={`wf-roster-row wf-rm-seat${s.name ? '' : ' wf-open'}${mine ? ' wf-rm-mine' : ''}`} style={{ ['--fc' as string]: f?.color ?? '#bdb39c', ['--fd' as string]: f?.deep ?? '#7d7462', ['--i' as string]: i }} data-testid={`wf-seat-${s.id}`}>
                  <span className="wf-roster-flag wf-rm-flag">{f ? <Emblem color={f.color} path={f.emblem} /> : <span className="wf-rm-no">{i + 1}</span>}</span>
                  {s.name ? (
                    <div className="wf-rm-body">
                      <div className="wf-rm-line">
                        <Insignia rank={rank} />
                        {mine ? (
                          <input value={name} maxLength={24} aria-label="Your name" onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== seat.name && run(renameSeat(seat, name.trim()))} />
                        ) : <b>{s.name}</b>}
                        <span className={`wf-rm-stamp${s.bot ? ' wf-rm-stamp-bot' : ''}`}>{s.bot ? 'Standing by' : mine ? 'You' : 'Present'}</span>
                        {host && s.bot && <button type="button" className="wf-x" aria-label="Remove computer general" onClick={() => run(removeBot(seat, s.id))}>×</button>}
                      </div>
                      <small className="wf-rm-role">{s.bot ? `Computer · ${BOT_TITLE[s.bot]}` : s.id === 0 ? 'Host' : 'General'}{f ? ` · ${f.name}` : ''}</small>
                      {mine && (
                        <span className="wf-swatches wf-rm-swatches" role="group" aria-label="Your faction">
                          {FACTIONS.map((ff, k) => (
                            <button key={k} type="button" style={{ background: ff.color }} aria-label={ff.name} title={ff.name} aria-pressed={s.color === k} disabled={taken.has(k) && s.color !== k} onClick={() => run(setColor(seat, k))}>
                              <svg viewBox="-9 -9 18 18" aria-hidden><path d={ff.emblem} fill="#fff" stroke="#fff" strokeWidth=".6" /></svg>
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="wf-rm-body wf-rm-empty">
                      <svg viewBox="0 0 40 40" className="wf-rm-chair" aria-hidden><path d="M11,6 H29 V20 H11Z M9,21 H31 V25 H9Z M11,25 V36 M29,25 V36 M13,20 V6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" /></svg>
                      <div className="wf-rm-empty-text"><b>Open seat</b><small>{host ? 'Waiting for a general, or call in the computer:' : 'Waiting for a general…'}</small></div>
                      {host && (
                        <span className="wf-row wf-rm-bots">
                          {(['easy', 'medium', 'hard'] as WarBotLevel[]).map((l) => (
                            <button key={l} type="button" className="wf-btn wf-btn-sm wf-rm-bot" onClick={() => run(addBot(seat, l))} data-testid={`wf-addbot-${l}`}><Insignia rank={l} />+ {BOT_TITLE[l]}</button>
                          ))}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="wf-rm-side">
          <figure className="wf-rm-theatre">
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
              <rect width={MAP_W} height={MAP_H} fill="#1d6276" />
              <g stroke="#9fd6d6" strokeOpacity=".22" strokeWidth="2">
                {Array.from({ length: 15 }, (_, k) => <line key={`v${k}`} x1={(k + 1) * 100} x2={(k + 1) * 100} y1="0" y2={MAP_H} />)}
                {Array.from({ length: 7 }, (_, k) => <line key={`h${k}`} y1={(k + 1) * 100} y2={(k + 1) * 100} x1="0" x2={MAP_W} />)}
              </g>
              {LAND_PATHS.map((d, k) => <path key={k} d={d} fill="#d9c995" stroke="#5b4a2a" strokeWidth="2.4" />)}
              {info.seats.map((s, k) => {
                if (!s.name || s.color === undefined || !HQ[k]) return null;
                const [x, y] = project(...HQ[k]);
                const f = FACTIONS[s.color];
                return (
                  <g key={s.id} transform={`translate(${x},${y})`} className="wf-rm-pin" style={{ ['--i' as string]: k }}>
                    <circle className="wf-rm-ping" r="30" fill="none" stroke={f.color} strokeWidth="6" />
                    <line y2="-64" stroke="#2b1a05" strokeWidth="6" />
                    <path d="M0,-64 L46,-52 L0,-40Z" fill={f.color} stroke="#2b1a05" strokeWidth="3" />
                    <circle r="13" fill={f.color} stroke="#fff8e2" strokeWidth="5" />
                  </g>
                );
              })}
            </svg>
            <figcaption><b>Theatre of operations</b><span>42 territories · 6 continents</span></figcaption>
          </figure>

          <div className="wf-rm-telegram">
            <div className="wf-rm-tg-head"><span>Telegram</span><small>Priority · urgent</small></div>
            <div className="wf-rm-tg-body">
              {url && <span className="wf-rm-qr"><QRCodeSVG value={url} size={100} bgColor="#fbf2d4" fgColor="#2b2116" /></span>}
              <div className="wf-rm-tg-text">
                <p>ALL GENERALS REPORT TO THE WAR ROOM <i>STOP</i> SCAN OR FOLLOW THE LINE BELOW <i>STOP</i></p>
                <code data-testid="wf-room-url">{url}</code>
                <button type="button" className={`wf-btn wf-btn-sm wf-rm-copy${copied ? ' wf-rm-copied' : ''}`} onClick={copy} disabled={!url}>{copied ? '✓ Copied' : 'Copy link'}</button>
              </div>
            </div>
          </div>

          <div className="wf-rm-rules" role="group" aria-label="Rules of engagement">
            <h2 className="wf-rm-h">Rules of engagement{!host && <small>Set by the host</small>}</h2>
            <div className="wf-rm-opts">
              {option('domination', mode === 'domination', () => setMode('domination'), { icon: <svg viewBox="-12 -12 24 24"><circle r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M-9,0 H9 M0,-9 Q6,0 0,9 Q-6,0 0,-9" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg> })}
              {option('mission', mode === 'mission', () => setMode('mission'), { disabled: two, note: two ? 'Needs 3 or more generals' : undefined, icon: <svg viewBox="-12 -12 24 24"><rect x="-9" y="-6" width="18" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M-9,-6 L0,2 L9,-6" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cy="3" r="2.6" fill="#c62f2f" /></svg> })}
            </div>
            <div className="wf-rm-opts">
              {option('deal', info.settings.autoDeploy, () => setDeal(true), { icon: <svg viewBox="-12 -12 24 24"><rect x="-8" y="-9" width="10" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" transform="rotate(-12)" /><rect x="-3" y="-6" width="10" height="14" rx="1.5" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth="1.8" transform="rotate(10)" /></svg> })}
              {option('claim', !info.settings.autoDeploy, () => setDeal(false), { icon: <svg viewBox="-12 -12 24 24"><path d="M-5,9 V-9" stroke="currentColor" strokeWidth="2" /><path d="M-5,-9 L8,-5 L-5,-1Z" fill="currentColor" /><ellipse cx="-5" cy="9" rx="5" ry="1.6" fill="currentColor" opacity=".5" /></svg> })}
            </div>
          </div>

          {host ? (
            <div className="wf-rm-launch">
              <button type="button" className="wf-key wf-key-red wf-rm-start" disabled={joined.length < 2} onClick={() => run(startBattle(seat, info))} data-testid="wf-start">Start the war</button>
              <p className="wf-rm-why">{joined.length < 2 ? 'Need at least 2 generals: invite a friend or add a computer general.' : `${joined.length} generals ready. Territories ${info.settings.autoDeploy ? 'are dealt at random' : 'are claimed in turn'}.`}</p>
            </div>
          ) : (
            <div className="wf-rm-await" role="status">
              <span className="wf-rm-eq" aria-hidden>{[0, 1, 2, 3, 4].map((k) => <i key={k} style={{ ['--i' as string]: k }} />)}</span>
              <span><b>Standing by</b><small>The host gives the order to begin.</small></span>
            </div>
          )}
          {err && <p className="wf-err">{err}</p>}
        </aside>
      </div>
    </div>
  );
}

function useMatch(matchID: string, seat: WarSeat | null) {
  const [meta, setMeta] = useState<{ names: Record<string, string>; nextMatchID?: string; count: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = () => matchNames(matchID).then((m) => alive && setMeta(m)).catch(() => {});
    poll();
    const t = setInterval(poll, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);
  const count = meta?.count;
  // the client needs the real number of seats (it builds a placeholder state until the server's arrives)
  const client = useMemo(() => (count ? Client({
    game: WarfrontGame, numPlayers: count, multiplayer: SocketIO({ server: window.location.origin }), matchID, debug: false,
    ...(seat ? { playerID: seat.playerID, credentials: seat.credentials } : {}),
  }) as unknown as BgioClient : null), [matchID, seat, count]);
  const [view, setView] = useState<WarClientView | null>(null);
  useEffect(() => {
    if (!client) return;
    client.start();
    const off = client.subscribe((s) => {
      const st = s as { G: WarClientView; isConnected?: boolean; _stateID?: number } | null;
      // ignore the placeholder until the server's state has arrived
      if (st && (st._stateID ?? 0) >= 0 && st.G?.players?.length === count) setView(st.G);
    });
    return () => { off(); client.stop(); };
  }, [client, count]);
  return { client, view, meta: meta ?? { names: {} as Record<string, string>, nextMatchID: undefined as string | undefined, count: 0 } };
}

export function WarPlay({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  useEffect(() => { if (!seat) navigate(`/warfront/watch/${matchID}`, true); }, [seat, matchID]);
  const { client, view, meta } = useMatch(matchID, seat);
  const over = !!view?.result;
  // after the war the host opens the next war room; everyone follows into it
  useEffect(() => {
    if (!seat || !over || !meta.nextMatchID) return;
    rejoinRoom(seat, meta.nextMatchID, view?.factions[Number(seat.playerID)]).then((s) => navigate(`/warfront/wait/${s.matchID}`)).catch(() => {});
  }, [over, meta.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!seat || !view || !client) return <Shell title="Warfront" text="Connecting to the front" />;
  const host = seat.playerID === '0';
  return (
    <WarScreen view={view} me={seat.playerID} names={meta.names} kind="online" send={(a: Action) => client.moves.act(a)} resign={() => client.moves.resign()}
      onExit={() => navigate('/warfront')}
      again={host ? { label: 'Back to the war room', onClick: () => { void nextRoom(seat); } } : { label: 'Waiting for the host…', onClick: () => {} }} />
  );
}

export function WarWatch({ matchID }: { matchID: string }) {
  const { view, meta } = useMatch(matchID, null);
  if (!view) return <Shell title="Warfront" text="Connecting to the front" />;
  return <WarScreen view={view} me={null} names={meta.names} kind="watch" send={() => {}} onExit={() => navigate('/warfront')} />;
}
