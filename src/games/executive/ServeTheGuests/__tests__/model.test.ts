import { describe, expect, it } from 'vitest';

import { DISH_COUNT } from '../geometry';
import { COUNTER_SIZE, createInitialState, SEAT_COUNT, tick, TOTAL_GUESTS } from '../model';
import { DISH_BY_ID, DISH_DEFS } from '../sprites';

/** A deterministic stand-in for Math.random, cycling a fixed sequence. */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Run a whole round at a coarse but sub-transition step and return the final state. */
function playOut(rng: () => number) {
  let state = createInitialState(rng);
  for (let i = 0; i < 20_000 && !state.done; i++) {
    state = tick(state, 0.1, 3, rng);
  }
  return state;
}

describe('the deal', () => {
  it('lays out exactly as many cards as the board has slots', () => {
    expect(COUNTER_SIZE).toBe(DISH_COUNT);
    expect(createInitialState(seededRng(1)).dishes).toHaveLength(COUNTER_SIZE);
  });

  it('deals distinct dishes', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ids = createInitialState(seededRng(seed)).dishes.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('deals only real dishes', () => {
    for (let seed = 0; seed < 50; seed++) {
      for (const dish of createInitialState(seededRng(seed)).dishes) {
        expect(DISH_BY_ID[dish.id]).toBeDefined();
      }
    }
  });

  it('varies the counter between rounds', () => {
    const deals = new Set(
      Array.from({ length: 30 }, (_, seed) =>
        createInitialState(seededRng(seed)).dishes.map((d) => d.id).join(',')),
    );
    expect(deals.size).toBeGreaterThan(1);
  });

  it('draws from the whole menu across enough rounds', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      for (const dish of createInitialState(seededRng(seed)).dishes) seen.add(dish.id);
    }
    expect(seen.size).toBe(DISH_DEFS.length);
  });
});

describe('orders', () => {
  // The rule the deal exists to protect: a guest must never ask for something the counter
  // cannot make, or their order becomes unservable and they walk out no matter what the
  // player does.
  it('only ever asks for dishes on the counter', () => {
    for (let seed = 0; seed < 40; seed++) {
      const rng = seededRng(seed);
      let state = createInitialState(rng);
      const counter = new Set(state.dishes.map((d) => d.id));
      for (let i = 0; i < 20_000 && !state.done; i++) {
        state = tick(state, 0.1, 3, rng);
        for (const guest of state.seats) {
          if (!guest) continue;
          for (const item of guest.items) expect(counter.has(item.dishId)).toBe(true);
        }
      }
      expect(state.spawned).toBe(TOTAL_GUESTS);
    }
  });

  it('never seats more guests than there are seats', () => {
    const state = playOut(seededRng(7));
    expect(state.seats).toHaveLength(SEAT_COUNT);
    expect(state.done).toBe(true);
  });
});
