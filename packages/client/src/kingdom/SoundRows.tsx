import { setMusicOn, useMusicOn } from '../lib/music';
import { setMuted, setVolume, useMuted, useVolume } from '../lib/sound';

/** Music and sound controls for the settings pop-over and the menu. */
export function SoundRows() {
  const music = useMusicOn();
  const muted = useMuted();
  const vol = useVolume();
  return (
    <>
      <label className="kg-row">Music <input type="checkbox" checked={music} onChange={(e) => setMusicOn(e.target.checked)} data-testid="kg-music" /></label>
      <label className="kg-row">Sounds <input type="checkbox" checked={!muted} onChange={(e) => setMuted(!e.target.checked)} /></label>
      <label className="kg-row">Volume <input type="range" min="0" max="1" step="0.05" value={vol} onChange={(e) => setVolume(Number(e.target.value))} /></label>
    </>
  );
}
