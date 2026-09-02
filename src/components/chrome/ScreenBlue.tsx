import type { ReactNode } from 'react';
import PortraitFrame from './PortraitFrame';
import WaveOverlay from './WaveOverlay';

interface Props {
  /** `splash` uses the taller, differently-stopped wash and the taller wave. */
  variant?: 'default' | 'splash';
  className?: string;
  children: ReactNode;
}

/**
 * The standard blue page frame: radial wash, bottom wave, and the portrait
 * column every redesigned screen lives in.
 *
 * Horizontal overflow is clipped by PortraitFrame so the wave's -10% inset
 * cannot produce sideways scroll.
 */
export default function ScreenBlue({ variant = 'default', className = '', children }: Props) {
  return (
    <PortraitFrame
      className={`screen-blue${variant === 'splash' ? ' screen-blue--splash' : ''} ${className}`}
    >
      {children}
      <WaveOverlay tall={variant === 'splash'} />
    </PortraitFrame>
  );
}
