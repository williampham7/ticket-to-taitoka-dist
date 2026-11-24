import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { botDeployment, chooseBotAction, FleetGame, type FleetSetupData, type FleetView, type PlayerID } from '@boboland/shared/src/fleet';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { controlsFor, viewOf, type FleetClientState } from './controls';
import { FleetScreen } from './FleetScreen';
import { BOT_MS, botDelay, effectiveFx, getFx } from './fx';
import { readPlay } from './setup';

/** vs Computer, in the browser: a Local() master with two clients; the computer's seat acts from its own client view. */
export function FleetBot() {
  const play = useMemo(() => readPlay(window.location.search), []);
  const [n, setN] = useState(0);
  return <BotMatch key={n} setup={play.setup} level={play.level} allUnlocked={play.allUnlocked} onRematch={() => setN((x) => x + 1)} />;
}

function BotMatch({ setup, level, allUnlocked, onRematch }: {
  setup: Required<FleetSetupData>; level: ReturnType<typeof readPlay>['level']; allUnlocked: boolean; onRematch: () => void;
}) {
  const party = usePartyState();
  const matchKey = useMemo(() => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, []);
  const { human, botSeat, clients } = useMemo(() => {
    const human: PlayerID = Math.random() < 0.5 ? '0' : '1';
    // Local() keeps one master per game object: a fresh object is a fresh match
    const game = { ...FleetGame, setup: (ctx: Parameters<NonNullable<typeof FleetGame.setup>>[0]) => FleetGame.setup!(ctx, setup) };
    const multiplayer = Local();
    const clients = (['0', '1'] as const).map((id) => Client({ game, numPlayers: 2, multiplayer, playerID: id, debug: false }) as unknown as BgioClient);
    return { human, botSeat: (human === '0' ? '1' : '0') as PlayerID, clients };
  }, [setup]);
  useEffect(() => {
    clients.forEach((c) => c.start());
    return () => clients.forEach((c) => c.stop());
  }, [clients]);
  const mine = clients[Number(human)];
  const bot = clients[Number(botSeat)];
  const humanState = useClientState(mine) as unknown as FleetClientState | null;
  const botState = useClientState(bot) as unknown as FleetClientState | null;
  const controls = useMemo(() => controlsFor(mine), [mine]);
  const botControls = useMemo(() => controlsFor(bot), [bot]);

  const bv = botState ? viewOf(botState) : null;
  const stage = bv?.stage;
  const deployed = bv?.sides[botSeat].deployed;
  const ready = bv?.sides[botSeat].ready;
  const botTurn = stage === 'battle' && bv?.turn === botSeat;
  const seq = bv?.seq;
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (stage === 'placement' && deployed === false) t = setTimeout(() => botControls.deploy(botDeployment(setup.mode, level, Math.random)), BOT_MS.deploy);
    else if (stage === 'roundEnd' && ready === false) t = setTimeout(() => botControls.nextRound(), BOT_MS.nextRound);
    else if (botTurn) {
      t = setTimeout(() => {
        const v = viewOf(bot.getState() as FleetClientState) as FleetView;
        if (v.stage !== 'battle' || v.turn !== botSeat) return;
        botControls.act(chooseBotAction(v, botSeat, level, Math.random));
      }, botDelay(bv?.log[bv.log.length - 1], effectiveFx(getFx())));
    }
    return () => clearTimeout(t);
  }, [stage, deployed, ready, botTurn, seq, bot, botSeat, botControls, level, setup.mode]);

  if (!humanState) return null;
  return (
    <FleetScreen view={viewOf(humanState)} me={human} kind="bot" botLevel={level} matchKey={matchKey} allUnlocked={allUnlocked} controls={controls}
      names={{ [human]: party.name?.trim() || 'You', [botSeat]: `Computer (${level})` }}
      onExit={() => navigate('/fleet')} rematch={{ onClick: onRematch }} />
  );
}
