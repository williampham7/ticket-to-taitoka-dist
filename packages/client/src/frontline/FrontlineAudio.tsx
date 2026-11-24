import type { CSSProperties } from 'react';
import { MusicButton, VolumeSlider } from '../lib/AudioButtons';
import { PartyButton } from '../components/Party';

/** The shared volume slider and music toggle, recoloured for Frontline's dark olive look (the theme tokens are overridden locally). */
const DARK = { '--color-panel': '#1e2320', '--color-panel-2': '#2a302b', '--color-ink': '#e8e6df', '--color-line': '#556b2f', '--color-muted': '#b9b6aa' } as CSSProperties;

export function FrontlineAudio() {
  return (
    <span className="flex items-center gap-2" style={DARK}>
      <VolumeSlider />
      <MusicButton />
      <PartyButton inline />
    </span>
  );
}
