import type { ReactNode } from 'react';
import WaveOverlay from './WaveOverlay';

interface Props {
  /** `splash` uses the taller, differently-stopped wash and the taller wave. */
  variant?: 'default' | 'splash';
  className?: string;
  children: ReactNode;
}

/**
 * The standard blue page frame: radial wash, bottom wave, horizontal overflow
 * clipped so the wave's -10% inset cannot produce sideways scroll.
 *
 * It is a flex column filling its parent, because AppShell renders every screen
 * inside `flex-1 min-h-0 flex flex-col` and a screen that does not fill it
 * leaves AppShell's own bg-app-bg showing at the edges.
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
