import { HSR, colorFill } from '../theme';
import { ColorPicker } from './ColorPicker';
import { INPUT_CLASS } from './Frame';

export interface SetupPlayer { name: string; color: number }

export function CountPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Number of players" className={HSR ? 'hsr-seg' : 'inline-flex overflow-hidden rounded-lg border-2 border-ink'}>
      {[2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)} data-count={n}
          className={HSR ? '' : `w-11 py-1.5 font-display text-[17px] ${value === n ? 'bg-ink text-paper' : 'bg-panel hover:bg-paper'} ${n > 2 ? 'border-l-2 border-ink' : ''}`}>{n}</button>
      ))}
    </div>
  );
}

export function PlayerRow({ index, player, taken, onChange }: { index: number; player: SetupPlayer; taken: number[]; onChange: (p: SetupPlayer) => void }) {
  const input = (
    <input value={player.name} onChange={(e) => onChange({ ...player, name: e.target.value.slice(0, 16) })} aria-label={`Player ${index + 1} name`}
      data-testid={`name-${index}`}
      className={`${INPUT_CLASS} ${HSR ? 'w-full min-w-0' : 'w-44'}`} />
  );
  const picker = <ColorPicker label={`Player ${index + 1} colour`} value={player.color} taken={taken} onChange={(color) => onChange({ ...player, color })} />;
  if (HSR) {
    // a boarding-pass strip: seat number, name, colour; the left edge takes the player's colour
    return (
      <div className="hsr-seat flex-wrap sm:flex-nowrap" style={{ ['--seat' as string]: colorFill(player.color) }}>
        <div className="hsr-seat-no" aria-hidden><small>SEAT</small><b>{String(index + 1).padStart(2, '0')}</b></div>
        <div className="min-w-0 flex-1 basis-[140px]">{input}</div>
        <div className="w-full sm:w-auto">{picker}</div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      {input}
      {picker}
    </div>
  );
}
