import { SHIP_CLASSES } from '@boboland/shared/src/fleet';
import { SCENE_MS } from '../fx';
import type { Delivery, Impact } from './plan';
import { Backdrop, DeliveryScene, ImpactScene, SinkScene } from './scenes';
import './cine.css';

const sec = (ms: number) => ms / 1000;
const DELIVERIES = Object.keys(SCENE_MS.delivery).filter((k) => SCENE_MS.delivery[k as Delivery] > 0) as Delivery[];
const IMPACTS: Impact[] = ['splash', 'hit', 'deflect'];

/** QA gallery (/fleet/scenes): every cinematic side by side; a script can pause and seek them (SVG setCurrentTime). */
export function SceneGallery() {
  const frame = (key: string, title: string, body: React.ReactNode, mirrored = false) => (
    <figure key={key} className="grid gap-1" data-scene={key}>
      <svg viewBox="0 0 800 240" style={{ width: '100%', borderRadius: 8 }}><Backdrop /><g transform={mirrored ? 'translate(800 0) scale(-1 1)' : undefined}>{body}</g></svg>
      <figcaption className="fleet-mono text-[12px] opacity-70">{title}</figcaption>
    </figure>
  );
  return (
    <main className="fleet fleet-game" data-testid="fleet-gallery">
      <h1 className="fleet-h">Cinematics</h1>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
        {DELIVERIES.map((d) => frame(`delivery-${d}`, `delivery: ${d}`, <DeliveryScene kind={d} d={sec(SCENE_MS.delivery[d])} />))}
        {IMPACTS.map((i) => frame(`impact-${i}`, `impact: ${i} (generic)`, <ImpactScene impact={i} hitClass={null} b={0} d={sec(SCENE_MS.impact[i])} />))}
        {SHIP_CLASSES.map((c) => frame(`hit-${c}`, `hit: ${c} (defender)`, <ImpactScene impact="hit" hitClass={c} b={0} d={sec(SCENE_MS.impact.hit)} />, true))}
        {frame('deflect-cruiser', 'deflect: cruiser (defender)', <ImpactScene impact="deflect" hitClass="cruiser" b={0} d={sec(SCENE_MS.impact.deflect)} />, true)}
        {SHIP_CLASSES.map((c) => frame(`sink-${c}`, `sink: ${c}`, <SinkScene cls={c} d={sec(SCENE_MS.sink)} />))}
      </div>
    </main>
  );
}
