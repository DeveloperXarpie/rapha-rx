import { useEffect, useMemo, useRef, useState } from 'react';
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
      <div className="flex h-20 items-center justify-center">
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

      <div className="flex w-full max-w-4xl gap-3 md:gap-4">
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
