import { describe, expect, it } from 'vitest';
import type { ViewReport } from '@boboland/shared/src/fleet';
import { REVEAL, SCENE_MS, botDelay, reportDuration, stepDelay } from './fx';

const r = (cells: number, sunk: string[] = []) => ({ seq: 1, by: '0', round: 1, kind: 'salvo', cells: Array.from({ length: cells }, (_, i) => ({ sq: i, r: 'miss' })), sunk }) as ViewReport;

describe('Fleet reveal timing', () => {
  it('leads in, then one beat per square, then a longer beat after a sinking', () => {
    expect(stepDelay(r(3), 0, 'fast')).toBe(REVEAL.fast.lead);
    expect(stepDelay(r(3), 1, 'full')).toBe(REVEAL.full.cell);
    expect(stepDelay(r(3), 3, 'full')).toBe(REVEAL.full.after);
    expect(stepDelay(r(1, ['corvette']), 1, 'fast')).toBe(REVEAL.fast.sink);
  });

  it('Full holds the lead-in for the delivery and impact scenes, and a sinking for its scene', () => {
    expect(stepDelay(r(3), 0, 'full')).toBe(SCENE_MS.delivery.salvo + SCENE_MS.impact.splash);
    expect(stepDelay(r(1, ['corvette']), 1, 'full')).toBe(SCENE_MS.sink);
    expect(stepDelay(r(1, ['corvette', 'frigate']), 1, 'full')).toBe(SCENE_MS.sink * 2);
    const drop = { ...r(0), kind: 'weapon', weapon: 'seaMine' } as ViewReport;
    expect(stepDelay(drop, 0, 'full')).toBe(SCENE_MS.delivery.seaMine);
  });

  it('every scene stays short', () => {
    for (const ms of Object.values(SCENE_MS.delivery)) expect(ms).toBeLessThanOrEqual(2500);
    expect(SCENE_MS.sink).toBeLessThanOrEqual(2500);
  });

  it('Off shows everything at once; Fast is shorter than Full', () => {
    expect(reportDuration(r(5), 'off')).toBe(0);
    expect(reportDuration(r(5), 'fast')).toBeLessThan(reportDuration(r(5), 'full'));
  });

  it('a report with no squares still gets a beat for its banner', () => {
    expect(reportDuration(r(0), 'fast')).toBe(REVEAL.fast.quiet);
  });

  it('the computer waits for the last result to finish', () => {
    expect(botDelay(r(2), 'full')).toBeGreaterThan(botDelay(undefined, 'full'));
  });
});
