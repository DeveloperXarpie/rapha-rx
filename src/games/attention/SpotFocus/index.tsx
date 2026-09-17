import { useEffect, useMemo, useRef, useState } from 'react';
import { useStageFit } from '../../../hooks/useStageFit';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import {
  generateSpotFocusContent,
  type GeneratedScene,
} from '../../../lib/contentGenerators/spotFocus';
import { COLOURS, DISPLAY_FONT } from './palette';
import { Grid } from './Grid';
import { Scene } from './Scene';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  generatedContent?: GeneratedScene;
}

/** Mirrors the gap-2 between cards and the p-2 inside a panel, in Tailwind's scale. */
const GAP = 8;
const PANEL_PADDING = 8;
/** The gap between the two panels, matching gap-4. */
const PANEL_GAP = 16;
/** The ribbon label above each grid, which sits inside the measured box. */
const RIBBON_H = 56;
/**
 * Floors for the fit, so the board can never be computed out of existence.
 *
 * `boardWidth` used to be a bare subtraction clamped at zero, and zero is what it
 * returned the moment the column above it grew past the play box: a viewport short
 * enough left `box.height - RIBBON_H` too small for three rows of cards, the panel width
 * came out negative, and `Math.max(0, ...)` turned that into a board 0px wide. The game
 * then drew a heading, a pill and nothing else, which is a far worse failure than a
 * board that is merely smaller than it would like to be.
 */
const MIN_STAGE_H = 132;
const MIN_BOARD_W = 180;

/**
 * There is no intro phase any more. The Sep-17 review removed the "I'm Ready" gate -
 * "we get on this screen and it's ready for players' intervention" - so the round is
 * live from the moment the board appears and the only transition left is the one into
 * `completion`.
 */
type Phase = 'find_differences' | 'completion';

export default function SpotFocus({ levelConfig, onLevelComplete, generatedContent }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance } = useGamePhase<Phase>([
    'find_differences',
    'completion',
  ]);

  // One scene per round. GameRouter remounts this component between rounds, so the
  // scene is chosen once and never changes underneath the player.
  const scene = useMemo<GeneratedScene>(
    () =>
      generatedContent ??
      generateSpotFocusContent({
        gridRows: 3,
        gridCols: 3,
        differenceCount: 2,
        changeSubtlety: 'bold',
      }),
    [generatedContent],
  );

  const [found, setFound] = useState<Set<string>>(new Set());
  const falseTapsRef = useRef(0);
  // Stamped in an effect rather than at render: reading the clock during render is
  // impure, and the difference between mount and first paint is not worth measuring.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const total = scene.differenceCount;
  const gridRows = scene.originalRows.length;
  const gridCols = scene.originalRows[0]?.length ?? 1;

  // ── Fit the two scenes into the play box ────────────────────────────────────
  //
  // The panels stay side by side, which is not what the portrait spec assumed. Stacking
  // was meant to buy bigger cards, and measured on a 360x640 phone it does the opposite:
  // height is the scarce dimension here, not width. The play box is 578px and this
  // game's own chrome - the 26px drop above the panel, the panel itself at about 105
  // with both its lines, and the 74px pill slot - takes roughly 205 of it. Split what
  // is left in two and a 3-row grid gets tiny cards; side by side, sharing the width
  // instead, the same budget roughly doubles them.
  //
  // Cards are 3:4 and sized by width, so the height left over is what caps how wide the
  // board may be. The box comes from the play box now rather than from the viewport
  // minus a guess at the chrome.
  const [stageRef, box] = useStageFit();

  const boardWidth = useMemo(() => {
    if (box.height <= 0 || box.width <= 0) return undefined;
    const available = Math.max(MIN_STAGE_H, box.height) - RIBBON_H;
    const cardHeight = (available - GAP * (gridRows - 1) - PANEL_PADDING * 2) / gridRows;
    const cardWidth = (cardHeight * 3) / 4;
    const panel = cardWidth * gridCols + GAP * (gridCols - 1) + PANEL_PADDING * 2;
    // Never wider than the box: on a tall screen the height budget alone would let the
    // panels outgrow the width they actually have. And never narrower than MIN_BOARD_W,
    // so a column that has overrun its box yields a small board rather than no board.
    return Math.max(MIN_BOARD_W, Math.round(Math.min(panel * 2 + PANEL_GAP, box.width)));
  }, [box, gridRows, gridCols]);

  function handleTap(row: number, col: number) {
    const key = `${row}-${col}`;
    const cell = scene.modifiedRows[row][col];

    if (!cell.isDifference) {
      falseTapsRef.current++;
      return;
    }
    if (found.has(key)) return;

    setFound((prev) => {
      const next = new Set(prev).add(key);
      if (next.size === total) setTimeout(advance, 700);
      return next;
    });
  }

  function handleComplete() {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        differencesFound: found.size,
        totalDifferences: total,
        falseTaps: falseTapsRef.current,
      },
    });
  }

  if (currentPhase === 'completion') {
    return (
      <Scene
        heading={t('spot-focus.completion.heading', 'You found all {{count}} differences! Well done!', { count: total })}
        instruction={t('spot-focus.completion.encouragement', 'Your attention is sharp today!')}
      >
        <span className="text-7xl" aria-hidden>
          &#127881;
        </span>
        <div className="w-full max-w-xs">
          <Button variant="kit" fullWidth onClick={handleComplete}>
            {t('spot-focus.btn.continue', 'Continue')}
          </Button>
        </div>
      </Scene>
    );
  }

  const playing = currentPhase === 'find_differences';

  return (
    <Scene
      heading={t('spot-focus.intro.heading', 'Can you spot the differences?')}
      instruction={t(
        'spot-focus.intro.instruction',
        'Look at both pictures carefully. Tap on the right picture where you see a difference.',
      )}
    >
      {/*
        The progress pill. Its slot was 74px because that is what a `lg` brand button
        stands at, and the pill shared the slot with "I'm Ready" so that nothing shifted
        when the round started. The button is gone, so the slot is the pill's own height
        now and the 22px it was holding in reserve goes back to the board. The slot is
        still a fixed height, because the board below is measured against what is left of
        the box and a slot that changed size would move the board under the resident.

        The margin is separation the Sep-17 follow-up asked for: at the column's bare gap
        the pill sat right under the instruction panel and the two read as one stack.
      */}
      <div className="flex h-[52px] flex-none items-center justify-center" style={{ marginTop: 12 }}>
        <p
          role="status"
          aria-live="polite"
          className="rounded-2xl px-8 py-2 text-h3"
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            background: COLOURS.pillFill,
            color: COLOURS.pillText,
          }}
        >
          {t('spot-focus.found', '{{found}} / {{total}} Found', { found: found.size, total })}
        </p>
      </div>

      {/*
        `flex-1 min-h-0` is what makes this measurable: the stage's height comes from the
        column above, never from the cards inside, so observing it cannot feed back into
        the size it reports.
      */}
      {/*
        The stage still takes all the height that is left, because that is what
        `boardWidth` is measured against and the measurement must not depend on what is
        drawn inside it. What changed after the Sep-17 build is what happens to the
        height the board does not use.

        The cards are 3:4 and sized by width, so on a portrait tablet the width binds
        and the board comes out shorter than its budget. The row used to be `flex-1`,
        which stretched the panels over that spare height and left the cards piled at
        the top of two tall empty frames. It is `flex-none` now and the stage centres
        it, so the leftover is split above and below and the board sits in the middle of
        the screen where a resident is looking.
      */}
      <div
        ref={stageRef}
        className="flex w-full min-h-0 flex-1 flex-col items-center justify-center"
      >
      <div
        className="flex w-full min-h-0 flex-none gap-3 md:gap-4"
        style={{ maxWidth: boardWidth }}
      >
        <Grid
          rows={scene.originalRows}
          tone="blue"
          label={t('spot-focus.label.original', 'Original')}
          interactive={false}
          found={new Set()}
        />
        <Grid
          rows={scene.modifiedRows}
          tone="red"
          label={t('spot-focus.label.modified', 'Find differences here')}
          interactive={playing}
          found={found}
          onTap={handleTap}
        />
      </div>
      </div>
    </Scene>
  );
}
