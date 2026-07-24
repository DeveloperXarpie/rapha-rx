export function streakMultiplier(streak: number): number {
  return streak >= 8 ? 1.5 : streak >= 5 ? 1.2 : 1.0;
}

export function speedBonus(softTimerMs: number | null, remainingMs: number): number {
  if (!softTimerMs) return 0;
  return Math.max(0, Math.min(40, Math.round((40 * remainingMs) / softTimerMs)));
}

export interface RoundScoreOpts {
  changesFound: number;
  responded: boolean;
  speedBonus: number;
  streak: number;
  hintsUsed: number;
  autoScaffoldTiersAboveTier1: number;
}

export function roundScore(o: RoundScoreOpts): number {
  if (!o.responded) return 0;
  const base = Math.round((100 * o.changesFound + o.speedBonus) * streakMultiplier(o.streak));
  return Math.max(10, base - 30 * o.hintsUsed - 15 * o.autoScaffoldTiersAboveTier1);
}
