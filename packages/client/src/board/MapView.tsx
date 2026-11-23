import { memo, useEffect, useMemo, useRef, useState, type ReactNode, type SVGProps } from 'react';
import { CITIES, CITY_BY_ID, MAP_BOUNDS, MAP_ID, ROUTES, ROUTE_BY_ID, ROUTE_POINTS, bentRect, cityXY, routeLane, type CarSlot, type City, type Route } from '@boboland/shared';
import { fitMapWithDock, type Box } from './fit';
import { DOCK_PANEL, DOCK_ZONE } from './dock';
import { carRects, routeMidpoint } from './geometry';
import { UsaGeoLayer } from './UsaGeoLayer';
import { ChinaGeoLayer } from './ChinaGeoLayer';
import { EuropeGeoLayer } from './EuropeGeoLayer';
import { SgGeoLayer } from './SgGeoLayer';
import { MerlionHub, MerlionPlace } from '../merlion/places';
import { hubPlate, stationLabel, stationR, EN_SIZE, PLATE_EN, PLATE_ZH, ZH_SIZE } from './stationLabels';
import { ClaimCelebration } from './ClaimCelebration';
import { claimTiming } from './claimFx';
import { ACCENT, HALO, HSR, INK, MERLION, MUSTARD, ROUTE_FILL, ROUTE_STROKE, SOFT_INK, TARGET } from '../theme';
import { cityName, cityNameZh } from '../lib/skin';

export interface MapViewProps {
  claims: Record<string, string>;
  playerFill: Record<string, string>;
  /** dim everyone else's track and make these players' routes glow */
  spotlight?: string | string[] | null;
  /** dim every route except these, which glow in their owner's colour (e.g. the longest route) */
  focus?: Set<string> | null;
  /** routes the viewing player can claim right now */
  claimable: Set<string>;
  highlightCities?: string[];
  highlightRoutes?: Set<string>;
  /** route ids claimed since the last render (animated) */
  fresh?: Set<string>;
  /** any route clicked; `at` is in viewport coordinates */
  onRouteClick?: (routeId: string, at: { x: number; y: number }) => void;
  routeNote?: (route: Route) => string | null;
  overlay?: ReactNode;
}

const CONTENT: Box = { x: MAP_BOUNDS.x, y: MAP_BOUNDS.y, w: MAP_BOUNDS.width, h: MAP_BOUNDS.height };
const ZONE = DOCK_ZONE[MAP_ID];

export function MapView(props: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { vb, scale: dockScale } = useMemo(() => fitMapWithDock(size, CONTENT, ZONE, DOCK_PANEL), [size.w, size.h]);
  // the docked ticket chooser sits beside the map, not inside it; it reads its size from this page-wide variable
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dock-scale', String(dockScale));
    return () => { root.style.removeProperty('--dock-scale'); };
  }, [dockScale]);
  const local = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const hovered = hover ? ROUTE_BY_ID[hover.id] : null;
  const owner = hovered ? props.claims[hovered.id] : undefined;

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden select-none" data-testid="map">
      {size.w > 0 && (MAP_ID === 'usa' ? <UsaGeoLayer vb={vb} /> : MAP_ID === 'china' ? <ChinaGeoLayer vb={vb} /> : MAP_ID === 'sg' ? <SgGeoLayer vb={vb} /> : <EuropeGeoLayer vb={vb} />)}
      {size.w > 0 && (
        <svg className="absolute inset-0 h-full w-full" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="m-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
            <filter id="m-spot" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
            {HSR && <filter id="m-lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor={INK} floodOpacity=".28" /></filter>}
          </defs>
          <Routes {...props} hoverId={hover?.id ?? null}
            onEnter={(id, e) => setHover({ id, ...local(e) })}
            onMove={(id, e) => setHover({ id, ...local(e) })}
            onLeave={() => setHover(null)}
            onClick={(id, e) => props.onRouteClick?.(id, { x: e.clientX, y: e.clientY })} />
          <Cities highlight={props.highlightCities ?? []} />
          {[...(props.fresh ?? [])].filter((id) => props.claims[id] !== undefined).map((id) => (
            <ClaimCelebration key={id} route={ROUTE_BY_ID[id]} fill={props.playerFill[props.claims[id]]} />
          ))}
        </svg>
      )}
      {hovered && hover && (
        <div className="pointer-events-none absolute z-20 rounded-md border border-ink/70 bg-ticket px-3 py-2 shadow-lg shadow-ink/25"
          style={{ left: hover.x, top: hover.y, transform: 'translate(-50%, calc(-100% - 18px))' }} role="tooltip">
          <div className="whitespace-nowrap font-display text-[15px] leading-tight text-ink">
            {HSR ? <>{cityNameZh(hovered.a)} {cityName(hovered.a)} – {cityNameZh(hovered.b)} {cityName(hovered.b)}</> : <>{cityName(hovered.a)} – {cityName(hovered.b)}</>}
          </div>
          <div className="mt-0.5 whitespace-nowrap text-[13px] text-muted">
            {hovered.length} {hovered.color === 'gray' ? 'cars, any one colour' : `${hovered.color} cars`}, worth {ROUTE_POINTS[hovered.length]}
            {owner !== undefined ? '' : props.routeNote?.(hovered) ? ` · ${props.routeNote(hovered)}` : ''}
          </div>
        </div>
      )}
      {props.overlay}
    </div>
  );
}

interface RoutesProps extends MapViewProps {
  hoverId: string | null;
  onEnter: (id: string, e: React.PointerEvent) => void;
  onMove: (id: string, e: React.PointerEvent) => void;
  onLeave: () => void;
  onClick: (id: string, e: React.MouseEvent) => void;
}

const Routes = memo(function Routes(p: RoutesProps) {
  return (
    <g>
      {ROUTES.map((r) => {
        const owner = p.claims[r.id];
        const lit = p.spotlight == null ? null : Array.isArray(p.spotlight) ? p.spotlight : [p.spotlight];
        const dimmed = p.focus ? !p.focus.has(r.id) : !!lit && !(owner !== undefined && lit.includes(owner));
        const spot = owner !== undefined && (p.focus ? p.focus.has(r.id) : !!lit && lit.includes(owner));
        const canClaim = p.claimable.has(r.id);
        const hovered = p.hoverId === r.id;
        const cars = carRects(r);
        const lanePath = routeLane(r).pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
        const highlight = p.highlightRoutes?.has(r.id);
        return (
          <g key={r.id} data-route={r.id} data-claimable={canClaim || undefined} data-owner={owner}
            className={canClaim ? 'cursor-pointer' : 'cursor-help'} opacity={dimmed ? 0.28 : 1}
            onPointerEnter={(e) => p.onEnter(r.id, e)} onPointerMove={(e) => p.onMove(r.id, e)} onPointerLeave={p.onLeave}
            onClick={(e) => p.onClick(r.id, e)}>
            <path d={lanePath} fill="none" stroke="transparent" strokeWidth={20} />
            {(canClaim || highlight) && !owner && (
              <g opacity={hovered ? 1 : 0.85} filter={hovered ? 'url(#m-glow)' : undefined}>
                {cars.map((c, i) => MERLION ? (
                  <CarBox key={i} c={c} x={-c.w / 2 - 3} y={-c.h / 2 - 3} width={c.w + 6} height={c.h + 6} rx={6}
                    transform={`translate(${c.cx},${c.cy}) rotate(${c.angle})`} fill={hovered ? '#ffd45a' : '#fff0b8'} />
                ) : HSR ? (
                  <CarBox key={i} c={c} x={-c.w / 2 - 3} y={-c.h / 2 - 3} width={c.w + 6} height={c.h + 6} rx={5.5}
                    transform={`translate(${c.cx},${c.cy}) rotate(${c.angle})`} fill={hovered ? '#ffc21a' : '#ffe08a'} />
                ) : (
                  <CarBox key={i} c={c} x={-c.w / 2 - 2.5} y={-c.h / 2 - 2.5} width={c.w + 5} height={c.h + 5} rx={4}
                    transform={`translate(${c.cx},${c.cy}) rotate(${c.angle})`} fill={hovered ? '#fff3c4' : '#fff8e2'} />
                ))}
              </g>
            )}
            {owner !== undefined && p.fresh?.has(r.id) && (
              <g filter="url(#m-spot)" className="claim-flash" style={{ animationDuration: `${claimTiming(r.length).total}ms` }}>
                {cars.map((c, i) => (
                  <CarBox key={`f${i}`} c={c} x={-c.w / 2 - 8} y={-14} width={c.w + 16} height={28} rx={10}
                    transform={`translate(${c.cx},${c.cy}) rotate(${c.angle})`} fill={p.playerFill[owner]} />
                ))}
              </g>
            )}
            {spot && (
              <g filter="url(#m-spot)">
                {cars.map((c, i) => (
                  <CarBox key={`s${i}`} c={c} x={-c.w / 2 - 6} y={-11} width={c.w + 12} height={22} rx={8}
                    transform={`translate(${c.cx},${c.cy}) rotate(${c.angle})`} fill={p.playerFill[owner]} opacity={0.9} />
                ))}
              </g>
            )}
            {highlight && owner && cars.map((c, i) => (
              <CarBox key={`h${i}`} c={c} x={-c.w / 2 - 4} y={-11} width={c.w + 8} height={22} rx={6}
                transform={`translate(${c.cx},${c.cy}) rotate(${c.angle})`} fill={MUSTARD} stroke={INK} strokeWidth={1.4} />
            ))}
            {cars.map((c, i) => {
              const tr = `translate(${c.cx.toFixed(1)},${c.cy.toFixed(1)}) rotate(${c.angle.toFixed(2)})`;
              if (owner !== undefined) {
                const fresh = p.fresh?.has(r.id);
                const drop = fresh ? claimTiming(r.length).drops[i] : 0;
                // Singapore: a bold, saturated carriage with a thick ink outline, a gloss and window band, so it reads as taken against the pale empty slots
                if (MERLION) return (
                  <g key={i} transform={tr}>
                    <g className={fresh ? 'car-drop' : undefined} style={fresh ? { animationDelay: `${drop}ms` } : undefined}>
                      <CarBox c={c} x={-c.w / 2 + 0.6} y={-4.9} width={c.w} height={12.4} rx={5} fill={INK} opacity={0.35} />
                      <CarBox c={c} x={-c.w / 2} y={-6.2} width={c.w} height={12.4} rx={5} fill={p.playerFill[owner]} stroke={INK} strokeWidth={2.1} />
                      <CarBox c={c} x={-c.w / 2 + 3.5} y={-3.6} width={Math.max(0, c.w - 7)} height={3.4} rx={1.7} fill="#fff" opacity={0.7} />
                      <CarBox c={c} x={-c.w / 2 + 3} y={2.2} width={Math.max(0, c.w - 6)} height={1.5} rx={0.75} fill={INK} opacity={0.4} />
                    </g>
                  </g>
                );
                if (HSR) return (
                  <g key={i} transform={tr}>
                    <g className={fresh ? 'car-drop' : undefined} style={fresh ? { animationDelay: `${drop}ms` } : undefined}>
                      <CarBox c={c} x={-c.w / 2 + 0.8} y={-5.2} width={c.w} height={13} rx={5} fill={INK} opacity={0.3} />
                      <CarBox c={c} x={-c.w / 2} y={-6.5} width={c.w} height={13} rx={5} fill={p.playerFill[owner]} stroke={INK} strokeWidth={1.5} />
                      <CarBox c={c} x={-c.w / 2 + 4.5} y={-3.4} width={Math.max(0, c.w - 9)} height={3.6} rx={1.8} fill="#fff" opacity={0.88} />
                      <CarBox c={c} x={-c.w / 2 + 3} y={2.4} width={Math.max(0, c.w - 6)} height={1.6} rx={0.8} fill={INK} opacity={0.35} />
                    </g>
                  </g>
                );
                return (
                  <g key={i} transform={tr}>
                    <g className={fresh ? 'car-drop' : undefined} style={fresh ? { animationDelay: `${drop}ms` } : undefined}>
                      <CarBox c={c} x={-c.w / 2 + 1.5} y={-5} width={c.w} height={14} rx={3.5} fill="rgba(30,18,10,.45)" />
                      <CarBox c={c} x={-c.w / 2} y={-7} width={c.w} height={14} rx={3.5} fill={p.playerFill[owner]} stroke={INK} strokeWidth={2} />
                      <CarBox c={c} x={-c.w / 2 + 4} y={-4} width={Math.max(0, c.w - 8)} height={3.2} rx={1.6} fill="#fff" opacity={0.6} />
                      <circle cx={-c.w / 2 + 6} cy={5} r={1.6} fill="#fff" opacity={0.8} />
                      <circle cx={c.w / 2 - 6} cy={5} r={1.6} fill="#fff" opacity={0.8} />
                    </g>
                  </g>
                );
              }
              // an empty slot: a slim, pale, lightly outlined bay (the colour still says what to pay with)
              if (MERLION) return (
                <g key={i} transform={tr}>
                  <CarBox c={c} x={-c.w / 2} y={-4.1} width={c.w} height={8.2} rx={3.4}
                    fill={ROUTE_FILL[r.color]} stroke={hovered && canClaim ? INK : ROUTE_STROKE}
                    strokeOpacity={hovered && canClaim ? 1 : 0.5} strokeWidth={hovered && canClaim ? 1.7 : 1} />
                  <CarBox c={c} x={-c.w / 2 + 2} y={-2.1} width={Math.max(0, c.w - 4)} height={4.2} rx={2.1} fill="#fff" opacity={0.28} />
                </g>
              );
              if (HSR) return (
                <CarBox key={i} c={c} transform={tr} x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} rx={3.2}
                  fill={ROUTE_FILL[r.color]} stroke={hovered && canClaim ? INK : ROUTE_STROKE}
                  strokeOpacity={hovered && canClaim ? 1 : 0.55} strokeWidth={hovered && canClaim ? 1.6 : 1} />
              );
              return (
                <CarBox key={i} c={c} transform={tr} x={-c.w / 2} y={-c.h / 2} width={c.w} height={c.h} rx={2}
                  fill={ROUTE_FILL[r.color]} stroke={hovered && canClaim ? INK : ROUTE_STROKE} strokeWidth={hovered && canClaim ? 1.8 : 1.1} />
              );
            })}
          </g>
        );
      })}
    </g>
  );
});

/**
 * A rectangle in a car's own frame. On a straight route it is a plain <rect>; on a curved route the same
 * rectangle is bent to follow the track, so the cars sweep smoothly around the curve.
 */
function CarBox({ c, x, y, width, height, rx, ...rest }: { c: CarSlot; x: number; y: number; width: number; height: number; rx?: number } & SVGProps<SVGRectElement>) {
  const d = bentRect(c, x, y, width, height);
  if (d) return <path d={d} strokeLinejoin="round" {...(rest as SVGProps<SVGPathElement>)} />;
  return <rect x={x} y={y} width={width} height={height} rx={rx} {...rest} />;
}

const Cities = memo(function Cities({ highlight }: { highlight: string[] }) {
  return (
    <g pointerEvents="none">
      {highlight.map((id) => {
        const [x, y] = cityXY(id);
        const hub = CITY_BY_ID[id].hub, special = CITY_BY_ID[id].special;
        const r = hub ? 32 : 21;
        // The glow is a band, not a disc: same outer edge as before, covering only the outer half of
        // the space around the city dot, so a clear gap separates the dot from the red.
        const dot = hub ? 23 : special ? 10.5 : 8.5;
        const outer = r + 6;
        const band = (outer - dot) / 2;
        return (
          <g key={`hl-${id}`} data-highlight={id}>
            {/* a soft glow band and a single ring that keeps rippling outward from it */}
            <circle cx={x} cy={y} r={outer - band / 2} fill="none" stroke={TARGET} strokeWidth={band} opacity={0.16} className="ring-in" />
            <circle cx={x} cy={y} r={outer - band} fill="none" stroke={TARGET} strokeWidth={3} className="target-ping" />
          </g>
        );
      })}
      {HSR && CITIES.map((c) => <Station key={c.id} city={c} />)}
      {MERLION && CITIES.map((c) => {
        const [x, y] = cityXY(c.id);
        return c.hub ? <MerlionHub key={c.id} city={c} x={x} y={y} name={cityName(c.id)} /> : <MerlionPlace key={c.id} city={c} x={x} y={y} name={cityName(c.id)} />;
      })}
      {!HSR && !MERLION && CITIES.map((c) => {
        const [x, y] = cityXY(c.id);
        if (c.hub) return <HubCity key={c.id} id={c.id} x={x} y={y} />;
        const off = { t: [0, -18, 'middle'], b: [0, 27, 'middle'], l: [-15, 5, 'end'], r: [15, 5, 'start'], tl: [-11, -11, 'end'], bl: [-11, 24, 'end'] }[c.label] as [number, number, 'middle' | 'end' | 'start'];
        return (
          <g key={c.id} data-city={c.id}>
            <circle cx={x} cy={y} r={c.special ? 10.5 : 8.5} fill="#f7f1e3" stroke={INK} strokeWidth={c.special ? 3 : 2.4} />
            <text x={x + off[0]} y={y + off[1]} textAnchor={off[2]} fontFamily="Oswald" fontWeight={c.special ? 600 : 500}
              fontSize={c.special ? 16 : 15} letterSpacing="0.06em" fill="#2c1f15" stroke={HALO} strokeWidth={4.5}
              strokeLinejoin="round" paintOrder="stroke">{cityName(c.id).toUpperCase()}</text>
          </g>
        );
      })}
    </g>
  );
});

/** The big hub in the middle of the map, with its starburst and name banner. */
function HubCity({ id, x, y }: { id: string; x: number; y: number }) {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8, r1 = 24, r2 = i % 2 ? 34 : 42;
    const pt = (ang: number, r: number) => `${(x + Math.cos(ang) * r).toFixed(1)},${(y + Math.sin(ang) * r).toFixed(1)}`;
    return <path key={i} d={`M${pt(a - 0.09, r1)} L${pt(a, r2)} L${pt(a + 0.09, r1)}Z`} fill={MUSTARD} stroke={INK} strokeWidth={1} />;
  });
  const lw = 156;
  const banner = CITY_BY_ID[id].banner ?? [0, 64];
  return (
    <g data-city={id}>
      {rays}
      <circle cx={x} cy={y} r={23} fill={MUSTARD} stroke={INK} strokeWidth={3} />
      <circle cx={x} cy={y} r={16} fill="#f7f1e3" stroke={INK} strokeWidth={2} />
      <path transform={`translate(${x},${y})`} d="M0,-9.5 L2.7,-3 L9.5,-2.9 L4.2,1.5 L5.9,8.4 L0,4.6 L-5.9,8.4 L-4.2,1.5 L-9.5,-2.9 L-2.7,-3Z" fill={ACCENT} stroke={INK} strokeWidth={1.1} />
      <g transform={`translate(${x + banner[0]},${y + banner[1]}) scale(${banner[2] ?? 1})`}>
        <path d={`M${-lw / 2 - 16},-12 L${-lw / 2},-12 L${-lw / 2},14 L${-lw / 2 - 16},14 L${-lw / 2 - 8},1Z M${lw / 2 + 16},-12 L${lw / 2},-12 L${lw / 2},14 L${lw / 2 + 16},14 L${lw / 2 + 8},1Z`} fill="#8e2d24" />
        <rect x={-lw / 2} y={-15} width={lw} height={30} rx={2} fill={ACCENT} stroke={INK} strokeWidth={1.5} />
        <text y={7} textAnchor="middle" fontFamily="Alfa Slab One" fontSize={20} letterSpacing="0.08em" fill="#fff6e6">{cityName(id).toUpperCase()}</text>
      </g>
    </g>
  );
}

/**
 * Modern (HSR) station: a metro-style roundel with its Chinese name above the English one. The hub is a
 * China-Railway-red roundel with a name plate.
 */
function Station({ city: c }: { city: City }) {
  const id = c.id;
  const [x, y] = cityXY(id);
  if (c.hub) return <HubStation id={id} x={x} y={y} />;
  const r = stationR(c);
  const l = stationLabel(c, [x, y], cityName(id), cityNameZh(id));
  const halo = { stroke: HALO, strokeWidth: 4, strokeLinejoin: 'round' as const, paintOrder: 'stroke' as const, strokeOpacity: 0.92 };
  return (
    <g data-city={id}>
      <circle cx={x} cy={y} r={r} fill="#ffffff" stroke={INK} strokeWidth={c.special ? 3.2 : 3} />
      {c.special && <circle cx={x} cy={y} r={3.4} fill={ACCENT} />}
      <text x={l.zhAt[0]} y={l.zhAt[1]} textAnchor={l.anchor} fontSize={ZH_SIZE} fill={INK} {...halo}
        style={{ fontFamily: 'var(--font-zh)', fontWeight: 700 }}>{l.zh}</text>
      <text x={l.enAt[0]} y={l.enAt[1]} textAnchor={l.anchor} fontSize={EN_SIZE} fill={SOFT_INK} letterSpacing="0.06em" {...halo}
        style={{ fontFamily: 'var(--font-ui)', fontWeight: 600 }}>{l.en}</text>
    </g>
  );
}

function HubStation({ id, x, y }: { id: string; x: number; y: number }) {
  const p = hubPlate([x, y], cityName(id), cityNameZh(id));
  const left = p.cx - p.w / 2, top = p.cy - p.h / 2;
  // a short leader from the roundel to the plate's nearest corner
  const ang = Math.atan2(p.cy - y, p.cx - x);
  const lx = Math.min(Math.max(x, left + 6), left + p.w - 6), ly = top + p.h;
  return (
    <g data-city={id}>
      <path d={`M${(x + Math.cos(ang) * 21).toFixed(1)},${(y + Math.sin(ang) * 21).toFixed(1)}L${lx.toFixed(1)},${ly.toFixed(1)}`} stroke={ACCENT} strokeWidth={2} />
      <circle cx={x} cy={y} r={27} fill={ACCENT} opacity={0.14} />
      <circle cx={x} cy={y} r={21} fill={ACCENT} stroke="#ffffff" strokeWidth={2.5} filter="url(#m-lift)" />
      <circle cx={x} cy={y} r={12} fill="none" stroke="#ffffff" strokeWidth={3.5} />
      <circle cx={x} cy={y} r={4.5} fill="#ffffff" />
      <g filter="url(#m-lift)">
        <rect x={left} y={top} width={p.w} height={p.h} rx={6} fill={ACCENT} />
      </g>
      <text x={left + p.pad} y={p.cy + PLATE_ZH * 0.36} fontSize={PLATE_ZH} fill="#ffffff" style={{ fontFamily: 'var(--font-zh)', fontWeight: 700 }}>{p.zh}</text>
      <path d={`M${(left + p.pad + p.zhW + p.sep / 2).toFixed(1)},${top + 8}V${top + p.h - 8}`} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.2} />
      <text x={left + p.w - p.pad} y={p.cy + PLATE_EN * 0.36} textAnchor="end" fontSize={PLATE_EN} letterSpacing="0.1em" fill="#ffffff"
        style={{ fontFamily: '"Barlow Condensed", var(--font-ui)', fontWeight: 700 }}>{p.en}</text>
    </g>
  );
}

export { routeMidpoint };
