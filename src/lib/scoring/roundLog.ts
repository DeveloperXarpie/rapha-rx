import { creditsTime } from '../sessionLedger';
import type { GameCategory } from '../../styles/tokens';

/**
 * Which rounds feed the skill scores: the same ones that feed the category's ten
 * minutes. Play in a completed category, Free Play after the day and debug probes
 * count for nothing (FINAL_SPEC D3, D5).
 */
export function countsForSession(args: {
  gameCategory: GameCategory; completed: string[]; debug: boolean;
}): boolean {
  return !args.debug && creditsTime(args.gameCategory, args.completed);
}
