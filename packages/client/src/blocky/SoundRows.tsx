import { useState } from 'react';
import { getSfxVolume, setSfxVolume, sfx } from './sound';
import { setBlockyMusicOn, useBlockyMusicOn } from './music';

/** Music on/off and the sound-effect volume (personal settings, saved in bly.music / bly.sfx). */
export function SoundRows() {
  const music = useBlockyMusicOn();
  const [vol, setVol] = useState(getSfxVolume);
  return (
    <>
      <label className="bly-set-row"><span>Music <small>a breezy tune for the isles</small></span><input type="checkbox" checked={music} onChange={(e) => setBlockyMusicOn(e.target.checked)} data-testid="bly-music" /></label>
      <label className="bly-set-row"><span>Sound effects</span>
        <input type="range" min={0} max={1} step={0.05} value={vol} aria-label="Sound effects volume" onChange={(e) => { const v = Number(e.target.value); setVol(v); setSfxVolume(v); }} onPointerUp={() => sfx('snap')} />
      </label>
    </>
  );
}
