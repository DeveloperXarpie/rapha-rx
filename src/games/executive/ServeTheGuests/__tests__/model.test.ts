import { describe, it, expect } from 'vitest';
import {
  createInitialState, guestPatience, tapDish, type GameState, type Guest,
} from '../model';

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
