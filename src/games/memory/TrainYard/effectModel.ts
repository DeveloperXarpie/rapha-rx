
/**
 * Arrival effects.
 *
 * Every scrap is identified by a module-level sequence and reaped by object identity, never
 * by id. Reusing keys across bursts lets React reuse the DOM node, and a reused node does
 * not restart its CSS animation - that is the duplicate-burst bug this game's predecessor
 * hit. Filtering by id lets a stale reaper delete a live scrap of a later burst.
 */
let FX_SEQ = 0;
export function nextFxId(): number {
  return ++FX_SEQ;
}

export type Effect =
  | { id: number; kind: 'bloom'; x: number; y: number }
  | { id: number; kind: 'dip'; x: number; y: number }
  | {
      id: number; kind: 'piece'; x: number; y: number;
      dx: number; dy: number; rot: number; colour: string; round: boolean;
      w: number; h: number; delay: number;
    };

export interface Tick { id: number; x: number; y: number; label: string }

const CONFETTI_COLOURS = ['#EDBB2A', '#F5D778', '#D7443C', '#3D7CC9', '#FFFFFF', '#5AA83F'];

/** 14 scraps from the tap point. Colour is deterministic by index; the rest is jittered. */
export function makeConfetti(x: number, y: number): Effect[] {
  const out: Effect[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.45;
    const r = 84 + Math.random() * 70;
    out.push({
      id: nextFxId(),
      kind: 'piece',
      x, y,
      dx: Math.cos(a) * r,
      dy: Math.sin(a) * r * 0.72 + 24,
      rot: (Math.random() - 0.5) * 320,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
      round: i % 3 === 0,
      w: 10 + Math.random() * 7,
      h: 6 + Math.random() * 6,
      delay: Math.random() * 90,
    });
  }
  return out;
}

/** How long each kind stays mounted, including the animation's tail. */
export function lifetime(kind: Effect['kind']): number {
  return kind === 'piece' ? 1270 : 920;
}

export const TICK_MS = 1250;
