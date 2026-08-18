import { BOARD_H, BOARD_W } from './geometry';
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
 */
export default function Scene({ inStore, reduced }: SceneProps) {
  const layer = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: BOARD_W,
    height: BOARD_H,
    objectFit: 'cover' as const,
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
