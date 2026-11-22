import { useState } from 'react';
import { BOT_LEVELS, type BotLevel } from '@boboland/shared';
import { SecondaryButton } from './Frame';

const HINT: Record<BotLevel, string> = { easy: 'beginner', medium: 'plans its routes', hard: 'expert, blocks you' };
const LABEL: Record<BotLevel, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** Host only: choose a level and seat a bot in the next open seat. */
export function BotPicker({ busy, onAdd }: { busy: boolean; onAdd: (level: BotLevel) => void }) {
  const [level, setLevel] = useState<BotLevel>('easy');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-testid="bot-picker">
      <div role="radiogroup" aria-label="Bot level" className="flex flex-wrap gap-1.5">
        {BOT_LEVELS.map((l) => (
          <button key={l} type="button" role="radio" aria-checked={level === l} title={HINT[l]} data-testid={`bot-level-${l}`}
            onClick={() => setLevel(l)}
            className={`rounded-full border-2 px-3 py-0.5 text-[14px] ${level === l ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-panel text-ink'}`}>
            {LABEL[l]}
          </button>
        ))}
      </div>
      <span className="text-[13px] text-muted" data-testid="bot-hint">{HINT[level]}</span>
      <SecondaryButton disabled={busy} onClick={() => onAdd(level)} data-testid="add-bot" className="!min-h-0 !px-3.5 !py-1 !text-[14px]">Add bot</SecondaryButton>
    </div>
  );
}

export function RemoveBot({ name, seatId, busy, onClick }: { name: string; seatId: number; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} aria-label={`Remove ${name}`} data-testid={`remove-bot-${seatId}`}
      className="rounded-full px-1.5 text-[14px] leading-none text-muted hover:text-poster disabled:opacity-50">✕</button>
  );
}
