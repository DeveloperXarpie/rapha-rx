import type { RoundRecord } from '../db';
import { SCORED_SKILLS, type SkillId } from '../gameSkills';
import { skillScores } from './measures';

/**
 * What the scorecard (Mock 2) and the 10-minute summary (Mock 3) show, from logged
 * rounds. Pure, so every number a resident sees is tested.
 */

export type Band = 1 | 2 | 3 | 4 | 5;

/** The framework's bands, labelled with FINAL_SPEC 7.2's five words. */
export function skillBand(score: number): Band {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export const BAND_WORD_KEYS: Record<Band, string> = {
  1: 'score.band.1', 2: 'score.band.2', 3: 'score.band.3', 4: 'score.band.4', 5: 'score.band.5',
};

/** FINAL_SPEC 7.2's ten summary bands (owner chose absolute bands, 2026-11-19). */
export function headlineKey(average: number): string {
  const a = Math.round(average);
  if (a >= 100) return 'summary.headline.100';
  if (a < 20) return 'summary.headline.0';
  return `summary.headline.${Math.floor(a / 10) * 10}`;
}

export interface RingChange { delta: number; dir: 'up' | 'down' | 'none' }

/** The change since the last session, or null when there is none to compare with. */
export function ringChange(current: number, previous: number | null): RingChange | null {
  if (previous === null) return null;
  const delta = current - previous;
  return { delta, dir: delta > 0 ? 'up' : delta < 0 ? 'down' : 'none' };
}

const byGame = (rounds: RoundRecord[], gameId: string) => rounds.filter((r) => r.gameId === gameId);

/** The games of a session, in the order they were first played. */
function gamesInOrder(rounds: RoundRecord[]): string[] {
  return [...new Set([...rounds].sort((a, b) => a.at - b.at).map((r) => r.gameId))];
}

export interface CategorySummary {
  rings: { skill: SkillId; score: number; change: RingChange | null }[];
  average: number | null;
  headlineKey: string | null;
}

/** One ring per scored skill of each game played this session (D14), then the average. */
export function categorySummary(today: RoundRecord[], previous: RoundRecord[]): CategorySummary {
  const rings: CategorySummary['rings'] = [];
  for (const gameId of gamesInOrder(today)) {
    const now = skillScores(gameId, byGame(today, gameId));
    const before = skillScores(gameId, byGame(previous, gameId));
    for (const skill of SCORED_SKILLS[gameId] ?? []) {
      const score = now[skill];
      if (score === undefined) continue;
      rings.push({ skill, score, change: ringChange(score, before[skill] ?? null) });
    }
  }
  if (rings.length === 0) return { rings, average: null, headlineKey: null };
  const average = Math.round(rings.reduce((t, r) => t + r.score, 0) / rings.length);
  return { rings, average, headlineKey: headlineKey(average) };
}

export interface ScoreCardData {
  cards: { skill: SkillId; score: number; band: Band }[];
  /** The word under the cards, from the average of the cards' scores. */
  accoladeKey: string | null;
}

/**
 * The scorecard's accolade (amends 2026-11-23, "based on performance - averages"). Its
 * six words sit on the same five bands as the skill words, with the sixth, Champion!,
 * kept for a perfect 100, as the summary keeps its own top word for 100.
 */
export function accoladeKey(average: number): string {
  const a = Math.round(average);
  return `scoreCard.accolade.${a >= 100 ? 6 : skillBand(a)}`;
}

export function scoreCardData(gameId: string, today: RoundRecord[]): ScoreCardData {
  const now = skillScores(gameId, byGame(today, gameId));
  const cards = (SCORED_SKILLS[gameId] ?? [])
    .filter((skill) => now[skill] !== undefined)
    .map((skill) => ({ skill, score: now[skill]!, band: skillBand(now[skill]!) }));
  if (cards.length === 0) return { cards, accoladeKey: null };
  return { cards, accoladeKey: accoladeKey(cards.reduce((t, c) => t + c.score, 0) / cards.length) };
}

/** How many sessions the summary's History Metrics shows (owner, 2026-11-23). */
export const HISTORY_SESSIONS = 7;

export interface HistoryMetrics {
  /** The session dates shown, oldest first; the last is usually today. */
  dates: string[];
  /** One row per skill, a score per date, null where that skill was not played. */
  rows: { skill: SkillId; scores: (number | null)[] }[];
}

const GAME_OF_SKILL: Partial<Record<SkillId, string>> = Object.fromEntries(
  Object.entries(SCORED_SKILLS).flatMap(([gameId, skills]) => skills.map((s) => [s, gameId])),
);

/**
 * The summary's "HISTORY METRICS" (FINAL_SPEC 7.5, owner 2026-11-23): each of today's
 * skills as it scored in each of the last few sessions of this category. A session is
 * a day with rounds in the category, scored the same way as that day's rings.
 */
export function historyMetrics(
  rounds: RoundRecord[], skills: SkillId[], sessions = HISTORY_SESSIONS,
): HistoryMetrics {
  const dates = [...new Set(rounds.map((r) => r.date))].sort().slice(-sessions);
  const rows = skills.map((skill) => {
    const gameId = GAME_OF_SKILL[skill];
    return {
      skill,
      scores: dates.map((date) => (gameId
        ? skillScores(gameId, rounds.filter((r) => r.date === date && r.gameId === gameId))[skill] ?? null
        : null)),
    };
  });
  return { dates, rows };
}
