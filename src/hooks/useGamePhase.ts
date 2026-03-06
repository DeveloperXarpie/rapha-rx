import { useState, useRef, useCallback } from 'react';

export function useGamePhase<T extends string>(
  phases: T[],
  onPhaseChange?: (phase: T) => void,
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const phaseStartedAt = useRef<number>(Date.now());

  const currentPhase = phases[currentIndex];

  const advance = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.min(prev + 1, phases.length - 1);
      phaseStartedAt.current = Date.now();
      onPhaseChange?.(phases[next]);
      return next;
    });
  }, [phases, onPhaseChange]);

  const goTo = useCallback((phase: T) => {
    const idx = phases.indexOf(phase);
    if (idx === -1) return;
    setCurrentIndex(idx);
    phaseStartedAt.current = Date.now();
    onPhaseChange?.(phase);
  }, [phases, onPhaseChange]);

  return {
    currentPhase,
    advance,
    goTo,
    // phaseStartedAt is a ref value — NEVER render this value in the DOM
    get phaseStartedAt() { return phaseStartedAt.current; },
  };
}
