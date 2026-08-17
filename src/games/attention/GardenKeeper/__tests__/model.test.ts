import { describe, it, expect } from 'vitest';
import { getGardenKeeperParams } from '../../../../lib/dynamicDifficulty';
import {
  DRIED_HOLD_MS, buildMetrics, gardenKeeperPerformance, initialRoundState, meanReactionMs,
  pickSproutId, roundReducer, timeLeftSeconds, type RoundState,
} from '../model';

const P = getGardenKeeperParams(0.35); // window 4880ms, target 12, 1 concurrent
const T0 = 1_700_000_000_000;
const IDS = ['p0', 'p1', 'p2'];

function started(): RoundState {
  return roundReducer(initialRoundState(P), { type: 'start', now: T0, plantIds: IDS, params: P });
}

function sprouted(at = T0 + 1000, id = 'p0'): RoundState {
  return roundReducer(started(), { type: 'sprout', now: at, id, thirstWindowMs: P.thirstWindowMs });
}

describe('start', () => {
  it('opens every flower in the seed stage with no deadline', () => {
    const s = started();
    expect(s.phase).toBe('playing');
    expect(Object.keys(s.cycles)).toEqual(IDS);
    for (const id of IDS) expect(s.cycles[id]).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 0 });
    expect(s.deadline).toBe(T0 + P.roundDurationMs);
    expect(s.lives).toBe(3);
    expect(s.watered).toBe(0);
  });
});

describe('sprout', () => {
  it('raises a seed into the waterable stage on a wall-clock deadline', () => {
    const c = sprouted().cycles.p0;
    expect(c.stage).toBe('sprouted');
    expect(c.thirstyAt).toBe(T0 + 1000);
    expect(c.until).toBe(T0 + 1000 + P.thirstWindowMs);
    expect(c.seq).toBe(1);
  });

  it('increments seq on every sprout so the entry animation restarts', () => {
    let s = sprouted();
    s = roundReducer(s, { type: 'water', now: T0 + 1500, id: 'p0' });
    s = roundReducer(s, { type: 'sprout', now: T0 + 4000, id: 'p0', thirstWindowMs: P.thirstWindowMs });
    expect(s.cycles.p0.seq).toBe(2);
  });
});

describe('tick', () => {
  it('leaves a window that has not closed alone', () => {
    const s = roundReducer(sprouted(), { type: 'tick', now: T0 + 2000 });
    expect(s.cycles.p0.stage).toBe('sprouted');
    expect(s.driedUp).toBe(0);
  });

  it('dries a window that closed unwatered and counts it', () => {
    const at = T0 + 1000 + P.thirstWindowMs;
    const s = roundReducer(sprouted(), { type: 'tick', now: at });
    expect(s.cycles.p0).toEqual({ stage: 'dried', thirstyAt: null, until: at + DRIED_HOLD_MS, seq: 1 });
    expect(s.driedUp).toBe(1);
  });

  it('costs no heart when a window is missed', () => {
    // Inattention is deliberately cheaper than impulsivity for this population.
    const s = roundReducer(sprouted(), { type: 'tick', now: T0 + 1000 + P.thirstWindowMs });
    expect(s.lives).toBe(3);
  });

  it('returns a dried plant to seed after the hold, so it can cycle again', () => {
    const driedAt = T0 + 1000 + P.thirstWindowMs;
    let s = roundReducer(sprouted(), { type: 'tick', now: driedAt });
    s = roundReducer(s, { type: 'tick', now: driedAt + DRIED_HOLD_MS });
    expect(s.cycles.p0).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 1 });
    expect(s.driedUp).toBe(1);
  });

  it('advances several plants in one tick without double counting', () => {
    let s = started();
    s = roundReducer(s, { type: 'sprout', now: T0, id: 'p0', thirstWindowMs: 1000 });
    s = roundReducer(s, { type: 'sprout', now: T0, id: 'p1', thirstWindowMs: 1000 });
    s = roundReducer(s, { type: 'tick', now: T0 + 1000 });
    expect(s.driedUp).toBe(2);
    s = roundReducer(s, { type: 'tick', now: T0 + 1000 });
    expect(s.driedUp).toBe(2);
  });

  it('ignores ticks once the round is done', () => {
    const done = roundReducer(sprouted(), { type: 'finish', now: T0 + 2000, outcome: 'time' });
    expect(roundReducer(done, { type: 'tick', now: T0 + 90000 })).toBe(done);
  });
});

describe('water', () => {
  it('scores a sprouted plant, records the reaction, and returns it to seed', () => {
    const s = roundReducer(sprouted(), { type: 'water', now: T0 + 2600, id: 'p0' });
    expect(s.watered).toBe(1);
    expect(s.reactions).toEqual([1600]);
    expect(s.cycles.p0).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 1 });
  });

  it('refuses to score a seed or a dried plant, and costs nothing', () => {
    const seed = roundReducer(started(), { type: 'water', now: T0 + 500, id: 'p1' });
    expect(seed.watered).toBe(0);
    expect(seed.lives).toBe(3);
    expect(seed.reactions).toEqual([]);
  });
});

describe('falseTap', () => {
  it('costs a heart and counts against precision', () => {
    const s = roundReducer(started(), { type: 'falseTap' });
    expect(s.lives).toBe(2);
    expect(s.falseTaps).toBe(1);
  });

  it('never drives lives below zero', () => {
    let s = started();
    for (let i = 0; i < 5; i++) s = roundReducer(s, { type: 'falseTap' });
    expect(s.lives).toBe(0);
    expect(s.falseTaps).toBe(5);
  });
});

describe('resume from a backgrounded tab', () => {
  it('forgives a window the player never saw instead of scoring it as dried', () => {
    // The ticker is throttled while hidden, so this window opened and closed offscreen.
    const s = roundReducer(sprouted(), { type: 'resume', now: T0 + 1000 + P.thirstWindowMs + 5000 });
    expect(s.cycles.p0).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 1 });
    expect(s.driedUp).toBe(0);
    expect(s.lives).toBe(3);
  });

  it('leaves a window that is still open alone', () => {
    const s = roundReducer(sprouted(), { type: 'resume', now: T0 + 2000 });
    expect(s.cycles.p0.stage).toBe('sprouted');
  });

  it('re-syncs the displayed clock from the authoritative deadline', () => {
    const s = roundReducer(sprouted(), { type: 'resume', now: T0 + 30000 });
    expect(s.timeLeft).toBeCloseTo(60, 6);
  });
});

describe('pickSproutId', () => {
  const rand = () => 0; // always the first candidate

  it('picks a dormant seed while below the concurrency ceiling', () => {
    expect(pickSproutId(started().cycles, 1, rand)).toBe('p0');
  });

  it('returns null once the ceiling is reached', () => {
    expect(pickSproutId(sprouted().cycles, 1, rand)).toBeNull();
  });

  it('allows a second plant up when the ceiling allows it', () => {
    expect(pickSproutId(sprouted().cycles, 2, rand)).toBe('p1');
  });

  it('never picks a dried plant', () => {
    const driedAt = T0 + 1000 + P.thirstWindowMs;
    const s = roundReducer(sprouted(), { type: 'tick', now: driedAt });
    expect(pickSproutId(s.cycles, 2, rand)).toBe('p1');
  });

  it('returns null when nothing is dormant', () => {
    let s = started();
    for (const id of IDS) s = roundReducer(s, { type: 'sprout', now: T0, id, thirstWindowMs: 1000 });
    expect(pickSproutId(s.cycles, 9, rand)).toBeNull();
  });
});

describe('finish', () => {
  it('zeroes the clock on a time-out so the card cannot contradict the HUD', () => {
    const s = roundReducer(sprouted(), { type: 'finish', now: T0 + 90000, outcome: 'time' });
    expect(s.timeLeft).toBe(0);
    expect(s.outcome).toBe('time');
    expect(s.phase).toBe('done');
  });

  it('reports the true remaining seconds on any other ending', () => {
    const s = roundReducer(sprouted(), { type: 'finish', now: T0 + 30000, outcome: 'complete' });
    expect(s.timeLeft).toBeCloseTo(60, 6);
  });

  it('clears the bed so no ring keeps closing behind the card', () => {
    const s = roundReducer(sprouted(), { type: 'finish', now: T0 + 5000, outcome: 'hearts' });
    expect(Object.values(s.cycles).every((c) => c.stage === 'seed')).toBe(true);
  });

  it('is idempotent - a second ending cannot overwrite the first', () => {
    const first = roundReducer(sprouted(), { type: 'finish', now: T0 + 5000, outcome: 'complete' });
    expect(roundReducer(first, { type: 'finish', now: T0 + 9000, outcome: 'time' })).toBe(first);
  });
});

describe('metrics and performance', () => {
  it('averages reaction times and rounds', () => {
    expect(meanReactionMs([1000, 1001])).toBe(1001);
    expect(meanReactionMs([])).toBe(0);
  });

  it('reports completion only when the target was reached', () => {
    const s = { ...started(), watered: 12, falseTaps: 1, driedUp: 2, reactions: [1000], lives: 2 };
    const done = { ...s, phase: 'done' as const, outcome: 'complete' as const };
    expect(buildMetrics(done, P)).toEqual({
      watered: 12, targetCount: 12, falseTaps: 1, driedUp: 2, meanReactionMs: 1000, livesLeft: 2,
    });
  });

  it('scores a clean full round at 1', () => {
    expect(gardenKeeperPerformance({ watered: 12, targetCount: 12, falseTaps: 0 })).toBeCloseTo(1, 6);
  });

  it('treats an untouched round as neutral precision rather than zero', () => {
    // Nothing watered and nothing mistapped is a player who never engaged, not a
    // player who was imprecise. Precision has no evidence, so it must not punish.
    expect(gardenKeeperPerformance({ watered: 0, targetCount: 12, falseTaps: 0 })).toBeCloseTo(0.5, 6);
  });

  it('punishes tap-spamming through precision', () => {
    expect(gardenKeeperPerformance({ watered: 4, targetCount: 12, falseTaps: 12 })).toBeCloseTo(0.29, 2);
  });

  it('never exceeds 1 when the player overshoots the target', () => {
    expect(gardenKeeperPerformance({ watered: 14, targetCount: 12, falseTaps: 0 })).toBe(1);
  });
});

describe('timeLeftSeconds', () => {
  it('never returns a negative clock', () => {
    expect(timeLeftSeconds(T0, T0 + 5000)).toBe(0);
    expect(timeLeftSeconds(T0 + 45000, T0)).toBeCloseTo(45, 6);
  });
});
