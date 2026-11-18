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
export const PATIENCE_BASE = 26;
export const PATIENCE_PER_ITEM = 9;

/**
 * Guest types (FINAL_SPEC D18): an urgency that does not depend on order size, which is
 * what makes "which dish first?" a real decision. Multipliers are proposals to playtest.
 */
export type GuestType = 'impatient' | 'middle' | 'patient';
export const PATIENCE_MULTIPLIER: Record<GuestType, number> = { impatient: 0.7, middle: 1, patient: 1.3 };

/** Shares of Impatient and Patient guests; the rest are Middle. */
export interface GuestMix { impatient: number; patient: number }
export const ALL_MIDDLE: GuestMix = { impatient: 0, patient: 0 };

/**
 * A guest's patience: the type's share of the order's patience, never under the
 * floor of 18 s for one dish plus 8 s per further dish, so a resident always has time
 * to notice, cook and serve (DIFFICULTY_RULES 3.5, proposal).
 */
export function guestPatience(
  type: GuestType, items: number, base = PATIENCE_BASE, perItem = PATIENCE_PER_ITEM,
): number {
  const floor = 18 + 8 * (items - 1);
  return Math.max(floor, (base + items * perItem) * PATIENCE_MULTIPLIER[type]);
}

/** Seat arrival stagger for the opening four guests. */
const OPENING_SPAWNS = [0, 1.6, 3.4, 5.2];
const RESPAWN_MIN = 0.9;
const RESPAWN_SPREAD = 1.4;

/** Walk-on and walk-off animation holds. */
const ARRIVE_SECONDS = 0.45;
const DEPART_SECONDS = 1.1;
const FLOAT_SECONDS = 1.2;
const NUDGE_SECONDS = 0.45;

/**
 * The round's tunable settings, set per level by the ladder (plan 3a). The constants
 * above are today's values and the defaults.
 */
export interface RoundConfig {
  totalGuests: number;
  /** Seconds a finished dish sits READY before it burns. */
  readyWindow: number;
  patienceBase: number;
  patiencePerItem: number;
}

export const DEFAULT_CONFIG: RoundConfig = {
  totalGuests: TOTAL_GUESTS,
  readyWindow: READY_WINDOW,
  patienceBase: PATIENCE_BASE,
  patiencePerItem: PATIENCE_PER_ITEM,
};

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
  type: GuestType;
  /** Dishes in the bubble's numbered order (1, 2, 3). */
  items: OrderItem[];
  /** False once a dish was served while an earlier-numbered one was still unserved. */
  inOrder: boolean;
  /** Total patience for this order, in seconds. */
  patience: number;
  /** Patience remaining, in seconds. */
  left: number;
  phase: GuestPhase;
  phaseT: number;
  /** Popper text (a walkout's face), or null when nothing is floating. */
  float: string | null;
  floatT: number;
}

export interface GameState {
  config: RoundConfig;
  /** Elapsed game time in seconds. */
  t: number;
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
  /** Multi-dish orders fully served, and how many of them in their numbered order (Sequencing). */
  ordersMultiDish: number;
  ordersInOrder: number;
  /** Cooks started with 2+ guests waiting, and how many were for the most urgent one (Decision-making). */
  choiceOpportunities: number;
  urgentChoices: number;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

/**
 * The counter holds this many dishes, dealt from the far larger `DISH_DEFS` pool. Dealing
 * rather than fixing the menu is what stops every round looking the same; it is the view's
 * `DISH_COUNT` and the two must agree, so the board is laid out for what the model deals.
 */
export const COUNTER_SIZE = 6;

/**
 * Deal the round's counter: `COUNTER_SIZE` distinct dishes drawn from the menu.
 *
 * The dealt set is the whole world for the round - orders are drawn from it too - so a guest
 * can never ask for something the counter cannot make.
 */
function dealCounter(rng: Rng): DishRuntime[] {
  const pool = DISH_DEFS.slice();
  const dealt: DishRuntime[] = [];
  for (let i = 0; i < COUNTER_SIZE && pool.length > 0; i++) {
    const [picked] = pool.splice(Math.floor(rng() * pool.length), 1);
    dealt.push({ id: picked.id, state: 'idle', since: 0, nudgeUntil: 0 });
  }
  return dealt;
}

/**
 * Guests are built lazily as seats open, so the only randomness here is the deal - the
 * opening stagger is fixed and the first guest is created by the first `tick`.
 */
export function createInitialState(rng: Rng = Math.random, config: RoundConfig = DEFAULT_CONFIG): GameState {
  return {
    config,
    t: 0,
    spawned: 0,
    seats: Array.from({ length: SEAT_COUNT }, () => null),
    nextSpawn: OPENING_SPAWNS.slice(0, SEAT_COUNT),
    dishes: dealCounter(rng),
    done: false,
    itemsServed: 0,
    itemsRequested: 0,
    guestsFullyServed: 0,
    dishesBurnt: 0,
    walkouts: 0,
    ordersMultiDish: 0,
    ordersInOrder: 0,
    choiceOpportunities: 0,
    urgentChoices: 0,
  };
}

function pickType(mix: GuestMix, rng: Rng): GuestType {
  const r = rng();
  if (r < mix.impatient) return 'impatient';
  return r < mix.impatient + mix.patient ? 'patient' : 'middle';
}

function makeGuest(
  index: number, maxItemsPerGuest: number, counter: DishRuntime[], rng: Rng, mix: GuestMix,
  config: RoundConfig,
): Guest {
  const count = Math.max(1, Math.min(maxItemsPerGuest, 1 + Math.floor(rng() * maxItemsPerGuest)));
  // Orders come off the dealt counter, not the whole menu, so every item is servable.
  const pool = counter.map((d) => d.id);
  const items: OrderItem[] = [];
  for (let k = 0; k < count && pool.length > 0; k++) {
    const [picked] = pool.splice(Math.floor(rng() * pool.length), 1);
    items.push({ dishId: picked, served: false });
  }
  const type = pickType(mix, rng);
  const patience = guestPatience(type, items.length, config.patienceBase, config.patiencePerItem);
  return {
    id: `g${index}`,
    faceIndex: Math.floor(rng() * FACE_COUNT),
    type,
    items,
    inOrder: true,
    patience,
    left: patience,
    phase: 'in',
    phaseT: 0,
    float: null,
    floatT: 0,
  };
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

export function tick(
  state: GameState, dt: number, maxItemsPerGuest: number, rng: Rng = Math.random,
  mix: GuestMix = ALL_MIDDLE,
): GameState {
  if (state.done) return state;

  const t = state.t + dt;
  const seats = state.seats.slice();
  const nextSpawn = state.nextSpawn.slice();
  let { spawned, itemsRequested, walkouts } = state;

  for (let i = 0; i < SEAT_COUNT; i++) {
    const current = seats[i];

    if (!current) {
      if (spawned < state.config.totalGuests && t >= nextSpawn[i]) {
        const guest = makeGuest(spawned, maxItemsPerGuest, state.dishes, rng, mix, state.config);
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
    if (d.state === 'ready' && t - d.since >= state.config.readyWindow) {
      dishesBurnt++;
      return { ...d, state: 'burnt' as const, since: t };
    }
    return d;
  });

  const done = spawned >= state.config.totalGuests && seats.every((s) => s === null);

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
    const choice = dish.state === 'idle' ? cookChoice(state, dish.id) : null;
    return {
      ...state,
      dishes,
      choiceOpportunities: state.choiceOpportunities + (choice ? 1 : 0),
      urgentChoices: state.urgentChoices + (choice === 'urgent' ? 1 : 0),
    };
  }

  /*
   * ready: the neediest guest who still wants this dish. A guest for whom it is the
   * next numbered dish comes first, so the game's own routing never marks an order out
   * of sequence on the resident's behalf; among equals, the least patient wins.
   */
  let bestSeat = -1;
  let bestItem = -1;
  let bestKey = [Infinity, Infinity];
  state.seats.forEach((guest, seat) => {
    if (!guest || guest.phase === 'out' || guest.phase === 'happy') return;
    const item = guest.items.findIndex((it) => it.dishId === dish.id && !it.served);
    if (item < 0) return;
    const isNext = guest.items.findIndex((it) => !it.served) === item;
    const key = [isNext ? 0 : 1, guest.left];
    if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
      bestSeat = seat;
      bestItem = item;
      bestKey = key;
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
  const earlierUnserved = source.items.slice(0, bestItem).some((it) => !it.served);
  const items = source.items.slice();
  items[bestItem] = { ...items[bestItem], served: true };
  const guest: Guest = { ...source, items, inOrder: source.inOrder && !earlierUnserved };

  let { guestsFullyServed, ordersMultiDish, ordersInOrder } = state;

  if (items.every((it) => it.served)) {
    guestsFullyServed++;
    if (items.length > 1) {
      ordersMultiDish++;
      if (guest.inOrder) ordersInOrder++;
    }
    guest.phase = 'happy';
    guest.phaseT = 0;
  }

  seats[bestSeat] = guest;
  dishes[index] = { ...dish, state: 'idle', since: state.t };

  return {
    ...state,
    seats,
    dishes,
    guestsFullyServed,
    ordersMultiDish,
    ordersInOrder,
    itemsServed: state.itemsServed + 1,
  };
}

/**
 * Whether starting this cook was a choice between guests, and if so whether it served
 * the most urgent one. Only guests still waiting on a dish that is not already cooking
 * or ready count: a guest whose dishes are all on the go needs no decision.
 */
function cookChoice(state: GameState, dishId: string): 'urgent' | 'other' | null {
  const onTheGo = new Set(state.dishes
    .filter((d) => d.state === 'cooking' || d.state === 'ready').map((d) => d.id));
  const needy = state.seats
    .filter((g): g is Guest => !!g && g.phase === 'wait')
    .map((g) => ({ g, wants: g.items.filter((it) => !it.served && !onTheGo.has(it.dishId)) }))
    .filter((x) => x.wants.length > 0);
  if (needy.length < 2) return null;
  const urgent = needy.reduce((a, b) => (b.g.left < a.g.left ? b : a));
  return urgent.wants.some((it) => it.dishId === dishId) ? 'urgent' : 'other';
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
  return Math.max(0, Math.min(1, (elapsed - (state.config.readyWindow - SPOIL_RAMP)) / SPOIL_RAMP));
}

/** Guests who have arrived and left, i.e. how many of the round's eight are behind us. */
export function guestsHandled(state: GameState): number {
  return state.spawned - state.seats.filter(Boolean).length;
}
