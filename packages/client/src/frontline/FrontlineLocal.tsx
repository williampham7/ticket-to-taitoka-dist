import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { FrontlineGame, type ArmyId, type PlayerID } from '@boboland/shared/src/frontline';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { navigate } from '../lib/router';
import { combatSentenceNamed, spotSentenceNamed } from './helpers';
import { BriefingPanel, btnPrimary, FrontlineScreen, type FrontlineState } from './FrontlineScreen';
import { useClaimTimeout, useNow } from './timer';
import { secondsLeft } from './helpers';
import { fxMs, prefersReducedMotion } from './fx';
import './screen.css';

/** Pass-and-play: straight into the game; names and the turn limit are set in its briefing. Every seat change goes through an opaque curtain. */
export function FrontlineLocal() {
  const [names, setNames] = useState(['Player 1', 'Player 2']);
  const [round, setRound] = useState<{ n: number; turnSeconds: number; army: ArmyId }>({ n: 0, turnSeconds: 0, army: 'classic' });
  return (
    <LocalMatch key={round.n} names={names} setNames={setNames} turnSeconds={round.turnSeconds} army={round.army}
      onRematch={(turnSeconds, army) => setRound((r) => ({ n: r.n + 1, turnSeconds, army }))} />
  );
}

function LocalMatch({ names, setNames, turnSeconds, army, onRematch }: {
  names: string[]; setNames: (n: string[]) => void; turnSeconds: number; army: ArmyId; onRematch: (turnSeconds: number, army: ArmyId) => void;
}) {
  // a fresh game object per match: Local() keeps one master per game object
  const clients = useMemo(() => {
    const seed = new URLSearchParams(window.location.search).get('seed');
    const game = { ...FrontlineGame, setup: (ctx: Parameters<NonNullable<typeof FrontlineGame.setup>>[0]) => FrontlineGame.setup!(ctx, { turnSeconds, army }), ...(seed ? { seed } : {}) };
    const multiplayer = Local();
    return (['0', '1'] as const).map((id) => Client({ game, numPlayers: 2, multiplayer, playerID: id, debug: false }) as unknown as BgioClient);
  }, [turnSeconds, army]);
  useEffect(() => {
    clients.forEach((c) => c.start());
    return () => clients.forEach((c) => c.stop());
  }, [clients]);

  const first = useClientState(clients[0]) as unknown as FrontlineState | null;
  const over = !!first?.G.result;
  const briefing = first?.ctx.phase === 'briefing';
  const wanted: PlayerID = !first || briefing ? '0'
    : first.ctx.phase === 'setup' ? (first.G.ready['0'] ? '1' : '0')
    : (first.ctx.currentPlayer as PlayerID);
  // the seat whose pieces have been shown; the board for any other seat is not mounted
  const [shown, setShown] = useState<PlayerID | null>(null);
  // after a move the mover's own screen stays up until the move (or the duel) has played out, then the curtain falls
  const [hold, setHold] = useState<{ seat: PlayerID; moves: number } | null>(null);
  const [seenMoves, setSeenMoves] = useState(first?.G.moves ?? 0);
  if (first && first.G.moves !== seenMoves) {
    setSeenMoves(first.G.moves);
    if (first.ctx.phase === 'play' && first.G.moves === seenMoves + 1 && shown !== null && shown !== wanted) setHold({ seat: shown, moves: first.G.moves });
  }
  const holdMs = first ? fxMs(first.G, prefersReducedMotion()) : 0;
  useEffect(() => {
    if (!hold) return;
    const t = setTimeout(() => setHold(null), holdMs + 450);
    return () => clearTimeout(t);
  }, [hold]); // eslint-disable-line react-hooks/exhaustive-deps
  const screenSeat: PlayerID = hold ? hold.seat : wanted;
  const curtain = !over && !briefing && !hold && shown !== wanted;

  // the seat that is waiting (it exists even when it is not on screen) ends the game if the clock runs out
  const now = useNow(!!first?.G.turnSeconds && first.ctx.phase === 'play' && !over);
  const expired = !!first && first.ctx.phase === 'play' && !over && secondsLeft(first.G, now) === 0;
  useClaimTimeout(expired, () => clients[wanted === '0' ? 1 : 0].moves.claimTimeout?.());

  const seatClient = clients[Number(screenSeat)];
  const states = [first, useClientState(clients[1]) as unknown as FrontlineState | null];
  const seatState = states[Number(screenSeat)];
  const rawChat = seatClient.chatMessages;
  const chat = useMemo(() => ({
    lines: (rawChat ?? []).map(readChat).filter((l): l is ChatLine => l !== null),
    send: (p: ChatPayload) => seatClient.sendChatMessage?.(p),
  }), [rawChat, seatClient]);

  const shownNames = names.map((n, i) => n.trim() || `Player ${i + 1}`);
  if (curtain || !seatState) {
    return (
      <main data-testid="fl-curtain" className="fls flex! flex-col items-center justify-center gap-4 text-center">
        {/* the last combat is public (both ranks are revealed), so the mover and the next player can both read it here */}
        {first?.G.lastCombat && first.ctx.phase === 'play' && (
          <p className="max-w-[420px] rounded-md border border-[#5a6355] px-3 py-2 text-[15px]" data-testid="fl-curtain-combat">
            {combatSentenceNamed(first.G.lastCombat, { 0: shownNames[0], 1: shownNames[1] }, first.G.army)}
          </p>
        )}
        {/* so is a spot: the call and whether it was right (a miss never says what the piece really is) */}
        {first?.G.lastSpot && first.ctx.phase === 'play' && (
          <p className="max-w-[420px] rounded-md border border-[#3f6a73] px-3 py-2 text-[15px]" data-testid="fl-curtain-spot">
            {spotSentenceNamed(first.G.lastSpot, { 0: shownNames[0], 1: shownNames[1] }, first.G.army)}
          </p>
        )}
        <div className="fls-kicker">Secure handover</div>
        <p className="fls-h text-[30px]!">Pass the device to {shownNames[Number(wanted)]}</p>
        <button type="button" className={`${btnPrimary} big max-w-[360px]`} data-testid="fl-reveal" onClick={() => setShown(wanted)}>I'm {shownNames[Number(wanted)]}, show my pieces</button>
      </main>
    );
  }
  const setName = (i: number) => (v: string) => setNames(names.map((n, j) => (j === i ? v : n)));
  return (
    <FrontlineScreen key={screenSeat} state={seatState} playerID={screenSeat} moves={seatClient.moves}
      names={{ '0': shownNames[0], '1': shownNames[1] }} chat={chat}
      briefing={(
        <BriefingPanel
          fields={[
            { label: 'Olive army', value: names[0], onChange: setName(0), testid: 'fl-name-0' },
            { label: 'Tan army', value: names[1], onChange: setName(1), testid: 'fl-name-1' },
          ]}
          turnSeconds={seatState.G.turnSeconds} onTurnSeconds={(s) => clients[0].moves.setTurnLimit(s)}
          army={seatState.G.army} onArmy={(a) => clients[0].moves.setArmy(a)}
          start={{ onClick: () => clients[0].moves.begin(), hint: 'Who moves first is drawn at random.' }} />
      )}
      onExit={() => navigate('/frontline')} rematch={{ onClick: () => onRematch(seatState.G.turnSeconds ?? 0, seatState.G.army) }} />
  );
}
