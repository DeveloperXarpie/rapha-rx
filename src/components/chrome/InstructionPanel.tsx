import type { CSSProperties, ReactNode } from 'react';
import { KIT_COLOURS } from '../../lib/uiKit';

interface InstructionPanelProps {
  /** The sentence the game is saying to the resident. */
  children: ReactNode;
  /** A second, quieter line under it. Spot Focus is the only caller that has one. */
  secondary?: ReactNode;
  /**
   * Remounts the text so its entrance animation replays. Callers pass whatever
   * identifies the current sentence - Train Yard keys on phase plus selection.
   */
  textKey?: string;
  /** Skips the entrance animation. */
  reduced?: boolean;
  /** Design-pixel font size for the main line. */
  fontSize?: number;
  /** Positioning. Absolute-canvas games pass left/top/width; flow games pass nothing. */
  style?: CSSProperties;
  className?: string;
}

/**
 * The instruction panel: deep blue, white text, one shape in every game.
 *
 * The Sep-17 review found three different plates saying the same kind of thing -
 * Train Yard's pale kit panel with a brain disc, Market Memory's pale caption box,
 * and Spot Focus's sliced wooden signboard - and asked for one blue plate with white
 * text, scaled up, everywhere. A resident who learns "the blue bar is the app talking
 * to me" on one board should not have to learn it again on the next.
 *
 * It sizes to its text rather than to a fixed height, so a sentence that wraps to two
 * lines grows the plate instead of clipping. The Sep-17 mockup of Spot Focus's
 * completion screen shows exactly that clipping happening on the old signboard.
 *
 * Positioning is the caller's business. Train Yard and Market Memory draw on a fixed
 * design canvas and pass absolute coordinates; Spot Focus and Clear The Way lay out in
 * flow and pass nothing.
 */
export default function InstructionPanel({
  children,
  secondary,
  textKey,
  reduced = false,
  fontSize = 30,
  style,
  className,
}: InstructionPanelProps) {
  return (
    <div
      className={className}
      style={{
        background: KIT_COLOURS.instruction,
        border: `3px solid ${KIT_COLOURS.instructionRim}`,
        borderRadius: 22,
        boxShadow: '0 6px 14px rgba(8, 26, 52, 0.34)',
        padding: '14px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: secondary ? 6 : 0,
        textAlign: 'center',
        ...style,
      }}
    >
      <p
        key={textKey}
        style={{
          margin: 0,
          fontFamily: "'Baloo 2', sans-serif",
          fontSize,
          fontWeight: 800,
          lineHeight: 1.24,
          color: KIT_COLOURS.instructionText,
          textWrap: 'pretty',
          animation: textKey === undefined
            ? undefined
            : reduced
              ? 'ip-fade 300ms ease-out both'
              : 'ip-slidein 320ms cubic-bezier(.2,.9,.25,1) both',
        }}
      >
        {children}
      </p>
      {secondary !== undefined && (
        <p
          style={{
            margin: 0,
            fontFamily: "'Baloo 2', sans-serif",
            fontSize: Math.round(fontSize * 0.68),
            fontWeight: 600,
            lineHeight: 1.3,
            color: 'rgba(255, 255, 255, 0.88)',
            textWrap: 'pretty',
          }}
        >
          {secondary}
        </p>
      )}
    </div>
  );
}

/**
 * The panel's two entrance animations. Mounted once by whichever game is on screen;
 * the keyframes are global, so a second copy would be harmless but pointless.
 */
export function InstructionPanelStyles() {
  return (
    <style>{`
      @keyframes ip-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes ip-slidein {
        from { opacity: 0; transform: translateY(-8px) }
        to   { opacity: 1; transform: translateY(0) }
      }
    `}</style>
  );
}
