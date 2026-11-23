import { useEffect, useId, useMemo, useRef, type RefObject } from 'react';
import { CITY_BY_ID, HUB_R, NODE_R, cityXY, routeLane, type Route } from '@boboland/shared';
import {
  EMU_GAP, EMU_NOSE, EMU_SCALE, EMU_WIRE_Y, claimTiming, emuConsist, emuProgress, placeVehicle, roofSide, runsLeft, wirePath, type EmuPiece,
} from './claimFx';
import { carRects } from './geometry';
import { HSR, INK, MERLION, MUSTARD, SOFT_INK } from '../theme';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The star moment: a locomotive in the claimer's colour steams along the route, dropping each car
 * as it passes, then both cities burst with sparks. Every player sees it.
 */
export function ClaimCelebration({ route, fill }: { route: Route; fill: string }) {
  if (MERLION) return <MerlionCelebration route={route} fill={fill} />;
  // the high-speed-rail theme has its own star: an electric train under its overhead line
  return HSR ? <EmuCelebration route={route} fill={fill} /> : <SteamCelebration route={route} fill={fill} />;
}

function SteamCelebration({ route, fill }: { route: Route; fill: string }) {
  const train = useRef<SVGGElement>(null);
  const t = claimTiming(route.length);
  const stops = useMemo(() => trainStops(route), [route]);

  useEffect(() => {
    const el = train.current;
    if (!el || reduced()) return;
    const at = (k: number, scale: number) => `translate(${stops[k].x}px, ${stops[k].y}px) rotate(${stops[k].angle}deg) scale(${scale})`;
    const last = stops.length - 1;
    const run = el.animate(
      [
        { transform: at(0, 0.8), opacity: 0 },
        ...stops.map((st, k) => ({ transform: at(k, 1.55), opacity: 1, offset: 0.06 + 0.88 * st.f })),
        { transform: at(last, 0.8), opacity: 0 },
      ],
      { duration: t.travel + 260, delay: t.start - 130, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'both' },
    );
    return () => run.cancel();
  }, [stops, t.travel, t.start]);

  if (reduced()) return null;
  return (
    <g pointerEvents="none">
      <g ref={train} style={{ opacity: 0 }}>
        {/* steam */}
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={10} cy={-22} r={5} fill="#fbf8f1" stroke={INK} strokeOpacity={0.25} className="steam-puff" style={{ animationDelay: `${i * 160}ms` }} />
        ))}
        {/* locomotive, facing the direction of travel: cab, boiler with brass bands, stack, lamp and cowcatcher */}
        <Loco fill={fill} />
      </g>
      {[route.a, route.b].map((id) => <Burst key={id} at={cityXY(id)} fill={fill} delay={t.arrive} />)}
    </g>
  );
}

/** The steam locomotive that runs along a newly claimed route, painted in the claiming player's colour. */
function Loco({ fill }: { fill: string }) {
  const driver = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy={9} r={5.4} fill={INK} />
      <circle cx={cx} cy={9} r={4} fill={fill} />
      {[0, 45, 90, 135].map((d) => {
        const a = (d * Math.PI) / 180, dx = Math.cos(a) * 4, dy = Math.sin(a) * 4;
        return <line key={d} x1={cx - dx} y1={9 - dy} x2={cx + dx} y2={9 + dy} stroke={INK} strokeWidth={1} />;
      })}
      <circle cx={cx} cy={9} r={1.5} fill={MUSTARD} stroke={INK} strokeWidth={0.8} />
    </g>
  );
  const small = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy={10.4} r={3.3} fill={INK} />
      <circle cx={cx} cy={10.4} r={1.2} fill={MUSTARD} />
    </g>
  );
  return (
    <g strokeLinejoin="round">
      {/* headlamp beam */}
      <path d="M20.5,-11.4 L34,-16 L34,-3.6 L20.5,-8 Z" fill="#fff3c4" opacity={0.45} />
      {/* cab with a lit window, under a dark roof */}
      <rect x={-24} y={-13.5} width={13} height={19} rx={1.5} fill={fill} stroke={INK} strokeWidth={1.8} />
      <rect x={-26.5} y={-17} width={17.5} height={4} rx={1.5} fill={INK} />
      <rect x={-21.5} y={-10.5} width={8} height={6.5} rx={1} fill="#fff3c4" stroke={INK} strokeWidth={1.2} />
      {/* boiler with brass bands and a highlight */}
      <rect x={-12} y={-7} width={27} height={12} rx={6} fill={fill} stroke={INK} strokeWidth={1.8} />
      {[-5, 2, 9].map((x) => <rect key={x} x={x} y={-6.2} width={1.6} height={10.4} fill={MUSTARD} />)}
      <rect x={-10} y={-5} width={22} height={2} rx={1} fill="#fff" opacity={0.45} />
      {/* steam dome and sand dome in brass, then the smokestack and smokebox */}
      <path d="M-3.5,-6.8 a4,4 0 0 1 8,0 Z" fill={MUSTARD} stroke={INK} strokeWidth={1.2} />
      <path d="M-10,-6.8 a2.6,2.6 0 0 1 5.2,0 Z" fill={fill} stroke={INK} strokeWidth={1.1} />
      <path d="M7,-7 V-13.5 L5.4,-17.5 H14.6 L13,-13.5 V-7 Z" fill={INK} />
      <rect x={14} y={-7.6} width={5.4} height={13} rx={2} fill={INK} />
      {/* headlamp */}
      <rect x={15} y={-12.4} width={5.6} height={4.8} rx={1} fill={MUSTARD} stroke={INK} strokeWidth={1} />
      <circle cx={19.5} cy={-10} r={1.5} fill="#fffbe0" />
      {/* running board and cowcatcher */}
      <rect x={-25.5} y={4.8} width={45} height={2.8} rx={1} fill={INK} />
      <path d="M18.5,5 L28,12.6 H17 Z" fill={fill} stroke={INK} strokeWidth={1.4} />
      {[21, 24].map((x) => <line key={x} x1={x} y1={6.6} x2={x - 1.6} y2={12.2} stroke={INK} strokeWidth={0.9} />)}
      {/* wheels: trailing, two big drivers joined by a brass rod, leading */}
      {small(-19)}
      {driver(-7)}
      {driver(4.5)}
      {small(14)}
      <rect x={-7} y={8.1} width={11.5} height={1.9} rx={0.9} fill={MUSTARD} stroke={INK} strokeWidth={0.8} />
    </g>
  );
}

/** Points along the route for the train to pass through, with its heading (unwrapped so it never spins). */
function trainStops(route: Route): { x: number; y: number; angle: number; f: number }[] {
  const lane = routeLane(route);
  const n = lane.pts.length > 2 ? 16 : 1;
  let prev: number | null = null;
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = i / n;
    const { p, t } = lane.at(Math.min(lane.length, f * lane.length));
    let angle = (Math.atan2(t[1], t[0]) * 180) / Math.PI;
    if (prev !== null) while (angle - prev > 180) angle -= 360;
    if (prev !== null) while (prev - angle > 180) angle += 360;
    prev = angle;
    return { x: p[0], y: p[1], angle, f };
  });
}

function Burst({ at: [x, y], fill, delay }: { at: [number, number]; fill: string; delay: number }) {
  const sparks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const d = 42 + (i % 3) * 14;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, star: i % 2 === 0 };
  });
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={14} fill="none" stroke={fill} strokeWidth={5} className="burst-ring" style={{ animationDelay: `${delay}ms` }} />
      <circle r={14} fill="none" stroke="#f2c230" strokeWidth={3} className="burst-ring" style={{ animationDelay: `${delay + 120}ms` }} />
      {sparks.map((s, i) => (
        <g key={i} className="burst-spark" style={{ animationDelay: `${delay}ms`, ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px` }}>
          {s.star
            ? <path d="M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6Z" fill="#f2c230" stroke={INK} strokeWidth={0.8} />
            : <circle r={3.2} fill={fill} stroke="#fff" strokeWidth={1} />}
        </g>
      ))}
    </g>
  );
}

/* ======================================================================================================
 * Merlion (Singapore) theme: a driverless MRT train in the claimer's colour glides along the route, and
 * both stations bloom with orchid petals and a small burst. A long route (4+ cars) gets a National Day
 * fireworks shell over its middle too.
 * ====================================================================================================== */

const ORCHID_PINK = '#e45ab0';
const NATIONAL_DAY = ['#ff7fc6', '#ffd45a', '#7fe3ff', '#ffffff'];

function MerlionCelebration({ route, fill }: { route: Route; fill: string }) {
  const train = useRef<SVGGElement>(null);
  const gondola = useRef<SVGGElement>(null);
  const t = claimTiming(route.length);
  const stops = useMemo(() => trainStops(route), [route]);
  const ends = [route.a, route.b];
  const cable = ends.includes('HBF') && ends.includes('SEN');

  useEffect(() => {
    if (reduced()) return;
    const at = (k: number, scale: number, lift = 0) => `translate(${stops[k].x}px, ${stops[k].y + lift}px) rotate(${stops[k].angle}deg) scale(${scale})`;
    const last = stops.length - 1;
    const play = (el: SVGGElement | null, scale: number, lift: number) => el?.animate(
      [
        { transform: at(0, scale * 0.55, lift), opacity: 0 },
        ...stops.map((st, k) => ({ transform: at(k, scale, lift), opacity: 1, offset: 0.06 + 0.88 * st.f })),
        { transform: at(last, scale * 0.55, lift), opacity: 0 },
      ],
      { duration: t.travel + 260, delay: t.start - 130, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'both' },
    );
    const run = play(train.current, 1.5, 0);
    // HarbourFront - Sentosa: a cable car glides above the train (the real one crosses the strait overhead)
    const car = cable ? play(gondola.current, 1.2, -14) : undefined;
    return () => { run?.cancel(); car?.cancel(); };
  }, [stops, t.travel, t.start, cable]);

  if (reduced()) return null;
  const mid = stops[Math.floor(stops.length / 2)];
  return (
    <g pointerEvents="none">
      <g ref={train} style={{ opacity: 0 }}>
        <MrtCar fill={fill} />
      </g>
      {[route.a, route.b].map((id) => <PetalBurst key={id} at={cityXY(id)} fill={fill} delay={t.arrive} />)}
      {route.length >= 4 && <Fireworks at={[mid.x, mid.y]} delay={t.arrive - 150} />}
      {cable && <g ref={gondola} style={{ opacity: 0 }}><CableCar /></g>}
      {ends.includes('BOB') && <MerlionSpout at={cityXY('BOB')} delay={t.arrive} />}
      {ends.includes('SEN') && <MerlionSpout at={cityXY('SEN')} delay={t.arrive} />}
      {ends.includes('CHG') && <ControlTower at={cityXY('CHG')} delay={t.arrive} />}
    </g>
  );
}

/** A small red cable car hanging from its line. */
function CableCar() {
  return (
    <g>
      <line x1={-9} y1={-6} x2={9} y2={-6} stroke={INK} strokeWidth={1} />
      <line x1={0} y1={-6} x2={0} y2={-1} stroke={INK} strokeWidth={1} />
      <rect x={-6} y={-1} width={12} height={8} rx={2} fill="#e8344b" stroke={INK} strokeWidth={1.1} />
      <rect x={-4} y={1} width={8} height={3.4} rx={0.8} fill="#bfe9ff" />
    </g>
  );
}

/** The Merlion's jet: an arc of water that leaps from a station into the bay (Marina Bay, Sentosa). */
function MerlionSpout({ at: [x, y], delay }: { at: [number, number]; delay: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <path d="M2,-6 Q24,-46 48,-4" fill="none" stroke="#7fe3ff" strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1" className="mrt-fx-arc" style={{ animationDelay: `${delay}ms` }} />
      <path d="M2,-6 Q24,-46 48,-4" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" pathLength={1} strokeDasharray="1" className="mrt-fx-arc" style={{ animationDelay: `${delay + 60}ms` }} />
    </g>
  );
}

/** Changi's control tower, its beacon blinking three times. */
function ControlTower({ at: [x, y], delay }: { at: [number, number]; delay: number }) {
  return (
    <g transform={`translate(${x},${y - 12})`} className="mrt-fx-tower" style={{ animationDelay: `${delay}ms` }}>
      <path d="M-2.4,12 L-1.4,-4 H1.4 L2.4,12Z" fill="#fff" stroke={INK} strokeWidth={1} />
      <rect x={-5} y={-9} width={10} height={5.4} rx={1.4} fill="#bfe9ff" stroke={INK} strokeWidth={1} />
      <circle cx={0} cy={-11.5} r={2.2} fill="#ff4a4a" stroke={INK} strokeWidth={0.7} className="mrt-fx-beacon" style={{ animationDelay: `${delay}ms` }} />
    </g>
  );
}

/** A driverless MRT car facing right: white body, a stripe in the player's colour, dark glass, no cab. */
function MrtCar({ fill }: { fill: string }) {
  return (
    <g strokeLinejoin="round">
      <path d="M-24,-9 H14 C21,-9 26,-4 28,2 V7 H-24Z" fill="#fff" stroke={INK} strokeWidth={1.8} />
      <rect x={-24} y={0.6} width={52} height={3.4} fill={fill} />
      {[-20, -10, 0].map((x) => <rect key={x} x={x} y={-6.4} width={7.6} height={5.2} rx={1.2} fill="#2b5a78" stroke={INK} strokeWidth={0.9} />)}
      <path d="M11,-6.4 H15 C19,-6.4 22,-3.8 23.4,-1.2 H11Z" fill="#2b5a78" stroke={INK} strokeWidth={0.9} />
      <circle cx={25.6} cy={3.6} r={1.3} fill="#ffe27a" />
      <rect x={-24} y={7} width={52} height={2.2} rx={1} fill={INK} />
      {[-15, 12].map((x) => <rect key={x} x={x} y={9.2} width={8} height={1.8} rx={0.9} fill={INK} />)}
    </g>
  );
}

/** Orchid petals drift down from a station and a small ring of gold sparks bursts out. */
function PetalBurst({ at: [x, y], fill, delay }: { at: [number, number]; fill: string; delay: number }) {
  const petals = Array.from({ length: 9 }, (_, i) => ({ dx: (i - 4) * 9, dy: -8 - (i % 3) * 8, d: (i % 4) * 90 }));
  const sparks = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2, d = 40 + (i % 2) * 14;
    return { dx: Math.cos(a) * d, dy: Math.sin(a) * d };
  });
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={14} fill="none" stroke={fill} strokeWidth={5} className="burst-ring" style={{ animationDelay: `${delay}ms` }} />
      <circle r={14} fill="none" stroke={MUSTARD} strokeWidth={3} className="burst-ring" style={{ animationDelay: `${delay + 120}ms` }} />
      {sparks.map((s, i) => (
        <g key={i} className="burst-spark" style={{ animationDelay: `${delay}ms`, ['--dx' as string]: `${s.dx}px`, ['--dy' as string]: `${s.dy}px` }}>
          <path d="M0,-5.4 L1.4,-1.4 L5.4,0 L1.4,1.4 L0,5.4 L-1.4,1.4 L-5.4,0 L-1.4,-1.4Z" fill={MUSTARD} stroke={INK} strokeWidth={0.7} />
        </g>
      ))}
      {petals.map((p, i) => (
        <g key={`p${i}`} transform={`translate(${p.dx},${p.dy})`}>
          <ellipse rx={3} ry={5.6} fill={ORCHID_PINK} stroke={INK} strokeWidth={0.7} className="mrt-fx-petal" style={{ animationDelay: `${delay + 80 + p.d}ms` }} transform={`rotate(${i * 40})`} />
        </g>
      ))}
    </g>
  );
}

/** A National Day shell: streaks fanning out in pink, gold and cyan over the middle of a long route. */
function Fireworks({ at: [x, y], delay }: { at: [number, number]; delay: number }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2, r1 = 14, r2 = i % 2 ? 34 : 46;
    return { x1: Math.cos(a) * r1, y1: Math.sin(a) * r1, x2: Math.cos(a) * r2, y2: Math.sin(a) * r2, c: NATIONAL_DAY[i % NATIONAL_DAY.length] };
  });
  return (
    <g transform={`translate(${x},${y - 6})`}>
      {rays.map((r, i) => (
        <g key={i} className="mrt-fx-spark" style={{ animationDelay: `${Math.max(0, delay) + (i % 2) * 70}ms` }}>
          <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={r.c} strokeWidth={3.2} strokeLinecap="round" />
          <circle cx={r.x2} cy={r.y2} r={2.4} fill={r.c} />
        </g>
      ))}
    </g>
  );
}

/* ======================================================================================================
 * HSR theme: a white electric multiple unit glides out of the first city under an overhead line that is
 * strung up just ahead of it (masts rise at every car slot), its pantograph throwing small blue arcs,
 * and brakes to a halt at the second city's platform as both cities ring.
 * Positions are written straight into the SVG every frame (no React state): each vehicle stands on its
 * own two bogies, so the set bends round curved routes like a real train.
 * ====================================================================================================== */

const SPARK_BLUE = '#5cc8ff';

/** Which vehicle carries the raised pantograph: the first middle car, or the rear driving car of a short set. */
const pantoCar = (consist: EmuPiece[]) => {
  const mid = consist.findIndex((c) => c.kind === 'mid');
  return mid >= 0 ? mid : consist.length - 1;
};

/** Where the pantograph's head sits along each kind of vehicle (drawing units from its centre, + is forward). */
const PANTO_X: Record<EmuPiece['kind'], number> = { nose: 0, mid: 0.5, tail: -4 };

function EmuCelebration({ route, fill }: { route: Route; fill: string }) {
  const id = useId().replace(/:/g, '');
  const t = useMemo(() => claimTiming(route.length), [route.length]);
  const geo = useMemo(() => {
    const lane = routeLane(route);
    const left = runsLeft(lane);
    const radius = (c: string) => (CITY_BY_ID[c].hub ? HUB_R : NODE_R);
    const slots = carRects(route);
    // masts at both ends of every car slot (one mast in each gap between two cars)
    const last = slots[slots.length - 1];
    const masts = [slots[0].s - slots[0].w / 2 - 1, ...slots.slice(0, -1).map((c, i) => (c.s + slots[i + 1].s) / 2), last.s + last.w / 2 + 1];
    const wireH = EMU_WIRE_Y * EMU_SCALE;
    const w0 = masts[0] - 3, w1 = masts[masts.length - 1] + 3;
    const p0 = lane.pts[0], p1 = lane.pts[1];
    const consist = emuConsist(route.length);
    return {
      lane, left, masts, wireH, w0, w1, consist, panto: pantoCar(consist),
      wire: wirePath(lane, w0, w1, wireH + 0.4, left),
      s0: radius(route.a) + 1,
      s1: lane.length - radius(route.b) - 2,
      gate: { at: cityXY(route.a), r: radius(route.a) + 1.5, p: p0, angle: (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI },
      ends: [route.a, route.b].map((c) => ({ id: c, at: cityXY(c), r: radius(c) })),
    };
  }, [route]);

  const train = useRef<SVGGElement>(null);
  const cars = useRef<(SVGGElement | null)[]>([]);
  const sparks = useRef<SVGGElement>(null);
  const wire = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const line = useRef<SVGGElement>(null);
  const masts = useRef<(SVGLineElement | null)[]>([]);
  const heads = useRef<(SVGGElement | null)[]>([]);
  const streaks = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reduced()) return;
    const { lane, left, consist, panto, s0, s1, w0, w1, wireH } = geo;
    const t0 = performance.now();
    const flip = left ? -EMU_SCALE : EMU_SCALE;
    const span = w1 - w0;
    let raf = 0;
    const frame = (now: number) => {
      const e = now - t0;
      const head = s0 + emuProgress(e, t) * (s1 - s0);
      // speed streaks behind the last car, strongest at full speed
      const speed = (emuProgress(e + 40, t) - emuProgress(e, t)) * (s1 - s0) / 40;
      if (streaks.current) streaks.current.style.opacity = String(Math.min(1, Math.max(0, (speed - 0.04) * 4)));
      const after = e - t.arrive;
      // the train: every vehicle on its own bogies
      let front = head, pantoS = head;
      consist.forEach((c, k) => {
        const len = c.len * EMU_SCALE;
        const v = placeVehicle(lane, front, len);
        cars.current[k]?.setAttribute('transform', `translate(${v.x.toFixed(2)},${v.y.toFixed(2)}) rotate(${v.angle.toFixed(2)}) scale(${EMU_SCALE},${flip})`);
        if (k === panto) pantoS = front - len / 2 + PANTO_X[c.kind] * EMU_SCALE;
        front -= len + EMU_GAP * EMU_SCALE;
      });
      if (train.current) train.current.style.opacity = String(e < t.start - 140 ? 0 : after < 220 ? 1 : Math.max(0, 1 - (after - 220) / 420));
      const running = e > t.start - 130 && after < 40;
      if (sparks.current) sparks.current.style.opacity = running ? '1' : '0';
      // the overhead line is strung ahead of the train; masts rise as it reaches them
      const reach = Math.max(w0, head + 70 * Math.min(1, e / t.start));
      wire.current?.setAttribute('stroke-dashoffset', String(1 - Math.min(1, (reach - w0) / span)));
      if (glow.current) {
        // the stretch of wire just behind the pantograph glows with the current it draws
        const g1 = Math.max(0, Math.min(1, (pantoS - w0) / span)), g0 = Math.max(0, Math.min(g1, (pantoS - 46 - w0) / span));
        glow.current.setAttribute('stroke-dasharray', `0 ${g0.toFixed(4)} ${(g1 - g0).toFixed(4)} 2`);
        glow.current.style.opacity = running ? '1' : String(Math.max(0, 1 - Math.max(0, after) / 300));
      }
      geo.masts.forEach((s, k) => {
        const m = Math.max(0, Math.min(1, (reach - s) / 22));
        const rise = 1 - (1 - m) ** 3;
        const [bx, by] = roofSide(lane, s, 6.5, left), [tx, ty] = roofSide(lane, s, wireH + 3.2, left);
        const el = masts.current[k];
        if (el) {
          el.setAttribute('x1', bx.toFixed(2)); el.setAttribute('y1', by.toFixed(2));
          el.setAttribute('x2', (bx + (tx - bx) * rise).toFixed(2)); el.setAttribute('y2', (by + (ty - by) * rise).toFixed(2));
          el.style.opacity = m > 0 ? '1' : '0';
        }
        const hd = heads.current[k];
        if (hd) hd.style.opacity = String(Math.max(0, (m - 0.6) / 0.4));
      });
      if (line.current) line.current.style.opacity = String(after < 260 ? 1 : Math.max(0, 1 - (after - 260) / 520));
      if (e < t.total) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geo, t]);

  if (reduced()) return null;
  const { gate } = geo;
  return (
    <g pointerEvents="none" className="hsr-claim">
      <defs>
        {/* the train slides out of the first city: hidden inside the city and behind it */}
        <mask id={`${id}-gate`} maskUnits="userSpaceOnUse" x={-20000} y={-20000} width={40000} height={40000}>
          <rect x={-20000} y={-20000} width={40000} height={40000} fill="#fff" />
          <circle cx={gate.at[0]} cy={gate.at[1]} r={gate.r} fill="#000" />
          <rect x={-6000} y={-6000} width={6000} height={12000} fill="#000" transform={`translate(${gate.p[0]},${gate.p[1]}) rotate(${gate.angle})`} />
        </mask>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f6f8fb" />
          <stop offset="1" stopColor="#d9e0ea" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fffbe6" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fffbe6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-streak`} gradientUnits="userSpaceOnUse" x1={-EMU_NOSE / 2 - 1.5} y1={0} x2={-EMU_NOSE / 2 - 42} y2={0}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-arc`}>
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.35" stopColor={SPARK_BLUE} stopOpacity="0.8" />
          <stop offset="1" stopColor={SPARK_BLUE} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* overhead line: masts, then the contact wire, revealed ahead of the train */}
      <g ref={line}>
        {geo.masts.map((_, k) => (
          <line key={k} ref={(el) => { masts.current[k] = el; }} stroke={SOFT_INK} strokeWidth={1.5} strokeLinecap="round" style={{ opacity: 0 }} />
        ))}
        <path ref={wire} d={geo.wire} fill="none" stroke={INK} strokeOpacity={0.85} strokeWidth={0.9} strokeLinecap="round"
          pathLength={1} strokeDasharray="1 1" strokeDashoffset={1} />
        <path ref={glow} d={geo.wire} fill="none" stroke={SPARK_BLUE} strokeWidth={2.4} strokeOpacity={0.55} strokeLinecap="round"
          pathLength={1} strokeDasharray="0 1" style={{ opacity: 0 }} />
        {geo.masts.map((s, k) => {
          // the mast's head: a short cross-arm carrying the wire on an insulator
          const [x, y] = roofSide(geo.lane, s, geo.wireH + 0.4, geo.left);
          const [ax, ay] = roofSide(geo.lane, s, geo.wireH + 3.2, geo.left);
          const { t: tg } = geo.lane.at(s);
          return (
            <g key={k} ref={(el) => { heads.current[k] = el; }} style={{ opacity: 0 }}>
              <line x1={ax - tg[0] * 4} y1={ay - tg[1] * 4} x2={ax + tg[0] * 4} y2={ay + tg[1] * 4} stroke={SOFT_INK} strokeWidth={1.2} strokeLinecap="round" />
              <line x1={ax} y1={ay} x2={x} y2={y} stroke={SOFT_INK} strokeWidth={0.7} />
              <circle cx={x} cy={y} r={1.25} fill="#fff" stroke={INK} strokeWidth={0.7} />
            </g>
          );
        })}
      </g>

      {/* the train */}
      <g mask={`url(#${id}-gate)`}>
        <g ref={train} style={{ opacity: 0 }}>
          {geo.consist.map((c, k) => (
            <g key={k} ref={(el) => { cars.current[k] = el; }}>
              <EmuVehicle piece={c} fill={fill} id={id} sparks={k === geo.panto ? sparks : null} streaks={k === geo.consist.length - 1 ? streaks : null} />
            </g>
          ))}
        </g>
      </g>

      {/* a departure ping, then both cities ring as the train pulls in */}
      <g transform={`translate(${geo.ends[0].at[0]},${geo.ends[0].at[1]})`}>
        <circle r={geo.ends[0].r} fill="none" stroke={fill} strokeWidth={2} className="hsr-ping" style={{ animationDelay: `${t.start - 160}ms` }} />
      </g>
      {geo.ends.map((c) => <CityRing key={c.id} at={c.at} r={c.r} fill={fill} delay={t.arrive} />)}
    </g>
  );
}

/**
 * One vehicle, side-on, nose towards +x, in drawing units: the lane's centre line is y = 0, the roof is up (−y).
 * White body, dark window band, a sweeping stripe in the player's colour, grey skirt, two bogies.
 * The vehicle with `sparks` carries the raised pantograph.
 */
function EmuVehicle({ piece, fill, id, sparks, streaks }: {
  piece: EmuPiece; fill: string; id: string; sparks: RefObject<SVGGElement | null> | null; streaks: RefObject<SVGGElement | null> | null;
}) {
  const half = piece.len / 2;
  const outline = { stroke: INK, strokeWidth: 0.7, strokeOpacity: 0.9 };
  const bogie = (x: number) => (
    <g key={x} transform={`translate(${x},0)`}>
      <rect x={-4.2} y={2.6} width={8.4} height={2.2} rx={1.1} fill={INK} />
      <circle cx={-2.3} cy={4.3} r={1.25} fill={SOFT_INK} stroke={INK} strokeWidth={0.4} />
      <circle cx={2.3} cy={4.3} r={1.25} fill={SOFT_INK} stroke={INK} strokeWidth={0.4} />
    </g>
  );
  return (
    <g strokeLinejoin="round">
      {piece.kind !== 'mid' ? (
        <g transform={piece.kind === 'tail' ? 'scale(-1,1)' : undefined}>
          {piece.kind === 'nose' && <path d="M19.6,-2.4 L52,-8.5 L52,4.5 Z" fill={`url(#${id}-beam)`} opacity={0.75} />}
          {bogie(-12.5)}{bogie(10.5)}
          <rect x={-20} y={2} width={36} height={1.6} fill="#97a3b6" />
          {/* body: long, low nose */}
          <path d="M-20,-9.5 H-3 C5,-9.5 12.5,-7.8 17.4,-4 C19.6,-2.2 20.8,-0.2 20.3,1.2 C20,2.1 19,2.4 17.4,2.4 H-20 Z" fill={`url(#${id}-body)`} {...outline} />
          <rect x={-15.5} y={-10.4} width={11} height={1.1} rx={0.55} fill="#c9d0da" />
          {/* window band and cockpit glass */}
          <rect x={-18.4} y={-7} width={20.5} height={2.5} rx={1.2} fill={INK} />
          <path d="M3.6,-8.7 C8.8,-8.5 13.1,-6.9 15.9,-4.4 L10.2,-4.4 C7.6,-4.6 5,-5.6 3.6,-6.8 Z" fill={INK} />
          <path d="M5.6,-8.1 C8.8,-7.8 11.6,-6.9 13.4,-5.7" fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.5} strokeLinecap="round" />
          {/* stripe in the player's colour, sweeping down the nose */}
          <path d="M-20,-2.5 H7 C11.6,-2.5 15.8,-1.5 19.4,0.1 L19.9,1.3 C16.2,-0.1 11.8,-0.7 7,-0.7 H-20 Z" fill={fill} stroke={INK} strokeWidth={0.35} strokeOpacity={0.6} />
          <path d="M-20,0.6 H9.5" stroke={INK} strokeOpacity={0.35} strokeWidth={0.45} />
          {/* lamps: white headlight at the front, red tail light at the back */}
          <ellipse cx={17.9} cy={-2.6} rx={1.25} ry={0.55} transform="rotate(30 17.9 -2.6)" fill={piece.kind === 'nose' ? '#fffbe6' : '#ff3048'} stroke={INK} strokeWidth={0.3} />
        </g>
      ) : (
        <g>
          {bogie(-half * 0.64)}{bogie(half * 0.64)}
          <rect x={-half} y={2} width={piece.len} height={1.6} fill="#97a3b6" />
          <rect x={-half} y={-9.5} width={piece.len} height={11.9} rx={1.4} fill={`url(#${id}-body)`} {...outline} />
          <rect x={-half + 2} y={-7} width={piece.len - 4} height={2.5} rx={1.2} fill={INK} />
          <rect x={-half} y={-2.5} width={piece.len} height={1.8} fill={fill} stroke={INK} strokeWidth={0.35} strokeOpacity={0.6} />
          <path d={`M${-half},0.6 H${half}`} stroke={INK} strokeOpacity={0.35} strokeWidth={0.45} />
        </g>
      )}
      {sparks && <Pantograph x={PANTO_X[piece.kind]} id={id} sparks={sparks} />}
      {streaks && (
        <g ref={streaks} style={{ opacity: 0 }} stroke={`url(#${id}-streak)`} strokeLinecap="round">
          {[[-7.5, 26, 1.1], [-3.4, 40, 1.4], [0.4, 30, 1.1]].map(([y, l, w]) => (
            <path key={y} d={`M${-half - 1.5},${y} h${-l}`} strokeWidth={w} />
          ))}
        </g>
      )}
    </g>
  );
}

/** A raised single-arm pantograph whose head touches the wire, throwing small blue arcs while the train runs. */
function Pantograph({ x, id, sparks }: { x: number; id: string; sparks: RefObject<SVGGElement | null> }) {
  const top = -EMU_WIRE_Y;
  const knee = (top - 10.3) / 2 + 1;
  return (
    <g transform={`translate(${x},0)`}>
      <rect x={-3.5} y={-10.6} width={7} height={1.2} rx={0.5} fill="#c9d0da" stroke={INK} strokeWidth={0.4} />
      <path d={`M2.8,-10.3 L-3.8,${knee} L0,${top + 0.3}`} fill="none" stroke={INK} strokeWidth={0.75} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`M-3,${top + 0.1} H3`} stroke={INK} strokeWidth={0.95} strokeLinecap="round" />
      <g ref={sparks} transform={`translate(0,${top - 0.3})`} style={{ opacity: 0 }}>
        <circle r={6} fill={`url(#${id}-arc)`} className="hsr-arc-glow" />
        <circle r={9} fill={`url(#${id}-arc)`} className="hsr-arc-flash" />
        <path d="M-0.4,0 L-1.6,-1.6 L-0.8,-2.2 L-2.6,-3.8" fill="none" stroke={SPARK_BLUE} strokeWidth={0.55} strokeLinecap="round" className="hsr-arc hsr-arc-a" />
        <path d="M0.4,0 L1.8,-1.1 L1.1,-2 L3,-2.9" fill="none" stroke={SPARK_BLUE} strokeWidth={0.5} strokeLinecap="round" className="hsr-arc hsr-arc-b" />
        <path d="M0,0.2 L-2,0.6 L-2.6,-0.4 L-4.4,0.3" fill="none" stroke="#bfeaff" strokeWidth={0.45} strokeLinecap="round" className="hsr-arc hsr-arc-c" />
        {[0, 1, 2].map((k) => <circle key={k} r={0.45} fill="#e6f7ff" className="hsr-spark-fly" style={{ animationDelay: `${k * 110}ms` }} />)}
      </g>
    </g>
  );
}

/** A clean ring rippling out of a city: one in the player's colour, a thin white echo, a faint wide one, and a soft flash. */
function CityRing({ at: [x, y], r, fill, delay }: { at: [number, number]; r: number; fill: string; delay: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={r + 1} fill={fill} className="hsr-ring-flash" style={{ animationDelay: `${delay}ms` }} />
      <circle r={r} fill="none" stroke={fill} strokeWidth={3} className="hsr-ring" style={{ animationDelay: `${delay}ms` }} />
      <circle r={r} fill="none" stroke="#fff" strokeWidth={1.6} className="hsr-ring" style={{ animationDelay: `${delay + 160}ms` }} />
      <circle r={r} fill="none" stroke={INK} strokeOpacity={0.5} strokeWidth={0.8} className="hsr-ring hsr-ring-wide" style={{ animationDelay: `${delay + 320}ms` }} />
    </g>
  );
}
