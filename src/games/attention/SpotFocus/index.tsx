import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import {
  generateSpotFocusContent,
  type GeneratedScene,
} from '../../../lib/contentGenerators/spotFocus';
import { COLOURS } from './palette';
import { Grid } from './Grid';
import { Scene } from './Scene';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  generatedContent?: GeneratedScene;
}

/** Breathing room kept below the board, so it never sits flush to the viewport edge. */
const BOARD_FOOTER = 24;
/** Mirrors the gap-2 between cards and the p-2 inside a panel, in Tailwind's scale. */
const GAP = 8;
const PANEL_PADDING = 8;
/** The ribbon label and its gap, which sit inside the measured box above the cards. */
const RIBBON_H = 56;
/** The gap between the two panels, matching gap-4. */
const PANEL_GAP = 16;
/** Never shrink past this, however short the window; scrolling beats unreadable. */
const MIN_BOARD_WIDTH = 420;

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

  // ── Fit the board into whatever space is left below the chrome ──────────────
  //
  // Cards are 3:4 and sized by width, so the board's height is decided by how wide we
  // let the two panels get. Left to itself the grid overflows the viewport and a
  // resident has to scroll to see the bottom row of a puzzle they are being asked to
  // compare at a glance, which defeats the game.
  const boardRef = useRef<HTMLDivElement>(null);
  const [maxBoardWidth, setMaxBoardWidth] = useState(896);

  useLayoutEffect(() => {
    const measure = () => {
      const el = boardRef.current;
      if (!el) return;
      // Height cannot come from the layout: the shell's column sizes to its content and
      // that content is what we are measuring. Measuring against the viewport breaks the
      // circularity, as the other boards do.
      const top = el.getBoundingClientRect().top;
      const available = window.innerHeight - top - BOARD_FOOTER - RIBBON_H;
      const cardHeight = (available - GAP * (gridRows - 1) - PANEL_PADDING * 2) / gridRows;
      const cardWidth = (cardHeight * 3) / 4;
      const panel = cardWidth * gridCols + GAP * (gridCols - 1) + PANEL_PADDING * 2;
      setMaxBoardWidth(Math.max(MIN_BOARD_WIDTH, Math.round(panel * 2 + PANEL_GAP)));
    };
    measure();
    // Setting the width reflows the board, which can move its own top edge, so watch the
    // element as well as the window rather than trusting a single pass.
    const ro = new ResizeObserver(measure);
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [gridRows, gridCols]);

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
      <div className="flex h-16 items-center justify-center">
        {playing ? (
          <p
            role="status"
            aria-live="polite"
            className="rounded-2xl px-8 py-2 text-h3 font-extrabold"
            style={{ background: COLOURS.pillFill, color: COLOURS.pillText }}
          >
            {t('spot-focus.found', '{{found}} / {{total}} Found', { found: found.size, total })}
          </p>
        ) : (
          <Button className="btn-ready" onClick={advance}>
            {t('spot-focus.btn.ready', "I'm Ready")}
          </Button>
        )}
      </div>

      <div
        ref={boardRef}
        className="flex w-full gap-3 md:gap-4"
        style={{ maxWidth: maxBoardWidth }}
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
    </Scene>
  );
}
