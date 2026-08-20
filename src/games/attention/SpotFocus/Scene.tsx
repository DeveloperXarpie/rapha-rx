import type { ReactNode } from 'react';
import { COLOURS } from './palette';
import { BG_SCENE, UI_SPRIG_LEFT, UI_SPRIG_RIGHT } from './sprites';

interface Props {
  heading: string;
  instruction: string;
  children: ReactNode;
}

/**
 * The backdrop, the signboard header and the instruction line.
 *
 * The plank is CSS rather than the kit's sprite because the kit paints "Can you spot the
 * Differences?" into the wood, and this app ships in English, Hindi and Kannada. Only
 * the daisy sprigs are sliced: they carry no text and CSS cannot draw them.
 */
export function Scene({ heading, instruction, children }: Props) {
  return (
    <div
      role="main"
      className="flex flex-1 flex-col items-center gap-4 bg-cover bg-center bg-no-repeat p-4"
      style={{
        backgroundImage: `url(${BG_SCENE})`,
        backgroundColor: COLOURS.skyMid,
      }}
    >
      <div className="relative flex w-full max-w-2xl items-center justify-center">
        <img
          src={UI_SPRIG_LEFT}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -left-2 -top-4 z-10 w-16 md:w-20"
        />
        <img
          src={UI_SPRIG_RIGHT}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-2 -top-4 z-10 w-16 md:w-20"
        />
        <h2
          className="w-full rounded-2xl px-8 py-3 text-center text-h2 font-extrabold"
          style={{
            color: COLOURS.signText,
            background: `repeating-linear-gradient(180deg, ${COLOURS.signWood} 0 9px, ${COLOURS.signGrain} 9px 18px)`,
            border: `7px solid ${COLOURS.signFrame}`,
            boxShadow: '0 5px 0 rgba(0,0,0,.25)',
          }}
        >
          {heading}
        </h2>
      </div>

      <p
        className="max-w-2xl text-center text-body-md font-bold"
        style={{ color: COLOURS.pillText, textShadow: '0 1px 3px rgba(255,255,255,.9)' }}
      >
        {instruction}
      </p>

      {children}
    </div>
  );
}
