import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { track } from '../lib/analytics';
import { getGame } from '../lib/gameCatalog';
import { KIT_CORNER } from '../styles/kitButton';
import StageBackdrop from '../components/chrome/StageBackdrop';

/**
 * The art box is locked to the splash's own aspect, because the splashes are no
 * longer one shape. Three are still the original 540x960 (0.5625); Shopping List
 * and Station Master were re-cut at 1003x1568 (0.6397) for the Sep-9 review,
 * which asked for wider art so the portrait column stops showing blue bars down
 * both sides, and Spot Focus joined them in the Sep-10 drop. A single global
 * constant would letterbox the wide group back to where they started, so the
 * ratio is per-game with the old shape as default.
 */
const DEFAULT_ASPECT = 540 / 960;

const WIDE_ASPECT = 1003 / 1568;

const ART_ASPECT: Record<string, number> = {
  'market-memory': WIDE_ASPECT,
  'train-yard':    WIDE_ASPECT,
  'spot-focus':    WIDE_ASPECT,
};

interface Rect {
  /** All four in percent of the ART box, not of the viewport. */
  top: number; height: number; left: number; width: number;
  /**
   * Set on the one splash whose art still paints a PLAY pill, so the button wears
   * `.btn-brand`'s 34px pill and covers the painting underneath it. Omitted means
   * the kit's rounded rectangle, which is what the other five want and what two of
   * them were silently NOT getting: the flag used to run the other way round, and
   * Free Me and Garden Keeper had simply never been given it.
   */
  paintedPill?: boolean;
}

/*
 * Where the real PLAY button sits, as a fraction of the ART box - not of the
 * viewport. The art is letterboxed rather than cover-cropped (see below), so
 * these percentages address the same pixels of the image at every size.
 *
 * Five of the six splashes (Free Me, Garden Keeper, Shopping List and Station
 * Master, whose re-cut art dropped the painted pill, and now Spot Focus, whose
 * Sep-10 re-cut dropped it too) have no painted PLAY button at all. That is why
 * those games once looked like they had none: the screen only ever drew a
 * transparent hotspot over the art and trusted the artwork to show a button. The
 * button is real now, and on the one splash that DOES still paint one this rect
 * is measured to sit over the painted pill and cover it, so no screen shows two.
 * That one splash is the exception, so it is the one that carries a flag.
 *
 * Measured off the source webp files, not estimated - the surviving painted pill
 * spans y 64.3-74.4% (tiffen), and the rect below is that span padded out far
 * enough to hide the pill's drop shadow.
 */
const DEFAULT_PLAY: Rect = { top: 67.6, height: 14.4, left: 21.5, width: 57 };

const PLAY_RECT: Record<string, Rect> = {
  /*
   * The re-cut splashes paint no pill at all, so these rects are placed on clear
   * art rather than measured onto one. Shopping List sits on the empty pavement
   * below the info panel, which ends at 61%. Spot Focus sits on the paved path in
   * the same slot, clear of the bench and cat to its left and the bicycle to its
   * right. Station Master sits lower than any other game on purpose: the station
   * master's face runs 55-72% and a button in the usual slot would cover it.
   */
  'market-memory': { top: 70.4, height: 12.2, left: 29, width: 42 },
  'spot-focus':    { top: 70.4, height: 12.2, left: 29, width: 42 },
  'train-yard':    { top: 84.2, height: 12.2, left: 29, width: 42 },
  // Over the painted pill on the one remaining splash that has one.
  'serve-guests':  { top: 63.6, height: 13.4, left: 21.5, width: 58, paintedPill: true },
  // Free Me paints no pill, and its info panel hangs lower than the other five
  // (63.8-75.5%), so the button clears it rather than sitting in the default slot.
  'clear-the-way': { top: 76.5, height: 12.5, left: 21.5, width: 57 },
};

/**
 * The screen between the category intro and the board.
 *
 * The background is the supplied artwork rather than composed UI, and
 * deliberately so: splash-*.webp is a finished screen - it already contains the
 * game logo, the tagline and the cream "scientifically designed game" panel.
 * There is no clean background plate, so the handoff's "rebuild these as real
 * screens" is not buildable without new art.
 *
 * What is NOT taken from the art is the PLAY button. It is a real `.btn-green-kit`
 * - the same green the boards use for READY - so it exists on all six games,
 * carries a translated label, focuses, and responds to a press, none of which a
 * painted rectangle could do.
 *
 * The art is contained inside an aspect-locked box rather than cover-cropped to
 * the viewport. Cover meant the art box and the screen box were different
 * rectangles, so a percentage position could not address the artwork reliably,
 * and a short viewport could crop the painted button off entirely. What fills
 * the space that leaves is a blurred, cover-cropped copy of the same art rather
 * than the deep blue field it used to be - see the note on it below. Known
 * limitation: every word painted into the art is English, in all three
 * languages.
 */
export default function GameTitleScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  const game = gameId ? getGame(gameId) : undefined;
  const splash = game?.splash ?? null;

  // The nine games with no commissioned art have no title screen. Rather than
  // render an empty one, go straight to the board. No fire-once ref: a replacing
  // navigate is idempotent, and a ref here would only be one more thing to get
  // wrong under StrictMode's double mount.
  useEffect(() => {
    if (!game || !splash) {
      navigate(gameId ? `/app/game/${gameId}` : '/app/home', { replace: true });
    }
  }, [game, splash, gameId, navigate]);

  if (!game || !splash) return null;

  const play = PLAY_RECT[game.id] ?? DEFAULT_PLAY;
  const aspect = ART_ASPECT[game.id] ?? DEFAULT_ASPECT;

  function handlePlay() {
    navigate(`/app/game/${gameId}`);
  }

  function handleClose() {
    // Leaving here abandons the session, which is what this event already means
    // everywhere else in the app.
    track('session_interrupted', { gameId, levelId: 'title', timeInSessionSeconds: 0 });
    navigate('/app/home');
  }

  return (
    <div
      className="flex-1 min-h-0 flex items-center justify-center"
      style={{
        position: 'relative', overflow: 'hidden', background: '#0E2AA8',
        // A size container, so the art box below can letterbox itself in CSS.
        containerType: 'size',
      }}
    >
      {/*
        The letterbox fill. The art box below is aspect-locked on purpose - the PLAY
        button addresses the artwork by percentage, so the art box and the screen box
        have to be the same rectangle - and what that leaves over is filled with the same
        art rather than the deep blue field it used to be. See StageBackdrop, which does
        the same job for every game board.
      */}
      <StageBackdrop src={splash} />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          /*
           * Exact `contain` against the stage. Expressed as container-query math
           * rather than aspect-ratio + max-width, because clamping a max-width
           * does not walk an explicit height back and the art would squash.
           */
          width: `min(100cqw, 100cqh * ${aspect})`,
          height: `min(100cqh, 100cqw / ${aspect})`,
          // So the button below can size its label against the art, not the page.
          containerType: 'size',
        }}
      >
        <img
          src={splash}
          alt=""
          aria-hidden="true"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }}
        />

        <button
          className="btn-brand btn-green-kit"
          onClick={handlePlay}
          style={{
            position: 'absolute',
            top: `${play.top}%`, height: `${play.height}%`,
            left: `${play.left}%`, width: `${play.width}%`,
            /*
             * The kit's corner is a fraction of the button's own height, so it is a
             * length in container units rather than a percentage - see btn-green-kit.
             * The button's height is a percentage of the same container, so the two
             * multiply out to KIT_CORNER of the button.
             */
            ...(play.paintedPill
              ? {}
              : { borderRadius: `${(KIT_CORNER * play.height).toFixed(2)}cqh` }),
            fontSize: 'clamp(20px, 9cqw, 44px)',
            // The painted pills read PLAY. Latin-only, so a no-op for hi and kn.
            textTransform: 'uppercase',
            padding: 0,
          }}
        >
          {t('gameTitle.play', 'Play')}
        </button>

        <button
          onClick={handleClose}
          aria-label={t('gameTitle.close', 'Close')}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 44, height: 44, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.6)',
            background: 'rgba(10,20,40,0.45)',
            color: '#FFFFFF', fontSize: 20, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          &#10005;
        </button>
      </div>
    </div>
  );
}
