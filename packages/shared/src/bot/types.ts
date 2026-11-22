import type { Card, GState } from '../types';
export const BOT_LEVELS = ['easy', 'medium', 'hard'] as const;
export type BotLevel = (typeof BOT_LEVELS)[number];
export type Rng = () => number;
export interface BotCtx { phase: string | null; currentPlayer: string; activePlayers: Record<string, string> | null; gameover?: unknown }
export type BotMove =
  | { move: 'keepInitialTickets'; args: [string[]] }
  | { move: 'keepTickets'; args: [string[]] }
  | { move: 'drawBlind'; args: [] }
  | { move: 'drawFaceUp'; args: [number] }
  | { move: 'claimRoute'; args: [string, Card] }
  | { move: 'drawTickets'; args: [] }
  | { move: 'pass'; args: [] };
export type BotStep = 'initialTickets' | 'tickets' | 'secondDraw' | 'turn';
/** A level's strategy. `view` is always the bot's own playerView. Methods may return anything; index.ts legalises it. */
export interface Policy {
  keepInitial(view: GState, me: string, rng: Rng): string[];
  keepTickets(view: GState, me: string, rng: Rng): string[];
  secondDraw(view: GState, me: string, rng: Rng): BotMove;
  turn(view: GState, me: string, rng: Rng): BotMove;
}
