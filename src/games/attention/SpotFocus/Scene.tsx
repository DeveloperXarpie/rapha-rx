import type { ReactNode } from 'react';
import { COLOURS } from './palette';
import { BG_SCENE } from './sprites';
import InstructionPanel, { InstructionPanelStyles } from '../../../components/chrome/InstructionPanel';

interface Props {
  heading: string;
  instruction: string;
  children: ReactNode;
}

/**
 * The backdrop and the instruction panel.
 *
 * The header used to be a signboard cut into three sliced pieces of the kit's wood -
 * two end caps and a middle strip that tiled between them - because the kit painted its
 * heading into the plank and this app ships in three languages, so the text had to be
 * live over a board that stretched to fit it.
 *
 * The Sep-17 review retired all of it for the shared blue panel, and the completion
 * screen is why: at two lines "You found all 3 differences! Well done!" overran the
 * plank's fixed height and was clipped top and bottom. The panel grows instead. The
 * instruction line moved inside it, as the review asked - one plate, both sentences.
 *
 * The backdrop keeps its meadow but wears a white wash over it ("fade the background,
 * keep it as light as possible"), so the two comparison grids sit on something near
 * paper rather than on a summer sky.
 */
export function Scene({ heading, instruction, children }: Props) {
  return (
    <div
      role="main"
      className="flex h-full min-h-0 flex-col items-center gap-4 bg-cover bg-center bg-no-repeat px-4 pb-3"
      style={{
        // The wash is a gradient layer over the photo rather than a separate element, so
        // the two scroll, scale and crop as one background.
        backgroundImage: `linear-gradient(${WASH}, ${WASH}), url(${BG_SCENE})`,
        backgroundColor: COLOURS.skyMid,
        /*
         * "Lower this panel", and the gap this is really about is the one above it.
         *
         * GameShell's level plate is absolutely positioned INSIDE this same play box, at
         * `top: max(safe-top + 8, ...)`, and stands about 41px tall - so it occupies
         * roughly 8px to 49px of the space this padding is measured in. A drop of 48px
         * therefore does not lower the panel below the plate at all; it lands it exactly
         * on the plate's bottom edge, which is what "the gap is negligible" was.
         *
         * So the floor of this clamp clears the plate rather than being a token amount,
         * and the safe-area inset is added on top because the plate is pushed down by it
         * on a device with a cutout and the panel has to follow.
         */
        paddingTop: `calc(var(--safe-top, 0px) + clamp(${PLATE_CLEARANCE}px, 7vh, 86px))`,
      }}
    >
      <InstructionPanelStyles />

      <InstructionPanel
        className="w-full max-w-3xl flex-none"
        secondary={instruction}
        fontSize={30}
      >
        {heading}
      </InstructionPanel>

      {children}
    </div>
  );
}

/** The white wash over the meadow. Both stops are the same colour - it is a flat veil. */
const WASH = 'rgba(255, 255, 255, 0.58)';

/**
 * The least this panel may sit from the top of the play box.
 *
 * GameShell puts the level plate 8px down and the plate stands about 41px tall, so 49
 * is where it ends and anything below that is the actual gap. 66 leaves 17px of it even
 * on the shortest screen, where the clamp above is at its floor.
 */
const PLATE_CLEARANCE = 66;
