import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterferenceTaskProps {
  /** Fired on mount and on every re-randomisation, purely informational. */
  onPrompt?: () => void;
}

type Side = 'left' | 'right';

// ─── Constants (spec SS4.4) ───────────────────────────────────────────────────

const SMALL_PX = 96;
const LARGE_PX = 150; // ratio 1.5625 >= 1.5 required
const ROUND_INTERVAL_MS = 2500;
const ACK_MS = 180;

function randomLargeOnLeft(): boolean {
  return Math.random() < 0.5;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Self-contained neutral filler task shown during retention when a trial calls for it.
// It deliberately reports nothing — spec SS4.4 says its only job is to occupy attention.

export default function InterferenceTask({ onPrompt }: InterferenceTaskProps) {
  const { t } = useTranslation();
  const [largeOnLeft, setLargeOnLeft] = useState<boolean>(() => randomLargeOnLeft());
  const [ack, setAck] = useState<Side | null>(null);
  const onPromptRef = useRef(onPrompt);
  useEffect(() => {
    onPromptRef.current = onPrompt;
  }, [onPrompt]);

  useEffect(() => {
    onPromptRef.current?.();
    const id = setInterval(() => {
      setLargeOnLeft(randomLargeOnLeft());
      onPromptRef.current?.();
    }, ROUND_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  function handleTap(side: Side) {
    setAck(side);
    setTimeout(() => setAck((cur) => (cur === side ? null : cur)), ACK_MS);
  }

  const leftSize = largeOnLeft ? LARGE_PX : SMALL_PX;
  const rightSize = largeOnLeft ? SMALL_PX : LARGE_PX;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 p-8">
      <p className="text-h2 font-semibold text-body-text text-center">
        {t('pp.interference.prompt', 'Tap the larger circle')}
      </p>
      <div className="flex items-center justify-center gap-12">
        {(['left', 'right'] as const).map((side) => {
          const size = side === 'left' ? leftSize : rightSize;
          return (
            <button
              key={side}
              type="button"
              onPointerUp={() => handleTap(side)}
              aria-label={t('pp.interference.circle', 'Circle')}
              className="rounded-full bg-primary-blue border border-blue-700 flex-shrink-0 transition-transform duration-150"
              style={{
                width: size,
                height: size,
                minWidth: SMALL_PX,
                minHeight: SMALL_PX,
                transform: ack === side ? 'scale(0.88)' : 'scale(1)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
