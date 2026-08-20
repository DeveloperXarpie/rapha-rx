import type { ReactNode } from 'react';
import { COLOURS, DISPLAY_FONT, PLANK_WOOD } from './palette';
import { BG_SCENE, UI_PLANK_LEFT, UI_PLANK_RIGHT } from './sprites';

interface Props {
  heading: string;
  instruction: string;
  children: ReactNode;
}

/** How far a cap overhangs the plank, as a fraction of the plank's height. */
const CAP_OVERHANG = 0.19;

/**
 * The backdrop, the signboard header and the instruction line.
 *
 * The signboard is a three-piece build rather than one sprite. The kit paints "Can you
 * spot the Differences?" into the wood and this app ships in English, Hindi and Kannada,
 * so the heading has to be live text. But the plank's rounded ends, its screws and its
 * daisy sprigs are not things CSS draws convincingly, so those are sliced as end caps
 * and the wood between them is a gradient sampled row by row from the plank itself. The
 * board stretches to whatever the heading needs, in any language, and still looks like
 * the art rather than like a form field.
 *
 * The 12rem in the min-height is GameShell's chrome: its header, its title bar and its
 * padding. `flex-1` alone is not enough, because the shell's column is `min-h-full` and
 * that resolves to nothing without a definite height on its own parent - so on the
 * completion screen, where the content is short, the backdrop stopped halfway down and
 * left grey shell showing beneath it. ClearTheWay carries the same constant as CHROME_H.
 */
export function Scene({ heading, instruction, children }: Props) {
  return (
    <div
      role="main"
      className="flex min-h-[calc(100vh-12rem)] flex-1 flex-col items-center gap-3 bg-cover bg-center bg-no-repeat px-4 py-3"
      style={{
        backgroundImage: `url(${BG_SCENE})`,
        backgroundColor: COLOURS.skyMid,
      }}
    >
      <div className="relative flex w-full max-w-2xl justify-center pt-3">
        <h2
          className="w-full rounded-xl px-24 py-4 text-center text-h2"
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            color: COLOURS.signText,
            background: PLANK_WOOD,
            boxShadow: '0 6px 0 rgba(0,0,0,.28), inset 0 0 0 1px rgba(122,53,9,.55)',
          }}
        >
          {heading}
        </h2>

        {/*
          The caps sit over the plank's own ends. They are taller than the plank because
          the sprigs grow above it, so they anchor to the plank's vertical centre and are
          allowed to overhang.
        */}
        <img
          src={UI_PLANK_LEFT}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
          style={{ height: `calc(100% + ${CAP_OVERHANG * 200}%)` }}
        />
        <img
          src={UI_PLANK_RIGHT}
          alt=""
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2"
          style={{ height: `calc(100% + ${CAP_OVERHANG * 200}%)` }}
        />
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
