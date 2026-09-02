import type { ReactNode } from 'react';
import WaveOverlay from './WaveOverlay';

interface Props {
  /** `splash` uses the taller, differently-stopped wash and the taller wave. */
  variant?: 'default' | 'splash';
  className?: string;
  children: ReactNode;
}

/**
 * The standard blue page frame: radial wash and the bottom wave.
 *
 * It fills its parent rather than constraining itself. The upright column the
 * whole app sits in belongs to `.app-root` (see styles/index.css), so that
 * chrome and game boards share one frame and the width never changes when a
 * round starts - an earlier version of this component owned the column itself,
 * which made the gradient stop short of a full-width board.
 *
 * `.screen-blue` carries `position: relative` and `overflow-x: hidden`, so the
 * wave's -10% inset cannot produce sideways scroll.
 */
export default function ScreenBlue({ variant = 'default', className = '', children }: Props) {
  return (
    <div
      className={`screen-blue${variant === 'splash' ? ' screen-blue--splash' : ''} flex-1 min-h-0 flex flex-col ${className}`}
    >
      {children}
      <WaveOverlay tall={variant === 'splash'} />
    </div>
  );
}
