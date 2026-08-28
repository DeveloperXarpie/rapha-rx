import { useCallback, useEffect, useRef, useState } from 'react';
import { fitScale } from '../lib/fitScale';

export interface StageBox {
  width: number;
  height: number;
}

export interface StageScale {
  scale: number;
  /** The board's rendered size, i.e. the canvas multiplied by `scale`. */
  width: number;
  height: number;
  box: StageBox;
}

/**
 * The honest size of the play box.
 *
 * Attach the returned ref to an element whose height comes from its PARENT, never from
 * its own content: in practice a `w-full h-full` div directly inside GameShell's play
 * box. Attaching it to the scaled wrapper instead closes a feedback loop - observe,
 * resize, observe - which browsers report as "ResizeObserver loop completed with
 * undelivered notifications" and which can visibly oscillate.
 *
 * This replaces the per-game effects that measured `window.innerHeight - rect.top`
 * minus a hardcoded guess at the app chrome. Four of the six v1 games carried a
 * byte-identical copy of that guess, and all of them went stale whenever the chrome
 * changed.
 */
export function useStageFit(): [(el: HTMLElement | null) => void, StageBox] {
  const [box, setBox] = useState<StageBox>({ width: 0, height: 0 });
  const elRef = useRef<HTMLElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // A zero box means the element is not laid out yet. Keep the previous value rather
    // than collapsing a board that is already on screen.
    if (rect.width <= 0 || rect.height <= 0) return;
    setBox((prev) =>
      prev.width === rect.width && prev.height === rect.height
        ? prev
        : { width: rect.width, height: rect.height },
    );
  }, []);

  /*
   * A ref callback rather than `useEffect(..., [])`, because every one of these games
   * renders a loading node while its sprites decode and mounts the real element only
   * afterwards. A mount-time `observe(ref.current)` runs against null and never
   * re-attaches; today only the window resize listener rescues those games.
   */
  const ref = useCallback(
    (el: HTMLElement | null) => {
      roRef.current?.disconnect();
      roRef.current = null;
      elRef.current = el;
      if (!el) return;
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      roRef.current = ro;
      measure();
    },
    [measure],
  );

  useEffect(() => {
    // Some browsers fire orientationchange without a matching resize on the observed
    // element. The app is portrait-locked, but the gate in RotateDevice unmounts nothing,
    // so the box behind it still has to be right when the device comes back upright.
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('orientationchange', measure);
      roRef.current?.disconnect();
      roRef.current = null;
    };
  }, [measure]);

  return [ref, box];
}

/**
 * `useStageFit` plus the uniform fit of a fixed design canvas into that box.
 *
 * `scale` is 0 until the box has been measured. Callers already render a loading state
 * while sprites decode, which covers that frame.
 */
export function useStageScale(
  canvasW: number,
  canvasH: number,
): [(el: HTMLElement | null) => void, StageScale] {
  const [ref, box] = useStageFit();
  const scale = fitScale(box.width, box.height, canvasW, canvasH);
  return [ref, { scale, width: canvasW * scale, height: canvasH * scale, box }];
}
