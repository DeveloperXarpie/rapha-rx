import type { ReactNode } from 'react';
import { COLOURS, DISPLAY_FONT } from './palette';
import {
  BG_SCENE,
  PLANK_CAP_RATIO,
  UI_PLANK_LEFT,
  UI_PLANK_MID,
  UI_PLANK_RIGHT,
} from './sprites';

interface Props {
  heading: string;
  instruction: string;
  children: ReactNode;
}

/** Height of the signboard. The caps' width follows from it, via their aspect ratio. */
const PLANK_H = 104;
/** The plank's wood inside its frame, as a fraction of the board's height. */
const PLANK_INSET = 0.16;

/**
 * The backdrop, the signboard header and the instruction line.
 *
 * The signboard is three sliced pieces, not one sprite and not CSS. It cannot be one
 * sprite because the kit paints "Can you spot the Differences?" into the wood and this
 * app ships in English, Hindi and Kannada, so the heading has to be live text over a
 * board that stretches to fit it. It should not be CSS because a drawn gradient butted
 * against two sliced caps reads as an overlap of two things rather than as one board.
 *
 * So the slicing script erases the baked heading from the plank and cuts three pieces
 * from that cleaned board over the same rows: two end caps carrying the rounded ends,
 * screws and daisy sprigs, and a middle strip that tiles between them. Rendered at one
 * height they are the same wood at the same scale, and the join does not show.
 *
 * The 12rem in the min-height is GameShell's chrome: its header, its title bar and its
 * padding. `flex-1` alone is not enough, because the shell's column is `min-h-full` and
 * that resolves to nothing without a definite height on its own parent - so on the
 * completion screen, where the content is short, the backdrop stopped halfway down and
 * left grey shell showing beneath it. ClearTheWay carries the same constant as CHROME_H.
 */
export function Scene({ heading, instruction, children }: Props) {
  const capWidth = Math.round(PLANK_H * PLANK_CAP_RATIO);

  return (
    <div
      role="main"
      className="flex min-h-[calc(100vh-12rem)] flex-1 flex-col items-center gap-3 bg-cover bg-center bg-no-repeat px-4 py-3"
      style={{
        backgroundImage: `url(${BG_SCENE})`,
        backgroundColor: COLOURS.skyMid,
      }}
    >
      <div
        className="relative flex w-full max-w-3xl items-center justify-center"
        style={{ minHeight: PLANK_H }}
      >
        {/* The middle, tiled behind everything and inset so the caps' frames overlap it. */}
        <div
          aria-hidden
          className="absolute inset-y-0"
          style={{
            left: capWidth - 2,
            right: capWidth - 2,
            backgroundImage: `url(${UI_PLANK_MID})`,
            backgroundSize: `auto ${PLANK_H}px`,
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'center',
          }}
        />
        <img
          src={UI_PLANK_LEFT}
          alt=""
          aria-hidden
          className="absolute left-0 top-0"
          style={{ height: PLANK_H }}
        />
        <img
          src={UI_PLANK_RIGHT}
          alt=""
          aria-hidden
          className="absolute right-0 top-0"
          style={{ height: PLANK_H }}
        />

        <h2
          className="relative text-center text-h2"
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            color: COLOURS.signText,
            paddingInline: capWidth + 8,
            paddingBlock: PLANK_H * PLANK_INSET,
          }}
        >
          {heading}
        </h2>
      </div>

      <p
        className="max-w-2xl text-center text-body-md"
        style={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 700,
          color: COLOURS.pillText,
          textShadow: '0 1px 3px rgba(255,255,255,.95)',
        }}
      >
        {instruction}
      </p>

      {children}
    </div>
  );
}
