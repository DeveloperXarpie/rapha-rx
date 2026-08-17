import { CONFETTI_COLOURS } from './palette';

export interface Confetti {
  kind: 'confetti';
  id: number;
  x: number; y: number;
  dx: number; dy: number;
  rot: number;
  w: number; h: number;
  round: boolean;
  colour: string;
  delay: number;
}

export interface Toast {
  kind: 'toast';
  id: number;
  x: number; y: number;
  text: string;
}

export type Effect = Confetti | Toast;

export const CONFETTI_MS = 1150;
export const TOAST_MS = 900;
/** Reap a little after the animation ends so nothing pops mid-frame. */
export const REAP_PAD_MS = 120;

let FX_SEQ = 0;
export function nextFxId(): number {
  FX_SEQ += 1;
  return FX_SEQ;
}

const PIECES = 16;

export function makeConfetti(x: number, y: number): Confetti[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const angle = (i / PIECES) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const radius = 90 + Math.random() * 80;
    return {
      kind: 'confetti' as const,
      id: nextFxId(),
      x, y,
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius * 0.7 - 30,
      rot: (Math.random() - 0.5) * 320,
      w: 10 + Math.random() * 7,
      h: 6 + Math.random() * 6,
      round: i % 3 === 0,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
      delay: Math.random() * 90,
    };
  });
}

export function makeToast(x: number, y: number, text: string): Toast {
  return { kind: 'toast', id: nextFxId(), x, y, text };
}

export function lifetime(e: Effect): number {
  return (e.kind === 'confetti' ? CONFETTI_MS + e.delay : TOAST_MS) + REAP_PAD_MS;
}
