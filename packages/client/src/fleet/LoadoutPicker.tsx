import { useState } from 'react';
import { LOADOUT_SIZE, WEAPONS, WEAPON_IDS, type WeaponId } from '@boboland/shared/src/fleet';
import { isUnlocked, unlockHint, type Progress } from './progress';
import { ChargeMeter, WeaponIcon } from './weaponArt';

/** What each weapon does, in a sentence or two, for the armory's readout. */
export const WEAPON_DETAIL: Record<WeaponId, string> = {
  frag: 'Five squares in an X around your aim. Good for searching open water.',
  airStrike: 'Three squares, one apart, across or down (turn it with R). Quick to charge.',
  chainGun: 'Five squares straight down a column. Rakes a ship lying north to south.',
  shield: 'Each of your ships shrugs off the first hit it takes. The attacker sees "Deflected" and must shoot again.',
  seaMine: 'Drop it on any square. It drifts one square after each of your turns and goes off under the first ship it reaches.',
  decoy: 'A fake one-square ship placed with your fleet. Shooting it shows a hit, but it never sinks.',
  torpedo: 'Pick a column. It runs up from row 10 and strikes the first ship in its path.',
  supernova: 'One square. If it hits, the whole ship sinks at once. A Shield absorbs it.',
  thunderhead: 'A 3 by 3 block: nine squares in one strike.',
  cherry: 'Five squares in a + around your aim.',
  reinforcement: 'Adds a Cutter (3 squares) to your fleet: one more ship for them to find.',
  maelstrom: 'A 13-square diamond. Once per round.',
};

const kindOf = (w: WeaponId) => (WEAPONS[w].passive ? 'Passive' : WEAPONS[w].oncePerRound ? 'Once a round' : 'Strike');
const chargeText = (w: WeaponId) => (WEAPONS[w].passive ? 'Always on, never uses a turn' : `Ready after ${WEAPONS[w].charge} turns`);
const STRIKE = WEAPON_IDS.filter((w) => !WEAPONS[w].passive);
const DEFENCE = WEAPON_IDS.filter((w) => WEAPONS[w].passive);

/** Super Weapons: the armory. Load 3 weapons into the launch bays before placing the fleet. */
export function LoadoutPicker({ progress, allUnlocked, initial, onConfirm }: {
  progress: Progress; allUnlocked: boolean; initial: WeaponId[]; onConfirm: (loadout: WeaponId[]) => void;
}) {
  const open = (w: WeaponId) => allUnlocked || isUnlocked(progress, w);
  const [chosen, setChosen] = useState<WeaponId[]>(() => initial.filter((w) => WEAPONS[w] && open(w)).slice(0, LOADOUT_SIZE));
  const [focus, setFocus] = useState<WeaponId | null>(null);
  const full = chosen.length === LOADOUT_SIZE;
  const toggle = (w: WeaponId) => setChosen((c) => (c.includes(w) ? c.filter((x) => x !== w) : c.length < LOADOUT_SIZE ? [...c, w] : c));
  const shown = focus ?? chosen[chosen.length - 1] ?? null;

  const row = (w: WeaponId) => {
    const def = WEAPONS[w];
    const locked = !open(w);
    const bay = chosen.indexOf(w);
    const on = bay >= 0;
    return (
      <li key={w}>
        <button type="button" className={`fleet-wrow ${on ? 'on' : ''} ${locked ? 'locked' : ''}`} data-testid={`fleet-weapon-${w}`}
          aria-pressed={on} disabled={locked || (full && !on)} onClick={() => toggle(w)}
          onPointerEnter={() => setFocus(w)} onFocus={() => setFocus(w)} onPointerLeave={() => setFocus(null)}>
          <span className="fleet-wrow-icon"><WeaponIcon id={w} size={40} /></span>
          <span className="fleet-wrow-text">
            <span className="fleet-wrow-name">{def.name}</span>
            <span className="fleet-wrow-blurb">{locked ? unlockHint(w) : def.blurb}</span>
          </span>
          <span className="fleet-wrow-charge">
            {locked ? null : def.passive ? <span className="fleet-wrow-kind">Passive</span> : <ChargeMeter value={def.charge} of={def.charge} label={`${def.name}: ${chargeText(w)}`} />}
          </span>
          <span className={`fleet-wrow-tag ${on ? 'bay' : locked ? 'lock' : ''}`}>
            {on ? `Bay ${bay + 1}` : locked ? (
              <><svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><rect x="2" y="5" width="8" height="6" fill="currentColor" /><path d="M4 5 V3.5 a2 2 0 0 1 4 0 V5" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>Locked</>
            ) : full ? 'Bays full' : 'Load'}
          </span>
        </button>
      </li>
    );
  };

  return (
    <section className="fleet-armory" data-testid="fleet-loadout">
      <header className="fleet-station-head">
        <span className="fleet-station">Armory</span>
        <h2 className="fleet-h">Load three weapons</h2>
        <p className="fleet-help">Your shell is always loaded. Firing a strike weapon uses your turn once it has charged; passive weapons work on their own.</p>
      </header>
      <div className="fleet-armory-body">
        <aside className="fleet-plate fleet-bays" aria-label="Launch bays">
          <div className="fleet-bays-head">
            <span className="fleet-station">Launch bays</span>
            <span className={`fleet-bays-count ${full ? 'full' : ''}`} data-testid="fleet-bays-count">{chosen.length}/{LOADOUT_SIZE} loaded</span>
          </div>
          <ol className="fleet-bay-list">
            {Array.from({ length: LOADOUT_SIZE }, (_, i) => {
              const w = chosen[i];
              return (
                <li key={i}>
                  {w ? (
                    <button type="button" className="fleet-bay filled" onClick={() => toggle(w)} data-testid={`fleet-slot-${i}`} aria-label={`Bay ${i + 1}: ${WEAPONS[w].name}. Unload`}
                      onPointerEnter={() => setFocus(w)} onPointerLeave={() => setFocus(null)}>
                      <span className="fleet-bay-no">{i + 1}</span>
                      <span className="fleet-bay-hatch"><WeaponIcon id={w} size={52} /></span>
                      <span className="fleet-bay-text">
                        <span className="fleet-bay-name">{WEAPONS[w].name}</span>
                        <span className="fleet-bay-meta">{kindOf(w)}. {chargeText(w)}</span>
                      </span>
                      <span className="fleet-bay-x" aria-hidden>
                        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="2" /></svg>
                      </span>
                    </button>
                  ) : (
                    <span className="fleet-bay" data-testid={`fleet-slot-${i}`}>
                      <span className="fleet-bay-no">{i + 1}</span>
                      <span className="fleet-bay-hatch empty" aria-hidden />
                      <span className="fleet-bay-text"><span className="fleet-bay-name">Empty bay</span><span className="fleet-bay-meta">Pick a weapon from the list</span></span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="fleet-readout" aria-live="polite">
            {shown ? (
              <>
                <span className="fleet-readout-art"><WeaponIcon id={shown} size={72} /></span>
                <span className="grid gap-1 min-w-0">
                  <span className="fleet-readout-name">{WEAPONS[shown].name}</span>
                  <span className="fleet-readout-kind">{kindOf(shown)}. {chargeText(shown)}</span>
                  <span className="fleet-readout-text">{open(shown) ? WEAPON_DETAIL[shown] : `Locked. ${unlockHint(shown)}.`}</span>
                </span>
              </>
            ) : <span className="fleet-readout-text">Point at a weapon to read its specification.</span>}
          </div>
          <button type="button" className="fleet-launch" disabled={!full} data-testid="fleet-loadout-ok" onClick={() => onConfirm(chosen)}>
            <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden><path d="M3 15 L17 14 L23 17 L17 20 L3 19 Z" fill="currentColor" /><path d="M8 9 V13 M13 7 V13" stroke="currentColor" strokeWidth="2.4" /></svg>
            <span className="fleet-launch-label">Place fleet</span>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><path d="M6 3 L15 11 L6 19" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
          </button>
        </aside>
        <div className="fleet-catalogue">
          <section>
            <h3 className="fleet-cat-title">Strike weapons <span>Fire one instead of a shell</span></h3>
            <ul className="fleet-wlist">{STRIKE.map(row)}</ul>
          </section>
          <section>
            <h3 className="fleet-cat-title">Defences <span>Set up with your fleet</span></h3>
            <ul className="fleet-wlist">{DEFENCE.map(row)}</ul>
          </section>
        </div>
      </div>
    </section>
  );
}
