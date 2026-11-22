/**
 * Rail (Europe build) screen pieces: the home poster's hero band and the turn announcement as an enamel
 * station sign. Decoration and copy only; the game logic stays in the shared screens.
 */

/** A 1930s travel-poster band: a brass sunburst over green hills, a streamlined engine crossing a viaduct. */
export function RailHero() {
  const rays = Array.from({ length: 23 }, (_, i) => {
    const a = Math.PI + ((i + 0.5) * Math.PI) / 23;
    const p = (r: number, da: number) => `${(380 + Math.cos(a + da) * r).toFixed(1)},${(118 + Math.sin(a + da) * r).toFixed(1)}`;
    return <path key={i} d={`M380,118 L${p(420, -0.04)} L${p(420, 0.04)} Z`} fill={i % 2 ? '#2b5d4a' : '#d6b25e'} opacity={i % 2 ? 1 : 0.28} />;
  });
  return (
    <div className="rail-hero -mx-6 -mt-7 mb-6 sm:-mx-10 sm:-mt-8" aria-hidden>
      <svg viewBox="0 0 560 150" preserveAspectRatio="xMidYMid slice" className="block h-[124px] w-full sm:h-[150px]">
        <defs>
          <linearGradient id="rail-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#173429" />
            <stop offset="1" stopColor="#24503f" />
          </linearGradient>
          <radialGradient id="rail-sun" cx="380" cy="118" r="70" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#f6e2a4" />
            <stop offset=".6" stopColor="#e2bf68" />
            <stop offset="1" stopColor="#c9a24c" />
          </radialGradient>
        </defs>
        <rect width="560" height="150" fill="url(#rail-sky)" />
        {rays}
        <circle cx="380" cy="118" r="44" fill="url(#rail-sun)" />
        {[50, 56, 62].map((r) => <circle key={r} cx="380" cy="118" r={r} fill="none" stroke="#d6b25e" strokeWidth=".8" opacity=".5" />)}
        {/* far mountains and near hills */}
        <path d="M0,112 L40,84 L62,98 L104,62 L140,92 L170,76 L214,110 L250,96 L300,118 V150 H0Z" fill="#1d3f33" />
        <path d="M104,62 L94,74 L102,72 L108,78 L114,70 L120,74 Z M40,84 L34,92 L42,90 L48,94 Z" fill="#f2ead6" opacity=".85" />
        <path d="M250,124 C300,104 340,112 380,116 C430,120 480,98 560,104 V150 H250Z" fill="#163328" />
        {/* the viaduct: deck and arches */}
        <rect x="0" y="122" width="560" height="5" fill="#0f241c" />
        <rect x="0" y="121" width="560" height="1.5" fill="#d6b25e" opacity=".8" />
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${i * 50},127 h50 v23 h-8 v-8 a17,17 0 0 0 -34,0 v8 h-8 z`} fill="#0f241c" />
        ))}
        {/* the streamliner: bullet nose to the right, speed bands, a coach behind */}
        <g className="rail-train">
          <path d="M18,84 H128 V121 H18 Z" fill="#7b1e2b" />
          {[28, 50, 72, 94].map((x) => <rect key={x} x={x} y="92" width="16" height="10" rx="2" fill="#f6e7bf" opacity=".9" />)}
          <rect x="18" y="108" width="110" height="2.2" fill="#d6b25e" />
          <rect x="128" y="88" width="6" height="30" fill="#0f241c" />
          <path d="M134,80 H186 V74 H206 V84 H252 C292,84 318,98 326,116 L326,121 H134 Z" fill="#7b1e2b" />
          <rect x="190" y="88" width="12" height="9" rx="1.5" fill="#f6e7bf" opacity=".9" />
          <path d="M134,104 H262 C290,104 308,108 320,114" fill="none" stroke="#d6b25e" strokeWidth="2.2" />
          <path d="M134,110 H262 C286,110 302,113 314,118" fill="none" stroke="#d6b25e" strokeWidth="1.2" />
          <circle cx="314" cy="98" r="3" fill="#f6e2a4" />
          <path d="M222,84 V76 H232 V84" fill="#5a1520" />
          {/* steam trailing back over the train */}
          <path d="M228,74 C210,62 180,66 160,58 C140,50 110,56 84,50" fill="none" stroke="#f2ead6" strokeWidth="5" strokeLinecap="round" opacity=".22" />
        </g>
        {/* speed lines */}
        <g stroke="#d6b25e" strokeLinecap="round" opacity=".55" className="rail-speed">
          <line x1="-10" y1="96" x2="12" y2="96" strokeWidth="1.4" />
          <line x1="-10" y1="106" x2="8" y2="106" strokeWidth="1" />
          <line x1="-10" y1="114" x2="14" y2="114" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

/** The turn announcement as an enamel station sign: rounded plate, white rim, brass screws, a band in the player's colour. */
export function RailTurnSign({ mine, name, fill }: { mine: boolean; name: string; fill: string }) {
  return (
    <div className={`rail-sign ${mine ? 'rail-sign-mine' : ''}`} style={{ ['--seat' as string]: fill }}>
      {[0, 1, 2, 3].map((i) => <span key={i} className={`rail-screw rail-screw-${i}`} aria-hidden />)}
      <div className="rail-sign-band" aria-hidden />
      {mine ? (
        <>
          <div className="font-display text-[44px] leading-none">Your turn</div>
          <div className="mt-2 text-[16px] opacity-90">Draw two cards, claim a route, or take tickets</div>
        </>
      ) : (
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 rounded-full ring-2 ring-[#f2ead6]" style={{ background: fill }} />
          <span className="font-display text-[32px] leading-none">{name}’s turn</span>
        </div>
      )}
    </div>
  );
}
