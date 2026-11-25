import { HeroFigure } from './heroes';

/** A hero's portrait (head and shoulders) for banners, seats and the curtain. */
export function HeroPortrait({ hero }: { hero: number }) {
  return <svg viewBox="-29 -104 58 62" className="kg-portrait" aria-hidden><HeroFigure hero={hero} /></svg>;
}
