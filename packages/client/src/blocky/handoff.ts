/**
 * Pass and play: whose screen is up. The screen passes only when the seat to act is a human other than the one
 * shown, so a human acting twice in a row (the shared guild) keeps their screen, and computer turns keep the last
 * human's. The cloud curtain falls whenever the shown human has not opened it yet.
 */
export function nextShown(shown: string, actor: string, humans: string[], out: string[]): string {
  return humans.includes(actor) && actor !== shown && !out.includes(actor) ? actor : shown;
}
export const curtainUp = (many: boolean, over: boolean, opened: string, shown: string) => many && !over && opened !== shown;
