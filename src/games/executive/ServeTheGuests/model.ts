/**
 * Pure game model for Serve the Guests.
 *
 * Nothing here touches the DOM, React or the clock: `tick` is handed a delta and every
 * transition returns a fresh state. The view owns the loop; this owns the rules.
 */

import { DISH_BY_ID, DISH_DEFS, FACE_COUNT } from './sprites';

// ─── Tuning ───────────────────────────────────────────────────────────────────

export const SEAT_COUNT = 4;
export const TOTAL_GUESTS = 8;

/** Seconds a finished dish sits READY before it burns. */
export const READY_WINDOW = 11;

/**
 * Seconds at the end of the READY window over which the dish visibly spoils. The mould
 * creeps in while there is still time to serve, so it warns rather than just reports.
 */
export const SPOIL_RAMP = 3;

/** Patience is scaled by order size so a three-dish order is not impossible. */
const PATIENCE_BASE = 26;
const PATIENCE_PER_ITEM = 9;

/** Seat arrival stagger for the opening four guests. */
const OPENING_SPAWNS = [0, 1.6, 3.4, 5.2];
const RESPAWN_MIN = 0.9;
const RESPAWN_SPREAD = 1.4;

/** Walk-on and walk-off animation holds. */
const ARRIVE_SECONDS = 0.45;
const DEPART_SECONDS = 1.1;
const FLOAT_SECONDS = 1.2;
const NUDGE_SECONDS = 0.45;

const POINTS_PER_ITEM = 10;
const COMPLETION_BONUS = 10;
const SPEED_BONUS_MAX = 20;

export type Rng = () => number;

// ─── Types ────────────────────────────────────────────────────────────────────

export type DishState = 'idle' | 'cooking' | 'ready' | 'burnt';

export interface DishRuntime {
  id: string;
  state: DishState;
  /** Game time at which the current state was entered. */
  since: number;
  /** Game time until which the card plays its "nobody ordered this" nudge. */
  nudgeUntil: number;
}

export type GuestPhase = 'in' | 'wait' | 'happy' | 'out';

export interface OrderItem {
  dishId: string;
  served: boolean;
}

export interface Guest {
  id: string;
  faceIndex: number;
  items: OrderItem[];
  /** Total patience for this order, in seconds. */
  patience: number;
  /** Patience remaining, in seconds. */
  left: number;
  phase: GuestPhase;
  phaseT: number;
  /** Score popper text, or null when nothing is floating. */
  float: string | null;
  floatT: number;
}

export interface GameState {
  /** Elapsed game time in seconds. */
  t: number;
  score: number;
  spawned: number;
  seats: (Guest | null)[];
  nextSpawn: number[];
  dishes: DishRuntime[];
  done: boolean;
  itemsServed: number;
  itemsRequested: number;
  guestsFullyServed: number;
  dishesBurnt: number;
  walkouts: number;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

/**
 * Guests are built lazily as seats open, so nothing random happens here - the opening
 * stagger is fixed and the first guest is created by the first `tick`.
 */
export function createInitialState(): GameState {
  return {
    t: 0,
    score: 0,
    spawned: 0,
    seats: Array.from({ length: SEAT_COUNT }, () => null),
    nextSpawn: OPENING_SPAWNS.slice(0, SEAT_COUNT),
    dishes: DISH_DEFS.map((d) => ({ id: d.id, state: 'idle' as const, since: 0, nudgeUntil: 0 })),
    done: false,
    itemsServed: 0,
    itemsRequested: 0,
    guestsFullyServed: 0,
    dishesBurnt: 0,
    walkouts: 0,
  };
}

function makeGuest(index: number, maxItemsPerGuest: number, rng: Rng): Guest {
  const count = Math.max(1, Math.min(maxItemsPerGuest, 1 + Math.floor(rng() * maxItemsPerGuest)));
  const pool = DISH_DEFS.slice();
  const items: OrderItem[] = [];
  for (let k = 0; k < count && pool.length > 0; k++) {
    const [picked] = pool.splice(Math.floor(rng() * pool.length), 1);
    items.push({ dishId: picked.id, served: false });
  }
  const patience = PATIENCE_BASE + items.length * PATIENCE_PER_ITEM;
  return {
    id: `g${index}`,
    faceIndex: Math.floor(rng() * FACE_COUNT),
    items,
    patience,
    left: patience,
    phase: 'in',
    phaseT: 0,
    float: null,
    floatT: 0,
  };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

export function tick(state: GameState, dt: number, maxItemsPerGuest: number, rng: Rng = Math.random): GameState {
  if (state.done) return state;

  const t = state.t + dt;
  const seats = state.seats.slice();
  const nextSpawn = state.nextSpawn.slice();
  let { spawned, itemsRequested, walkouts } = state;

  for (let i = 0; i < SEAT_COUNT; i++) {
    const current = seats[i];

    if (!current) {
      if (spawned < TOTAL_GUESTS && t >= nextSpawn[i]) {
        const guest = makeGuest(spawned, maxItemsPerGuest, rng);
        seats[i] = guest;
        itemsRequested += guest.items.length;
        spawned++;
      }
      continue;
    }

    const g: Guest = { ...current, phaseT: current.phaseT + dt };

    if (g.phase === 'in') {
      if (g.phaseT > ARRIVE_SECONDS) {
        g.phase = 'wait';
        g.phaseT = 0;
      }
    } else if (g.phase === 'wait') {
      g.left = g.left - dt;
      if (g.left <= 0) {
        g.left = 0;
        g.phase = 'out';
        g.phaseT = 0;
        g.float = '😞';
        g.floatT = 0;
        walkouts++;
      }
    } else if (g.phaseT > DEPART_SECONDS) {
      // 'happy' and 'out' both hold briefly, then free the seat.
      seats[i] = null;
      nextSpawn[i] = t + RESPAWN_MIN + rng() * RESPAWN_SPREAD;
      continue;
    }

    if (g.float !== null) {
      g.floatT += dt;
      if (g.floatT > FLOAT_SECONDS) g.float = null;
    }

    seats[i] = g;
  }

  let dishesBurnt = state.dishesBurnt;
  const dishes = state.dishes.map((d) => {
    const def = DISH_BY_ID[d.id];
    if (d.state === 'cooking' && t - d.since >= def.cookSeconds) {
      return { ...d, state: 'ready' as const, since: t };
    }
    if (d.state === 'ready' && t - d.since >= READY_WINDOW) {
      dishesBurnt++;
      return { ...d, state: 'burnt' as const, since: t };
    }
    return d;
  });

  const done = spawned >= TOTAL_GUESTS && seats.every((s) => s === null);

  return {
    ...state,
    t,
    spawned,
    seats,
    nextSpawn,
    dishes,
    dishesBurnt,
    itemsRequested,
    walkouts,
    done,
  };
}

// ─── Interaction ──────────────────────────────────────────────────────────────

/**
 * The single interaction: tap a dish card.
 *
 * - idle    -> start cooking
 * - cooking -> ignored (a cooking dish cannot be hurried or cancelled)
 * - burnt   -> clear the card back to idle
 * - ready   -> serve the waiting guest with the least patience left who ordered it
 */
export function tapDish(state: GameState, index: number): GameState {
  if (state.done) return state;
  const dish = state.dishes[index];
  if (!dish) return state;

  if (dish.state === 'cooking') return state;

  if (dish.state === 'idle' || dish.state === 'burnt') {
    const dishes = state.dishes.slice();
    dishes[index] = {
      ...dish,
      state: dish.state === 'idle' ? 'cooking' : 'idle',
      since: state.t,
    };
    return { ...state, dishes };
  }

  // ready: find the neediest guest who still wants this dish.
  let bestSeat = -1;
  let bestItem = -1;
  let bestLeft = Infinity;
  state.seats.forEach((guest, seat) => {
    if (!guest || guest.phase === 'out' || guest.phase === 'happy') return;
    const item = guest.items.findIndex((it) => it.dishId === dish.id && !it.served);
    if (item >= 0 && guest.left < bestLeft) {
      bestSeat = seat;
      bestItem = item;
      bestLeft = guest.left;
    }
  });

  const dishes = state.dishes.slice();

  if (bestSeat < 0) {
    // Nobody ordered it. Nudge the card and leave it READY - no penalty beyond the
    // seconds burned off its ready window.
    dishes[index] = { ...dish, nudgeUntil: state.t + NUDGE_SECONDS };
    return { ...state, dishes };
  }

  const seats = state.seats.slice();
  const source = seats[bestSeat] as Guest;
  const items = source.items.slice();
  items[bestItem] = { ...items[bestItem], served: true };
  const guest: Guest = { ...source, items, floatT: 0 };

  let score = state.score + POINTS_PER_ITEM;
  let guestsFullyServed = state.guestsFullyServed;

  if (items.every((it) => it.served)) {
    const speedBonus = Math.round(SPEED_BONUS_MAX * (guest.left / guest.patience));
    const bonus = speedBonus + COMPLETION_BONUS;
    score += bonus;
    guestsFullyServed++;
    guest.phase = 'happy';
    guest.phaseT = 0;
    guest.float = `+${POINTS_PER_ITEM + bonus}`;
  } else {
    guest.float = `+${POINTS_PER_ITEM}`;
  }

  seats[bestSeat] = guest;
  dishes[index] = { ...dish, state: 'idle', since: state.t };

  return {
    ...state,
    seats,
    dishes,
    score,
    guestsFullyServed,
    itemsServed: state.itemsServed + 1,
  };
}

// ─── Derived helpers for the view ─────────────────────────────────────────────

/** 0..1 progress through the current cook, or 0 when not cooking. */
export function cookProgress(state: GameState, dish: DishRuntime): number {
  if (dish.state !== 'cooking') return 0;
  const def = DISH_BY_ID[dish.id];
  return Math.max(0, Math.min(1, (state.t - dish.since) / def.cookSeconds));
}

/**
 * How far a dish has spoiled, 0 fresh to 1 mouldy. Ramps over the last `SPOIL_RAMP` seconds
 * of the READY window and stays at 1 once the dish has actually burnt.
 */
export function spoilProgress(state: GameState, dish: DishRuntime): number {
  if (dish.state === 'burnt') return 1;
  if (dish.state !== 'ready') return 0;
  const elapsed = state.t - dish.since;
  return Math.max(0, Math.min(1, (elapsed - (READY_WINDOW - SPOIL_RAMP)) / SPOIL_RAMP));
}

/** Guests who have arrived and left, i.e. how many of the round's eight are behind us. */
export function guestsHandled(state: GameState): number {
  return state.spawned - state.seats.filter(Boolean).length;
}
