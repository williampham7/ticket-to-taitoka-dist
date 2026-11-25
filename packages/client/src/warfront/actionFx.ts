import { useEffect, useRef, useState } from 'react';
import { NEUTRAL, TERR, TERRITORY_IDS, type LogEvent, type WarView } from '@boboland/shared/src/warfront';
import { factionOf } from './factions';
import { ms } from './fx';
import { nameOf } from './text';

/**
 * Turns every change of the shared state into something visible on the table, for every general alike:
 * number pops on territories (+3, −2), arrows for attacks and marches, and a dispatch caption naming who did what.
 * Works from a diff of owners/armies plus the new log events, so setup placements (which log nothing) show too.
 */
export interface Pulse { id: number; t: string; n: number; color: string; loss: boolean; delay: number }
export interface Trail { id: number; from: string; to: string; kind: 'attack' | 'advance' | 'fortify'; color: string; n?: number; won?: boolean }
export interface Dispatch { key: number; p: string; color: string; emblem: string; title: string; detail?: string; tone: 'attack' | 'move' | 'gain' | 'info' | 'win' }
export interface ActionFx { pulses: Pulse[]; trails: Trail[]; dispatch: Dispatch | null; quake: number }

type View = WarView & { factions: number[] };
interface Snap { owner: View['owner']; armies: View['armies']; current: string; logTotal: number; stage: View['stage'] }
const snap = (v: View): Snap => ({ owner: v.owner, armies: v.armies, current: v.current, logTotal: v.logTotal, stage: v.stage });
let seq = 1;
const tn = (t: string) => TERR[t].name;
const plural = (n: number, w: string) => (n === 1 ? `1 ${w}` : `${n} ${w === 'army' ? 'armies' : `${w}s`}`);

export function useActionFx(v: View, names: Record<string, string>): ActionFx {
  const prev = useRef<Snap>(snap(v));
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [quake, setQuake] = useState(0);

  useEffect(() => {
    const P = prev.current;
    if (P.owner === v.owner && P.armies === v.armies && P.logTotal === v.logTotal) return;
    prev.current = snap(v);
    const fresh: LogEvent[] = v.log.slice(Math.max(0, v.log.length - (v.logTotal - P.logTotal)));
    const color = (p: string | null | undefined) => factionOf(v.factions, p).color;
    const who = (p: string) => nameOf(names, p);
    const newPulses: Pulse[] = [], newTrails: Trail[] = [];
    let d: Omit<Dispatch, 'key' | 'color' | 'emblem'> | null = null;
    const skip = new Set<string>();
    const diceMs = ms('dice');

    for (const e of fresh) {
      if (e.k === 'battle') {
        skip.add(e.from); skip.add(e.to);
        newTrails.push({ id: seq++, from: e.from, to: e.to, kind: 'attack', color: color(e.p), won: e.conquered });
        if (e.attLoss) newPulses.push({ id: seq++, t: e.from, n: -e.attLoss, color: '#ff4a3d', loss: true, delay: diceMs * 0.55 });
        if (e.defLoss) newPulses.push({ id: seq++, t: e.to, n: -e.defLoss, color: '#ff4a3d', loss: true, delay: diceMs * 0.55 });
        const def = e.d === NEUTRAL ? 'the neutral army' : who(e.d);
        d = {
          p: e.p, tone: e.conquered ? 'win' : 'attack',
          title: e.conquered ? `${who(e.p)} captures ${tn(e.to)}` : `${who(e.p)} attacks ${tn(e.to)}`,
          detail: `from ${tn(e.from)} against ${def} · attacker −${e.attLoss}, defender −${e.defLoss}`,
        };
        if (e.conquered) setTimeout(() => setQuake((q) => q + 1), diceMs * 0.6);
      } else if (e.k === 'move') {
        skip.add(e.from); skip.add(e.to);
        newTrails.push({ id: seq++, from: e.from, to: e.to, kind: e.fortify ? 'fortify' : 'advance', color: color(e.p), n: e.n });
        const later = fresh.some((x) => x.k === 'battle') ? diceMs * 0.8 : 0;
        newPulses.push({ id: seq++, t: e.from, n: -e.n, color: '#e9dcb5', loss: false, delay: later });
        newPulses.push({ id: seq++, t: e.to, n: e.n, color: color(e.p), loss: false, delay: later + 250 });
        if (!d || d.tone !== 'win') d = { p: e.p, tone: 'move', title: e.fortify ? `${who(e.p)} fortifies ${tn(e.to)}` : `${plural(e.n, 'army')} march into ${tn(e.to)}`, detail: e.fortify ? `${plural(e.n, 'army')} moved from ${tn(e.from)}` : `${who(e.p)} occupies the captured ground` };
      } else if (e.k === 'trade') {
        d = { p: e.p, tone: 'gain', title: `${who(e.p)} trades intel cards`, detail: `+${e.armies} armies to deploy${e.bonus ? ` · +2 on ${tn(e.bonus)}` : ''}` };
      } else if (e.k === 'resign') {
        d = { p: e.p, tone: 'info', title: `${who(e.p)} leaves the field`, detail: 'their territories turn neutral' };
      } else if (e.k === 'card' && !d) {
        d = { p: e.p, tone: 'info', title: `${who(e.p)} receives an intel card`, detail: 'for capturing a territory this turn' };
      }
    }

    // everything else (placements, deployments, trade bonuses) comes from the army diff
    const gains: [string, number][] = [];
    let claimed: string | null = null;
    for (const t of TERRITORY_IDS) {
      if (skip.has(t)) continue;
      const before = P.armies[t] ?? 0, after = v.armies[t] ?? 0;
      if (P.owner[t] === null && v.owner[t] !== null) claimed = t;
      if (after === before) continue;
      newPulses.push({ id: seq++, t, n: after - before, color: after > before ? color(v.owner[t]) : '#ff4a3d', loss: after < before, delay: 0 });
      if (after > before) gains.push([t, after - before]);
    }
    const deploy = fresh.find((e): e is Extract<LogEvent, { k: 'deploy' }> => e.k === 'deploy');
    if (deploy) {
      d = { p: deploy.p, tone: 'gain', title: `${who(deploy.p)} deploys ${plural(deploy.n, 'army')}`, detail: gains.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t, n]) => `+${n} ${tn(t)}`).join(' · ') };
    } else if (!d && claimed) {
      d = { p: P.current, tone: 'gain', title: `${who(P.current)} claims ${tn(claimed)}`, detail: 'one army moves in' };
    } else if (!d && gains.length && (P.stage === 'place' || v.stage === 'place')) {
      const total = gains.reduce((s, [, n]) => s + n, 0);
      const neutral = gains.every(([t]) => v.owner[t] === NEUTRAL);
      d = neutral
        ? { p: P.current, tone: 'gain', title: `${who(P.current)} reinforces the neutral army`, detail: gains.map(([t]) => tn(t)).join(' · ') }
        : { p: P.current, tone: 'gain', title: gains.length === 1 && total === 1 ? `${who(P.current)} places an army on ${tn(gains[0][0])}` : `${who(P.current)} places ${plural(total, 'army')}`, detail: gains.length > 1 ? `on ${gains.length} territories` : undefined };
    }

    if (newPulses.length) {
      setPulses((ps) => [...ps, ...newPulses].slice(-40));
      const life = Math.max(1400, ...newPulses.map((p) => p.delay + 1500));
      setTimeout(() => setPulses((ps) => ps.filter((p) => !newPulses.includes(p))), life);
    }
    if (newTrails.length) {
      setTrails((ts) => [...ts.filter((t) => !newTrails.some((n) => n.from === t.from && n.to === t.to)), ...newTrails].slice(-6));
      setTimeout(() => setTrails((ts) => ts.filter((t) => !newTrails.includes(t))), Math.max(1800, diceMs + 1300));
    }
    if (d) {
      const f = factionOf(v.factions, d.p);
      const full: Dispatch = { ...d, key: seq++, color: f.color, emblem: f.emblem };
      setDispatch(full);
      setTimeout(() => setDispatch((x) => (x?.key === full.key ? null : x)), Math.max(2600, diceMs + 1800));
    }
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pulses, trails, dispatch, quake };
}
