import type { GardenKeeperDynamicParams } from '../../../lib/dynamicDifficulty';

/** How long a missed plant stays browned and drooping before it returns to seed. */
export const DRIED_HOLD_MS = 2600;

export type Stage = 'seed' | 'sprouted' | 'dried';
export type Outcome = 'complete' | 'time' | 'hearts';

export interface CycleRecord {
  stage: Stage;
  /** When this plant sprouted, for the reaction time. */
  thirstyAt: number | null;
  /** Wall-clock deadline for the current stage, not a countdown. */
  until: number | null;
  /** Increments on every sprout; keys the entry animation so it restarts. */
  seq: number;
}

export interface RoundState {
  phase: 'intro' | 'playing' | 'done';
  cycles: Record<string, CycleRecord>;
  watered: number;
  falseTaps: number;
  driedUp: number;
  reactions: number[];
  lives: number;
  /** Authoritative round end, epoch ms. */
  deadline: number;
  /** Display only, seconds. */
  timeLeft: number;
  outcome: Outcome | null;
}

export type RoundAction =
  | { type: 'start'; now: number; plantIds: string[]; params: GardenKeeperDynamicParams }
  | { type: 'tick'; now: number }
  | { type: 'sprout'; now: number; id: string; thirstWindowMs: number }
  | { type: 'water'; now: number; id: string }
  | { type: 'falseTap' }
  | { type: 'resume'; now: number }
  | { type: 'finish'; now: number; outcome: Outcome };

const SEED: CycleRecord = { stage: 'seed', thirstyAt: null, until: null, seq: 0 };

export function timeLeftSeconds(deadline: number, now: number): number {
  return Math.max(0, (deadline - now) / 1000);
}

export function initialRoundState(params: GardenKeeperDynamicParams): RoundState {
  return {
    phase: 'intro',
    cycles: {},
    watered: 0,
    falseTaps: 0,
    driedUp: 0,
    reactions: [],
    lives: params.lives,
    deadline: 0,
    timeLeft: params.roundDurationMs / 1000,
    outcome: null,
  };
}

export function roundReducer(s: RoundState, a: RoundAction): RoundState {
  switch (a.type) {
    case 'start': {
      const cycles: Record<string, CycleRecord> = {};
      for (const id of a.plantIds) cycles[id] = { ...SEED };
      return {
        phase: 'playing',
        cycles,
        watered: 0,
        falseTaps: 0,
        driedUp: 0,
        reactions: [],
        lives: a.params.lives,
        deadline: a.now + a.params.roundDurationMs,
        timeLeft: a.params.roundDurationMs / 1000,
        outcome: null,
      };
    }

    case 'tick': {
      if (s.phase !== 'playing') return s;
      let changed = false;
      let driedNow = 0;
      const cycles: Record<string, CycleRecord> = { ...s.cycles };
      for (const [id, c] of Object.entries(s.cycles)) {
        if (c.until === null || a.now < c.until) continue;
        if (c.stage === 'sprouted') {
          // The window closed unwatered. It browns and droops, and costs no heart.
          cycles[id] = { stage: 'dried', thirstyAt: null, until: a.now + DRIED_HOLD_MS, seq: c.seq };
          driedNow++;
          changed = true;
        } else if (c.stage === 'dried') {
          cycles[id] = { stage: 'seed', thirstyAt: null, until: null, seq: c.seq };
          changed = true;
        }
      }
      const timeLeft = timeLeftSeconds(s.deadline, a.now);
      if (!changed && Math.abs(timeLeft - s.timeLeft) < 0.08) return s;
      return { ...s, cycles, driedUp: s.driedUp + driedNow, timeLeft };
    }

    case 'sprout': {
      if (s.phase !== 'playing') return s;
      const c = s.cycles[a.id];
      if (!c || c.stage !== 'seed') return s;
      return {
        ...s,
        cycles: {
          ...s.cycles,
          [a.id]: { stage: 'sprouted', thirstyAt: a.now, until: a.now + a.thirstWindowMs, seq: c.seq + 1 },
        },
      };
    }

    case 'water': {
      if (s.phase !== 'playing') return s;
      const c = s.cycles[a.id];
      // Watering is valid only while the plant is sprouted and its ring is still closing.
      if (!c || c.stage !== 'sprouted' || c.thirstyAt === null) return s;
      return {
        ...s,
        cycles: { ...s.cycles, [a.id]: { stage: 'seed', thirstyAt: null, until: null, seq: c.seq } },
        watered: s.watered + 1,
        reactions: [...s.reactions, a.now - c.thirstyAt],
      };
    }

    case 'falseTap': {
      if (s.phase !== 'playing') return s;
      return { ...s, falseTaps: s.falseTaps + 1, lives: Math.max(0, s.lives - 1) };
    }

    case 'resume': {
      if (s.phase !== 'playing') return s;
      // The ticker was throttled while the tab was hidden, so any window that elapsed
      // offscreen was never seen. Forgive it back to seed rather than scoring it as
      // dried: the player never had the chance the score would be assuming.
      const cycles: Record<string, CycleRecord> = { ...s.cycles };
      for (const [id, c] of Object.entries(s.cycles)) {
        if (c.stage === 'sprouted' && c.until !== null && a.now >= c.until) {
          cycles[id] = { stage: 'seed', thirstyAt: null, until: null, seq: c.seq };
        }
      }
      return { ...s, cycles, timeLeft: timeLeftSeconds(s.deadline, a.now) };
    }

    case 'finish': {
      if (s.phase !== 'playing') return s;
      const cycles: Record<string, CycleRecord> = {};
      for (const [id, c] of Object.entries(s.cycles)) cycles[id] = { ...SEED, seq: c.seq };
      return {
        ...s,
        phase: 'done',
        cycles,
        outcome: a.outcome,
        // Never leave a stale clock behind the card: the ticker may have been throttled.
        timeLeft: a.outcome === 'time' ? 0 : timeLeftSeconds(s.deadline, a.now),
      };
    }

    default:
      return s;
  }
}

/**
 * Choose the next plant to bring up, or null if the bed is already at its concurrency
 * ceiling or has nothing dormant. `rand` is injected so spawn order can be pinned.
 */
export function pickSproutId(
  cycles: Record<string, CycleRecord>,
  maxConcurrentThirsty: number,
  rand: () => number = Math.random,
): string | null {
  const up = Object.values(cycles).filter((c) => c.stage === 'sprouted').length;
  if (up >= maxConcurrentThirsty) return null;
  const free = Object.keys(cycles).filter((id) => cycles[id].stage === 'seed');
  if (!free.length) return null;
  return free[Math.floor(rand() * free.length)];
}

export function meanReactionMs(reactions: number[]): number {
  if (!reactions.length) return 0;
  return Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length);
}

export interface GardenKeeperMetrics {
  watered: number;
  targetCount: number;
  falseTaps: number;
  driedUp: number;
  meanReactionMs: number;
  livesLeft: number;
}

export function buildMetrics(s: RoundState, params: GardenKeeperDynamicParams): GardenKeeperMetrics {
  return {
    watered: s.watered,
    targetCount: params.targetCount,
    falseTaps: s.falseTaps,
    driedUp: s.driedUp,
    meanReactionMs: meanReactionMs(s.reactions),
    livesLeft: s.lives,
  };
}

/**
 * Completion weighted against precision. Precision is 1 when there is no evidence
 * either way, so a player who never engaged is not additionally punished for
 * imprecision they never demonstrated.
 */
export function gardenKeeperPerformance(m: Pick<GardenKeeperMetrics, 'watered' | 'targetCount' | 'falseTaps'>): number {
  const hitRatio = m.watered / Math.max(1, m.targetCount);
  const attempts = m.watered + m.falseTaps;
  const precision = attempts === 0 ? 1 : m.watered / attempts;
  return Math.max(0, Math.min(1, (hitRatio + precision) / 2));
}
