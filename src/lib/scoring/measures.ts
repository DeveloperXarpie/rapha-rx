import type { SkillId } from '../gameSkills';

/**
 * Skill scores from logged rounds (FINAL_SPEC 7.1; measure only, owner 2026-11-19).
 * Each score is a whole number 0-100. A skill with nothing to judge is left out - a
 * card or ring for it would otherwise read as 0.
 */

type Metrics = Record<string, unknown>;
type Round = { metrics: Metrics };

const num = (m: Metrics, k: string) => (typeof m[k] === 'number' ? (m[k] as number) : 0);
const sum = (rounds: Round[], k: string) => rounds.reduce((t, r) => t + num(r.metrics, k), 0);
const pct = (part: number, whole: number) => Math.min(100, Math.round((part / whole) * 100));
const pooled = (rounds: Round[], part: string, whole: string): number | undefined => {
  const w = sum(rounds, whole);
  return w > 0 ? pct(sum(rounds, part), w) : undefined;
};

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Spot Focus response speed: the median gap between finds, the first timed from the
 * board, pooled over rounds. Mapped 2 s = 100 to 20 s = 0 - a provisional range for
 * spot-the-difference, whose gaps run far longer than the framework's 1-3 s.
 */
export const RESPONSE_FAST_MS = 2000;
export const RESPONSE_SLOW_MS = 20000;

function responseScore(rounds: Round[]): number | undefined {
  const gaps = rounds.flatMap((r) => {
    const times = Array.isArray(r.metrics.findTimesMs) ? (r.metrics.findTimesMs as number[]) : [];
    return times.map((t, i) => t - (i === 0 ? 0 : times[i - 1]));
  });
  const m = median(gaps);
  if (m === null) return undefined;
  const share = (RESPONSE_SLOW_MS - m) / (RESPONSE_SLOW_MS - RESPONSE_FAST_MS);
  return Math.round(Math.max(0, Math.min(1, share)) * 100);
}

function mean(xs: number[]): number | undefined {
  return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined;
}

function prune(o: Partial<Record<SkillId, number | undefined>>): Partial<Record<SkillId, number>> {
  const out: Partial<Record<SkillId, number>> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k as SkillId] = v;
  return out;
}

export function skillScores(gameId: string, rounds: Round[]): Partial<Record<SkillId, number>> {
  if (rounds.length === 0) return {};
  switch (gameId) {
    case 'market-memory': {
      const normal = rounds.filter((r) => r.metrics.secondTrip !== true);
      const trips = rounds.filter((r) => r.metrics.secondTrip === true && typeof r.metrics.retention === 'number');
      return prune({
        recall: pooled(normal, 'correct', 'listLength'),
        retention: mean(trips.map((r) => Math.min(100, r.metrics.retention as number))),
      });
    }
    case 'train-yard':
      // Sequence waits for staggered arrival (FINAL_SPEC 7.1a), which waits for art.
      return prune({ association: pooled(rounds, 'firstTryCorrect', 'totalTrains') });
    case 'spot-focus':
      return prune({
        selectiveAttention: pooled(rounds, 'differencesFound', 'totalDifferences'),
        responseTime: responseScore(rounds),
      });
    case 'serve-guests':
      return prune({
        sequencing: pooled(rounds, 'ordersInOrder', 'ordersMultiDish'),
        decisionMaking: pooled(rounds, 'urgentChoices', 'choiceOpportunities'),
      });
    case 'clear-the-way':
      return prune({
        planning: mean(rounds
          .filter((r) => num(r.metrics, 'movesUsed') > 0)
          .map((r) => Math.min(1, num(r.metrics, 'minMoves') / num(r.metrics, 'movesUsed')) * 100)),
        problemSolving: pct(
          rounds.filter((r) => num(r.metrics, 'hintsUsed') === 0 && num(r.metrics, 'resets') === 0).length,
          rounds.length,
        ),
      });
    default:
      return {};
  }
}
