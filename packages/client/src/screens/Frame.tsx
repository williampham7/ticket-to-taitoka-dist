import type { ReactNode } from 'react';
import { MapView } from '../board/MapView';
import { MusicButton, VolumeSlider } from '../lib/AudioButtons';
import { navigate } from '../lib/router';
import { isFollower, usePartyState } from '../lib/party';
import { SKIN } from '../lib/skin';
import { HSR, MERLION, RAIL } from '../theme';
import { MerlionFrame, MerlionTitle } from '../merlion/MerlionChrome';
import { EditionSwitcher, type EditionSwitcherProps } from '../components/EditionSwitcher';

const none = new Set<string>();

interface FrameProps {
  children: ReactNode;
  wide?: boolean;
  /** Show the edition switcher (USA / China / Europe) in the top bar; an object configures it (e.g. `{ locked: true }`). */
  edition?: boolean | EditionSwitcherProps;
}

/** Menu screens sit on the live map, faded back, with a railway-ticket panel on top (HSR: a flat, airy card). */
export function Frame({ children, wide, edition }: FrameProps) {
  const top = <TopBar edition={edition} />;
  if (RAIL) return <RailFrame wide={wide} top={top}>{children}</RailFrame>;
  if (MERLION) return <MerlionFrame wide={wide} top={top}>{children}</MerlionFrame>;
  return HSR ? <HsrFrame wide={wide} top={top}>{children}</HsrFrame> : <VintageFrame wide={wide} top={top}>{children}</VintageFrame>;
}

/**
 * Top bar: a "Back to Main Menu" button on the left, the edition switcher centred and 15% bigger,
 * the sound controls on the right.
 */
function TopBar({ edition }: { edition?: boolean | EditionSwitcherProps }) {
  // a party member's screen follows the host: no navigating or map switching of their own
  const follower = isFollower(usePartyState());
  if (follower && edition) edition = { ...(edition === true ? {} : edition), locked: true, lockedNote: 'Your party host picks the map' };
  const edge = HSR || RAIL || MERLION ? 'top-3 sm:top-4' : 'top-4';
  const side = HSR || RAIL || MERLION ? 'sm:left-4' : '';
  return (
    <>
      {edition && !follower && (
        <button type="button" onClick={() => navigate('/')} data-testid="back-to-main" aria-label="Back to Main Menu" title="Back to Main Menu"
          className={`absolute left-3 z-10 flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 text-[14px] leading-none text-ink transition-colors hover:border-ink sm:px-3 ${side} ${edge}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          <span className="max-sm:hidden">Back to Main Menu</span>
        </button>
      )}
      {edition && (
        <div className={`absolute left-1/2 z-10 -translate-x-1/2 sm:scale-[1.15] max-sm:top-14 ${edge}`}>
          <EditionSwitcher {...(edition === true ? {} : edition)} />
        </div>
      )}
      <div className={`absolute right-[136px] z-10 flex gap-2 sm:right-[140px] ${edge}`}>
        <VolumeSlider />
        <MusicButton />
      </div>
    </>
  );
}

type SubFrameProps = { children: ReactNode; wide?: boolean; top: ReactNode };

function VintageFrame({ children, wide, top }: SubFrameProps) {
  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 opacity-70 saturate-75" aria-hidden>
        <MapView claims={{}} playerFill={{}} claimable={none} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,226,196,.55),rgba(59,42,30,.35))]" />
      {top}
      <div className="relative grid h-full place-items-center overflow-auto p-6 max-sm:pt-[6.5rem]">
        <div className={`fade-in relative w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl border-2 border-ink bg-ticket shadow-[0_24px_60px_rgba(59,42,30,.45)]`}>
          {/* perforated stub edge */}
          <div className="pointer-events-none absolute inset-y-6 left-[86px] border-l-2 border-dashed border-line-strong" />
          <div className="absolute -left-[13px] top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-ink bg-table" />
          <div className="absolute -right-[13px] top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-ink bg-table" />
          <div className="flex">
            <div className="flex w-[86px] shrink-0 items-center justify-center">
              <span className="-rotate-90 whitespace-nowrap font-display text-[15px] tracking-[0.3em] text-poster">ADMIT ONE</span>
            </div>
            <div className="min-w-0 flex-1 py-8 pl-8 pr-10">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** HSR: the map washed out to a pale concourse, a flat white card with a livery stripe along its top edge. */
function HsrFrame({ children, wide, top }: SubFrameProps) {
  return (
    <div className="hsr-frame relative h-full overflow-hidden">
      <div className="absolute inset-0 opacity-50" aria-hidden>
        <MapView claims={{}} playerFill={{}} claimable={none} />
      </div>
      <div className="hsr-frame-wash absolute inset-0" aria-hidden />
      {top}
      <div className="relative grid h-full overflow-auto px-4 pb-6 pt-[6.5rem] [place-items:safe_center] sm:p-8">
        <div className={`hsr-menu-card fade-in relative w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} overflow-hidden rounded-[22px] border border-line bg-panel`}>
          <div className="hsr-livery" aria-hidden />
          <div className="min-w-0 px-5 pb-7 pt-6 sm:px-10 sm:pb-9 sm:pt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Rail: the map as an antique print under a sepia wash, an enamel-and-brass poster card on top. */
function RailFrame({ children, wide, top }: SubFrameProps) {
  return (
    <div className="rail-frame relative h-full overflow-hidden">
      <div className="absolute inset-0 opacity-60" aria-hidden>
        <MapView claims={{}} playerFill={{}} claimable={none} />
      </div>
      <div className="rail-frame-wash absolute inset-0" aria-hidden />
      {top}
      <div className="relative grid h-full overflow-auto px-4 pb-6 pt-[6.5rem] [place-items:safe_center] sm:p-8">
        <div className={`rail-poster fade-in relative w-full ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
          <div className="relative min-w-0 px-6 pb-7 pt-7 sm:px-10 sm:pb-9 sm:pt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** "开往北京": "(train) bound for Beijing", as on a departure board. */
export const ZH_TAGLINE = SKIN.zh ? `开往${SKIN.zh}` : undefined;

/** The game's name; `compact` (HSR only) is a smaller one for screens with a lot below it. */
export function Title({ sub, compact }: { sub?: string; compact?: boolean }) {
  if (MERLION) return <MerlionTitle sub={sub} compact={compact} />;
  if (RAIL) {
    return (
      <div className={compact ? 'mb-5' : 'mb-6'}>
        <h1 className="rail-title font-display uppercase leading-[.95]">
          <span className={`block text-muted ${compact ? 'text-[15px]' : 'text-[17px] sm:text-[19px]'}`}>Ticket to</span>
          <span className={`block text-poster ${compact ? 'text-[40px]' : 'text-[50px] sm:text-[60px]'}`}>{SKIN.name}</span>
        </h1>
        <div className="rail-rule mt-2" aria-hidden><span /></div>
        {sub && <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-muted">{sub}</p>}
      </div>
    );
  }
  if (HSR) {
    return (
      <div className={compact ? 'mb-5' : 'mb-6'}>
        <h1 className="font-display uppercase leading-[.92] text-ink">
          <span className={`block tracking-[0.24em] text-muted ${compact ? 'text-[16px]' : 'text-[20px] sm:text-[22px]'}`}>Ticket to</span>
          <span className={`block tracking-[0.03em] text-poster ${compact ? 'text-[44px]' : 'text-[54px] sm:text-[66px]'}`}>{SKIN.name}</span>
        </h1>
        {ZH_TAGLINE && (
          <div className="mt-2.5 flex items-center gap-3" aria-hidden>
            <span className="hsr-zh text-[18px] font-bold tracking-[0.34em] text-ink">{ZH_TAGLINE}</span>
            <span className="h-px flex-1 bg-line" />
            <span className="hsr-train-no">G1</span>
          </div>
        )}
        {sub && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">{sub}</p>}
      </div>
    );
  }
  return (
    <div className="mb-6">
      <h1 className="font-display text-[44px] leading-[1.02] tracking-[0.01em] text-ink">Ticket to<br /><span className="text-poster">{SKIN.name}</span></h1>
      {sub && <p className="mt-2 max-w-md font-serif text-[15px] italic leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

const PRIMARY = MERLION ? 'mrt-btn mrt-btn-primary' : RAIL ? 'rail-btn rail-btn-primary' : HSR
  ? 'hsr-btn hsr-btn-primary'
  : 'rounded-lg bg-poster px-5 py-3 font-display text-[17px] tracking-wide text-[#fff6e6] shadow-[0_4px_0_#8e2d24] transition enabled:hover:-translate-y-px enabled:active:translate-y-1 enabled:active:shadow-none disabled:bg-muted/50 disabled:shadow-none';
const SECONDARY = MERLION ? 'mrt-btn mrt-btn-secondary' : RAIL ? 'rail-btn rail-btn-secondary' : HSR
  ? 'hsr-btn hsr-btn-secondary'
  : 'rounded-lg border-2 border-ink bg-panel px-5 py-2.5 font-display text-[16px] tracking-wide shadow-[0_3px_0_#b79f74] transition hover:-translate-y-px active:translate-y-0.5 active:shadow-none';

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${PRIMARY} ${props.className ?? ''}`} />;
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${SECONDARY} ${props.className ?? ''}`} />;
}

/** Text inputs on the menu screens (HSR: rounded, with a rail-blue focus ring). */
export const INPUT_CLASS = MERLION ? 'mrt-input' : RAIL ? 'rail-input' : HSR
  ? 'hsr-input'
  : 'rounded-md border-2 border-line-strong bg-panel px-3 py-1.5 text-[16px] focus:border-ink focus:outline-none';
