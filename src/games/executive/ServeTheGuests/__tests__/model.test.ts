import { describe, it, expect } from 'vitest';
import {
  bandPool, COOK_BANDS, createInitialState, DEFAULT_CONFIG, guestPatience, tapDish, tick, type GameState, type Guest,
} from '../model';
import { DISH_BY_ID } from '../sprites';

/** A fixed counter: index 0 ready, 1 ready, 2 idle, 3 idle. */
function stateWith(guests: (Guest | null)[], dishStates: ('idle' | 'ready' | 'cooking')[]): GameState {
  const base = createInitialState(() => 0.5);
  return {
    ...base,
    t: 10,
    seats: [...guests, ...Array(4 - guests.length).fill(null)],
    dishes: base.dishes.map((d, i) => ({ ...d, state: dishStates[i] ?? 'idle', since: 0 })),
  };
}

function guest(id: string, left: number, dishIds: string[]): Guest {
  return {
    id, faceIndex: 0, type: 'middle', inOrder: true,
    items: dishIds.map((dishId) => ({ dishId, served: false })),
    patience: 40, left, phase: 'wait', phaseT: 0, float: null, floatT: 0,
  };
}

const ids = createInitialState(() => 0.5).dishes.map((d) => d.id);
const [A, B, C, D] = ids;

describe('guestPatience (DIFFICULTY_RULES 3.5)', () => {
  it('never drops under the floor of 18 s plus 8 s per further dish', () =>
    expect(guestPatience('impatient', 3, 22, 8)).toBe(34));
  it('scales a patient guest up', () => expect(guestPatience('patient', 1, 26, 9)).toBe(45.5));
  it('leaves a middle guest at the base', () => expect(guestPatience('middle', 2, 26, 9)).toBe(44));
});

describe('points are gone (D23)', () => {
  it('keeps no score in the state', () => expect('score' in createInitialState(() => 0.5)).toBe(false));
});

describe('sequencing: numbered dishes (FINAL_SPEC 7.1a)', () => {
  it('counts an order served out of its numbered order', () => {
    let s = stateWith([guest('g1', 30, [A, B])], ['ready', 'ready']);
    s = tapDish(s, 1); // B, the second dish, first
    s = tapDish(s, 0);
    expect(s.ordersMultiDish).toBe(1);
    expect(s.ordersInOrder).toBe(0);
  });

  it('counts an order served in its numbered order', () => {
    let s = stateWith([guest('g1', 30, [A, B])], ['ready', 'ready']);
    s = tapDish(s, 0);
    s = tapDish(s, 1);
    expect(s.ordersMultiDish).toBe(1);
    expect(s.ordersInOrder).toBe(1);
  });

  it('routes a dish to a guest for whom it is next, before an earlier-listed guest', () => {
    // g1 is less patient but B is g1's second dish; g2 wants B next. Serving B to g2
    // keeps g1's order intact instead of marking it out of order on the game's choice.
    const s = tapDish(stateWith([guest('g1', 10, [A, B]), guest('g2', 20, [B])], ['idle', 'ready']), 1);
    expect(s.seats[1]!.items[0].served).toBe(true);
    expect(s.seats[0]!.items[1].served).toBe(false);
  });

  it('still serves the least patient guest when the dish is next for nobody', () => {
    const s = tapDish(stateWith([guest('g1', 10, [A, B]), guest('g2', 20, [C, B])], ['idle', 'ready']), 1);
    expect(s.seats[0]!.items[1].served).toBe(true);
  });
});

describe('decision-making: which dish is cooked first (FINAL_SPEC 7.1)', () => {
  it('logs cooking the most urgent guest’s dish', () => {
    const s = tapDish(stateWith([guest('g1', 10, [C]), guest('g2', 20, [D])], ['idle', 'idle']), 2);
    expect(s.choiceOpportunities).toBe(1);
    expect(s.urgentChoices).toBe(1);
  });

  it('logs cooking a less urgent guest’s dish', () => {
    const s = tapDish(stateWith([guest('g1', 10, [C]), guest('g2', 20, [D])], ['idle', 'idle']), 3);
    expect(s.choiceOpportunities).toBe(1);
    expect(s.urgentChoices).toBe(0);
  });

  it('judges urgency only on dishes not already on the go', () => {
    // g1's only dish is already cooking, so g2 is the most urgent guest still waiting on
    // a choice, and cooking g2's dish (over g3's) is the right call.
    const s = tapDish(stateWith(
      [guest('g1', 10, [A]), guest('g2', 20, [D]), guest('g3', 30, [C])],
      ['cooking', 'idle'],
    ), 3);
    expect(s.choiceOpportunities).toBe(1);
    expect(s.urgentChoices).toBe(1);
  });

  it('is no choice once only one guest still needs a dish started', () => {
    const s = tapDish(stateWith([guest('g1', 10, [A]), guest('g2', 20, [D])], ['cooking', 'idle']), 3);
    expect(s.choiceOpportunities).toBe(0);
  });

  it('is no choice with a single guest waiting', () => {
    const s = tapDish(stateWith([guest('g1', 10, [C])], ['idle', 'idle']), 2);
    expect(s.choiceOpportunities).toBe(0);
  });
});

describe('round config from the ladder (plan 3a)', () => {
  it('ends the round after the configured number of guests', () => {
    let s = createInitialState(() => 0.5, { ...DEFAULT_CONFIG, totalGuests: 1 });
    for (let i = 0; i < 2000 && !s.done; i++) s = tick(s, 0.5, 1, () => 0.5);
    expect(s.done).toBe(true);
    expect(s.spawned).toBe(1);
  });

  it('burns a ready dish after the configured ready window', () => {
    const base = createInitialState(() => 0.5, { ...DEFAULT_CONFIG, readyWindow: 5 });
    const s = { ...base, t: 0, dishes: base.dishes.map((d, i) => (i === 0 ? { ...d, state: 'ready' as const, since: 0 } : d)) };
    expect(tick(s, 4.9, 1, () => 0.5).dishes[0].state).toBe('ready');
    expect(tick(s, 5.1, 1, () => 0.5).dishes[0].state).toBe('burnt');
  });

  it('gives guests the configured patience', () => {
    const s = tick(createInitialState(() => 0.5, { ...DEFAULT_CONFIG, patienceBase: 40, patiencePerItem: 10 }), 0.1, 1, () => 0.5);
    const g = s.seats.find(Boolean)!;
    expect(g.patience).toBe(guestPatience('middle', g.items.length, 40, 10));
  });
});

describe('round settings from the ladder (plan 3b)', () => {
  /** A seeded generator, so a draw-heavy test is repeatable. */
  function lcg(seed: number) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  }
  const run = (config: Partial<typeof DEFAULT_CONFIG>, maxItems: number, seed = 7, seconds = 400) => {
    const rng = lcg(seed);
    let s = createInitialState(rng, { ...DEFAULT_CONFIG, ...config });
    const seen: GameState[] = [s];
    for (let i = 0; i < seconds * 10 && !s.done; i++) { s = tick(s, 0.1, maxItems, rng); seen.push(s); }
    return { first: seen[0], seen };
  };

  it('seats only as many guests as the level allows', () => {
    const { first, seen } = run({ seats: 2, totalGuests: 6 }, 1);
    expect(first.seats).toHaveLength(2);
    for (const s of seen) expect(s.seats.length).toBe(2);
    expect(seen[seen.length - 1].spawned).toBe(6);
  });

  it('deals the counter size the level asks for, all distinct', () => {
    for (const counterSize of [3, 4, 5, 6]) {
      const ids = createInitialState(lcg(counterSize), { ...DEFAULT_CONFIG, counterSize }).dishes.map((d) => d.id);
      expect(ids).toHaveLength(counterSize);
      expect(new Set(ids).size).toBe(counterSize);
    }
  });

  it('keeps every order between the minimum and maximum, and servable', () => {
    for (let seed = 1; seed < 30; seed++) {
      const { first, seen } = run({ counterSize: 3, minItems: 2, seats: 3, totalGuests: 6 }, 2, seed, 120);
      const counter = new Set(first.dishes.map((d) => d.id));
      for (const g of seen.flatMap((s) => s.seats).filter((g): g is Guest => !!g)) {
        expect(g.items.length).toBe(2);
        for (const it of g.items) expect(counter.has(it.dishId)).toBe(true);
      }
    }
  });

  it('deals only short cooks from the short band, and up to 6 s from mid', () => {
    for (let seed = 1; seed < 40; seed++) {
      const short = createInitialState(lcg(seed), { ...DEFAULT_CONFIG, cookBand: 'short' });
      expect(Math.max(...short.dishes.map((d) => DISH_BY_ID[d.id].cookSeconds))).toBeLessThanOrEqual(4.5);
      const mid = createInitialState(lcg(seed), { ...DEFAULT_CONFIG, cookBand: 'mid' });
      expect(Math.max(...mid.dishes.map((d) => DISH_BY_ID[d.id].cookSeconds))).toBeLessThanOrEqual(6);
    }
  });

  it('leans the long band toward long cooks, still distinct', () => {
    const longShare = (band: 'all' | 'long') => {
      let long = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const ids = createInitialState(lcg(seed), { ...DEFAULT_CONFIG, cookBand: band }).dishes.map((d) => d.id);
        expect(new Set(ids).size).toBe(6);
        long += ids.filter((id) => DISH_BY_ID[id].cookSeconds >= 6).length;
      }
      return long / 2400;
    };
    expect(longShare('long')).toBeGreaterThan(longShare('all') + 0.1);
  });

  it('every band has enough dishes for a full counter', () => {
    for (const band of COOK_BANDS) expect(bandPool(band).length).toBeGreaterThanOrEqual(6);
  });

  it('waits the level\'s respawn gap before the next guest takes a free seat', () => {
    const rng = () => 0; // the shortest gap
    let s = createInitialState(rng, { ...DEFAULT_CONFIG, seats: 2, respawnMin: 3, respawnMax: 5 });
    s = { ...s, seats: [null, null], nextSpawn: [Infinity, Infinity] };
    const g = { ...guest('g0', 0, [s.dishes[0].id]), phase: 'out' as const, phaseT: 2 };
    s = tick({ ...s, seats: [g, null] }, 0.1, 1, rng);
    expect(s.nextSpawn[0]).toBeCloseTo(s.t + 3);
  });
});
