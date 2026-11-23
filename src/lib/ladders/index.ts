import { LADDER as MARKET_MEMORY } from './marketMemory';
import { LADDER as SPOT_FOCUS } from './spotFocus';
import { LADDER as SERVE_GUESTS } from './serveGuests';

/**
 * The numbered difficulty ladders (plan 3a). These games read their round parameters
 * from a ladder row instead of interpolating a 0-1 score. Bump the version whenever a
 * value changes; every round logs it (DIFFICULTY_RULES S9).
 */
export const LADDER_VERSION = '0.2';

const LADDERS: Record<string, readonly unknown[]> = {
  'market-memory': MARKET_MEMORY,
  'spot-focus': SPOT_FOCUS,
  'serve-guests': SERVE_GUESTS,
};

export const LADDER_GAMES = Object.keys(LADDERS);

export function isLadderGame(gameId: string): boolean {
  return gameId in LADDERS;
}

export function ladderLength(gameId: string): number {
  return LADDERS[gameId]?.length ?? 0;
}

/** The parameters for a level, clamped to the ladder. */
export function ladderParams(gameId: string, level: number): unknown {
  const ladder = LADDERS[gameId];
  if (!ladder) throw new Error(`no ladder for ${gameId}`);
  return ladder[Math.max(1, Math.min(ladder.length, level)) - 1];
}
