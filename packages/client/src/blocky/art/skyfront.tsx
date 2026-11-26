/** Near wisps in front of the plateau's underside (the sky's nearest layer; no pointer events). */
export function SkyFront() {
  return (
    <svg className="bly-skyfront" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden>
      <defs><radialGradient id="bly-front-g"><stop offset="0" stopColor="#fff" stopOpacity=".92" /><stop offset=".6" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>
      <g className="bly-drift-fast">
        <ellipse cx="120" cy="170" rx="240" ry="60" fill="url(#bly-front-g)" />
        <ellipse cx="520" cy="196" rx="300" ry="62" fill="url(#bly-front-g)" />
        <ellipse cx="900" cy="160" rx="220" ry="58" fill="url(#bly-front-g)" />
      </g>
    </svg>
  );
}
