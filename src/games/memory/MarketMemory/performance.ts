/**
 * Shopping List's performance ratio for the difficulty score (0..1).
 *
 * Recall less a penalty per wrong pick. A round where a hint was used scores half
 * (owner, 2026-11-18), replacing the old -0.05 per hint: a hint shows an answer, so a
 * hinted round says little about memory.
 */
export function marketMemoryPerformance(m: {
  correct: number; listLength: number; wrong: number; hintsUsed: number;
}): number {
  const raw = m.correct / Math.max(1, m.listLength) - m.wrong * 0.15;
  const clamped = Math.max(0, Math.min(1, raw));
  return m.hintsUsed > 0 ? clamped * 0.5 : clamped;
}
