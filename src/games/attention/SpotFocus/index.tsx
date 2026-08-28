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

type Phase = 'scene_intro' | 'find_differences' | 'completion';

export default function SpotFocus({ levelConfig, onLevelComplete, generatedContent }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance } = useGamePhase<Phase>([
    'scene_intro',
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
  // game's own chrome - signboard 141, instruction 72, button slot 64 - takes 277 of it,
  // leaving about 209px for the panels. Split that in two and a 3-row grid gets 19px
  // cards; side by side, sharing the width instead, the same budget gives about 34px.
  //
  // Cards are 3:4 and sized by width, so the height left over is what caps how wide the
  // board may be. The box comes from the play box now rather than from the viewport
  // minus a guess at the chrome.
  const [stageRef, box] = useStageFit();

  const boardWidth = useMemo(() => {
    if (box.height <= 0 || box.width <= 0) return undefined;
    const available = box.height - RIBBON_H;
    const cardHeight = (available - GAP * (gridRows - 1) - PANEL_PADDING * 2) / gridRows;
    const cardWidth = (cardHeight * 3) / 4;
    const panel = cardWidth * gridCols + GAP * (gridCols - 1) + PANEL_PADDING * 2;
    // Never wider than the box: on a tall screen the height budget alone would let the
    // panels outgrow the width they actually have.
    return Math.max(0, Math.round(Math.min(panel * 2 + PANEL_GAP, box.width)));
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
          <Button fullWidth onClick={handleComplete}>
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
        The button and the pill share one slot of fixed height, so nothing on the board
        shifts when the round starts under a resident who is already looking at it.
      */}
      <div className="flex h-16 flex-none items-center justify-center">
        {playing ? (
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
        ) : (
          <Button className="btn-ready" onClick={advance}>
            {t('spot-focus.btn.ready', "I'm Ready")}
          </Button>
        )}
      </div>

      {/*
        `flex-1 min-h-0` is what makes this measurable: the stage's height comes from the
        column above, never from the cards inside, so observing it cannot feed back into
        the size it reports.
      */}
      <div
        ref={stageRef}
        className="flex w-full min-h-0 flex-1 flex-col items-center"
      >
      <div
        className="flex w-full min-h-0 flex-1 gap-3 md:gap-4"
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
