import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { botPlacement, chooseBotMove, FrontlineGame, type PlayerID } from '@boboland/shared/src/frontline';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { BriefingPanel, FrontlineScreen, type FrontlineState } from './FrontlineScreen';
import { usePartyState } from '../lib/party';
import { secondsLeft } from './helpers';
import { useClaimTimeout, useNow } from './timer';
import { botDelay, prefersReducedMotion } from './fx';

/** Play against the computer: straight into the game (name and turn limit in its briefing), no curtain; the computer's seat is driven from its own client view. */
export function FrontlineBot() {
  const party = usePartyState();
  const [name, setName] = useState<string | null>(null);
  const [round, setRound] = useState({ n: 0, turnSeconds: 0 });
  const shown = name ?? party.name ?? 'Player';
  return <BotMatch key={round.n} name={shown} setName={setName} turnSeconds={round.turnSeconds} onRematch={(turnSeconds) => setRound((r) => ({ n: r.n + 1, turnSeconds }))} />;
}

function BotMatch({ name, setName, turnSeconds, onRematch }: { name: string; setName: (n: string) => void; turnSeconds: number; onRematch: (turnSeconds: number) => void }) {
  const { human, botSeat, clients } = useMemo(() => {
    const human: PlayerID = Math.random() < 0.5 ? '0' : '1';
    const game = { ...FrontlineGame, setup: (ctx: Parameters<NonNullable<typeof FrontlineGame.setup>>[0]) => FrontlineGame.setup!(ctx, { turnSeconds }) };
    const multiplayer = Local();
    const clients = (['0', '1'] as const).map((id) => Client({ game, numPlayers: 2, multiplayer, playerID: id, debug: false }) as unknown as BgioClient);
    return { human, botSeat: (human === '0' ? '1' : '0') as PlayerID, clients };
  }, [turnSeconds]);
  useEffect(() => {
    clients.forEach((c) => c.start());
    return () => clients.forEach((c) => c.stop());
  }, [clients]);
  const mine = clients[Number(human)];
  const bot = clients[Number(botSeat)];
  const humanState = useClientState(mine) as unknown as FrontlineState | null;
  const botState = useClientState(bot) as unknown as FrontlineState | null;

  const phase = botState?.ctx.phase;
  const botReady = botState?.G.ready[botSeat];
  const botTurn = phase === 'play' && botState?.ctx.currentPlayer === botSeat && !botState.G.result;
  const moves = botState?.G.moves;
  useEffect(() => {
    if (phase === 'setup' && botReady === false) {
      const t = setTimeout(() => bot.moves.submitSetup(botPlacement(botSeat, Math.random)), 400);
      return () => clearTimeout(t);
    }
    if (botTurn) {
      const t = setTimeout(() => {
        const s = bot.getState() as FrontlineState;
        if (s.ctx.currentPlayer !== botSeat || s.G.result) return;
        const m = chooseBotMove(s.G, botSeat, Math.random);
        bot.moves.move(m.from, m.to);
      }, botDelay(botState!.G, prefersReducedMotion()));
      return () => clearTimeout(t);
    }
  }, [phase, botReady, botTurn, moves, bot, botSeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // only the human claims a timeout (the computer never does)
  const now = useNow(!!humanState?.G.turnSeconds && humanState.ctx.phase === 'play');
  const expired = !!humanState && humanState.ctx.phase === 'play' && !humanState.G.result && humanState.ctx.currentPlayer === botSeat && secondsLeft(humanState.G, now) === 0;
  useClaimTimeout(expired, () => mine.moves.claimTimeout?.());

  if (!humanState) return null;
  return (
    <FrontlineScreen state={humanState} playerID={human} moves={mine.moves}
      names={{ [human]: name.trim() || 'Player', [botSeat]: 'Computer' }}
      briefing={(
        <BriefingPanel
          fields={[{ label: 'Your name', value: name, onChange: setName, testid: 'fl-name-0' }]}
          // settings and Start belong to seat 0, whichever side the human drew
          turnSeconds={humanState.G.turnSeconds} onTurnSeconds={(s) => clients[0].moves.setTurnLimit(s)}
          start={{ onClick: () => clients[0].moves.begin(), hint: 'You play olive or tan at random.' }} />
      )}
      onExit={() => navigate('/frontline')} rematch={{ onClick: () => onRematch(humanState.G.turnSeconds ?? 0) }} />
  );
}
