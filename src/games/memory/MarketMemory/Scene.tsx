import { BG } from './geometry';
import { BG_HOME, BG_STORE } from './sprites';

interface SceneProps {
  /** True once the walk to the shop has begun. */
  inStore: boolean;
  reduced: boolean;
}

const FADE_MS = 700;

/**
 * The two painted backdrops, stacked.
 *
 * The store is always mounted and simply fades up over the home, so the change of place
 * costs no layout and cannot flash an unpainted board: by the time it matters the image
 * has been in the document since the first frame.
 *
 * Both layers are drawn into BG rather than the board box: the backdrop is stretched
 * taller than the board so the shelf's compartments have room for the goods to stand in.
 * See BG_STRETCH_Y in geometry.ts for why. The board clips the overflow.
 */
export default function Scene({ inStore, reduced }: SceneProps) {
  const layer = {
    position: 'absolute' as const,
    left: BG.left,
    top: BG.top,
    width: BG.width,
    height: BG.height,
    // `fill`, not `cover`: BG is deliberately a different shape from the art, and cover
    // would undo the stretch by preserving the aspect and cropping instead.
    objectFit: 'fill' as const,
    display: 'block',
  };

  return (
    <>
      <img src={BG_HOME} alt="" aria-hidden="true" draggable={false} style={layer} />
      <img
        src={BG_STORE}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          ...layer,
          opacity: inStore ? 1 : 0,
          transition: `opacity ${reduced ? 200 : FADE_MS}ms linear`,
        }}
      />
    </>
  );
}
