import { useEffect, useState } from 'react';
import { WEAPONS, type PlayerID, type ShipView, type ViewReport } from '@boboland/shared/src/fleet';
import { SCENE_MS, type FxSetting } from '../fx';
import { planScenes } from './plan';
import { Backdrop, DeliveryScene, ImpactScene, SinkScene } from './scenes';
import './cine.css';

const sec = (ms: number) => ms / 1000;

/**
 * The cinematic strip over the battle (Full only): while a report's lead-in runs, its delivery and impact; once its
 * squares have landed, the sinking of each ship it sank. Built only from the report as this viewer received it and
 * their own fleet. A tap anywhere skips (the battle handles the tap).
 */
export function Cinematic({ report, step, viewer, ownFleet, fx }: {
  report: ViewReport | null; step: number; viewer: PlayerID | null; ownFleet: readonly ShipView[] | null; fx: FxSetting;
}) {
  if (fx !== 'full' || !report) return null;
  const plan = planScenes(report, viewer, ownFleet);
  const n = report.cells.length;
  let label = '';
  let scene: React.ReactNode = null;
  let key = '';
  if (step === 0 && plan.delivery) {
    const d = sec(SCENE_MS.delivery[plan.delivery]), i = sec(SCENE_MS.impact[plan.impact]);
    if (d + i > 0) {
      key = `${report.seq}-lead`;
      label = plan.delivery === 'shell' || plan.delivery === 'salvo' || plan.delivery === 'mineBlast' ? 'Shot in flight' : WEAPONS[plan.delivery].name;
      scene = <><DeliveryScene kind={plan.delivery} d={d} /><ImpactScene impact={plan.impact} hitClass={plan.hitClass} b={d} d={i} /></>;
    }
  } else if (n > 0 && step >= n && plan.sinks.length) {
    key = `${report.seq}-sink`;
    label = 'A ship goes down';
    scene = <Sinkings classes={plan.sinks} />;
  }
  if (!scene) return null;
  return (
    <div className="fleet-cine" data-testid="fleet-cine" role="img" aria-label={label}>
      <svg key={key} viewBox="0 0 800 240" preserveAspectRatio="xMidYMid slice">
        <Backdrop />
        <g transform={plan.incoming ? 'translate(800 0) scale(-1 1)' : undefined}>{scene}</g>
      </svg>
      <span className="fleet-cine-skip">Tap to skip</span>
    </div>
  );
}

/** One sinking after another (a salvo can sink two). */
function Sinkings({ classes }: { classes: readonly ViewReport['sunk'][number][] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i + 1 >= Math.min(2, classes.length)) return;
    const t = setTimeout(() => setI(i + 1), SCENE_MS.sink);
    return () => clearTimeout(t);
  }, [i, classes.length]);
  return <SinkScene key={i} cls={classes[i]} d={sec(SCENE_MS.sink)} />;
}
