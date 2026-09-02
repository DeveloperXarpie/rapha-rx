import type { CSSProperties, ReactNode } from 'react';

/**
 * The portrait canvas every redesigned screen lives on.
 *
 * The handoff is drawn at 360x780 and says to design for a 360pt baseline and
 * let it scale. On a phone that is the whole viewport and this frame does
 * nothing. On a tablet held upright, and on a desktop browser, an unconstrained
 * screen stretches into a shape the design was never drawn for - the reason the
 * screens before the redesign all carried `max-w-xl mx-auto`.
 *
 * So the surface itself is the column: the gradient, the wave and the content
 * are all inside it, and what sits outside is a plain backdrop. That reads as
 * one upright surface rather than a phone layout smeared across a wide window.
 */
const MAX_WIDTH = 560;

interface Props {
  /** Painted behind the column on wide viewports. */
  backdrop?: string;
  /** Applied to the column itself - the gradient or full-bleed art. */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export default function PortraitFrame({
  backdrop = '#091A3C', className = '', style, children,
}: Props) {
  return (
    <div
      className="flex-1 min-h-0 flex flex-col items-center"
      style={{ background: backdrop }}
    >
      <div
        className={`flex-1 min-h-0 flex flex-col ${className}`}
        style={{
          width: '100%',
          maxWidth: MAX_WIDTH,
          position: 'relative',
          overflowX: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}
