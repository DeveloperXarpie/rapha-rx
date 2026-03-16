import { useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import type { GeneratedScene, SceneCell } from '../../../lib/contentGenerators/spotFocus';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  generatedContent?: GeneratedScene;
}

type Phase = 'scene_intro' | 'find_differences' | 'completion';

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function SpotFocus({ levelConfig, onLevelComplete, generatedContent }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance } = useGamePhase<Phase>([
    'scene_intro',
    'find_differences',
    'completion',
  ]);

  // Use generated content or a minimal fallback
  const scene = useMemo<GeneratedScene>(() => {
    if (generatedContent) return generatedContent;
    // Minimal fallback
    return {
      label: 'Scene',
      originalRows: [
        [
          { id: 'a', display: '🫖', label: 'Tea Kettle' },
          { id: 'b', display: '🫙', label: 'Pickle Jar' },
          { id: 'c', display: '🫕', label: 'Cooking Pot' },
        ],
      ],
      modifiedRows: [
        [
          { id: 'a', display: '☕', label: 'Coffee Cup', isDifference: true },
          { id: 'b', display: '🫙', label: 'Pickle Jar' },
          { id: 'c', display: '🫕', label: 'Cooking Pot' },
        ],
      ],
      differenceCount: 1,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [found, setFound] = useState<Set<string>>(new Set());
  const falseTapsRef = useRef(0);
  const startedAt = useRef(Date.now());

  const effectiveDiffCount = scene.differenceCount;

  function handleCellTap(rowIndex: number, colIndex: number) {
    const cell = scene.modifiedRows[rowIndex][colIndex];
    if (cell.isDifference && !found.has(cell.id)) {
      setFound(prev => {
        const next = new Set(prev);
        next.add(cell.id);
        if (next.size === effectiveDiffCount) {
          setTimeout(advance, 600);
        }
        return next;
      });
    } else if (!cell.isDifference) {
      falseTapsRef.current++;
    }
  }

  function handleComplete() {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        differencesFound: found.size,
        totalDifferences: effectiveDiffCount,
        falseTaps: falseTapsRef.current,
      },
    });
  }

  function renderSceneCell(
    cell: SceneCell,
    interactive: boolean,
    rowIndex: number,
    colIndex: number
  ) {
    const isEmpty = cell.display === '';
    const isFound = found.has(cell.id);

    const baseClasses =
      'flex-1 min-h-[96px] min-w-[96px] rounded-xl flex items-center justify-center text-[2.7rem] bg-[#e9eef8] border border-[#d5ddee] relative select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]';
    const emptyClasses = isEmpty ? 'border-2 border-dashed border-gray-400 bg-[#dde4f2]' : '';
    const interactiveClasses = interactive
      ? 'cursor-pointer active:scale-95 transition-transform'
      : '';

    return (
      <div
        key={cell.id}
        className={`${baseClasses} ${emptyClasses} ${interactiveClasses}`}
        aria-label={t(cell.label)}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? () => handleCellTap(rowIndex, colIndex) : undefined}
        onKeyDown={
          interactive
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCellTap(rowIndex, colIndex);
                }
              }
            : undefined
        }
      >
        {cell.display}
        {interactive && isFound && (
          <div className="absolute inset-0 rounded-xl bg-emerald-green/20 flex items-center justify-center">
            <span className="text-emerald-green text-[2.25rem] font-bold">✓</span>
          </div>
        )}
      </div>
    );
  }

  function renderScene(rows: SceneCell[][], interactive: boolean) {
    return (
      <div className="scene-board flex flex-col gap-1 flex-1">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {row.map((cell, colIndex) =>
              renderSceneCell(cell, interactive, rowIndex, colIndex)
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── SCENE INTRO ───────────────────────────────────────────────────────────
  if (currentPhase === 'scene_intro') {
    return (
      <div
        role="main"
        className="flex-1 flex flex-col items-center gap-6 p-6 bg-app-bg"
      >
        <h2 className="hero-quest-banner">
          {t('spot-focus.intro.heading', 'Can you spot the differences?')}
        </h2>
        <p className="hero-quest-subtitle">
          {t(
            'spot-focus.intro.instruction',
            'Look at both pictures carefully. Tap on the right picture where you see a difference.'
          )}
        </p>

        <div className="w-full flex flex-col md:flex-row gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-body-md text-center">
              <span className="scene-ribbon-blue">{t('spot-focus.label.original', 'Original')}</span>
            </p>
            {renderScene(scene.originalRows, false)}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-body-md text-center">
              <span className="scene-ribbon-red">{t('spot-focus.label.modified', 'Differences')}</span>
            </p>
            {renderScene(scene.modifiedRows, false)}
          </div>
        </div>

        <div className="w-full max-w-xs mt-auto">
          <Button fullWidth className="btn-ready" onClick={advance}>
            {t('spot-focus.btn.ready', "I'm Ready")}
          </Button>
        </div>
      </div>
    );
  }

  // ── FIND DIFFERENCES ──────────────────────────────────────────────────────
  if (currentPhase === 'find_differences') {
    return (
      <div
        role="main"
        className="flex-1 flex flex-col gap-4 p-6 bg-app-bg"
      >
        <p
          role="status"
          aria-live="polite"
          className="text-body-md text-caption-text text-center"
        >
          {t('spot-focus.progress', '{{found}} of {{total}} found', {
            found: found.size,
            total: effectiveDiffCount,
          })}
        </p>

        <div className="flex flex-col md:flex-row gap-4 flex-1">
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-body-md text-center">
              <span className="scene-ribbon-blue">{t('spot-focus.label.original', 'Original')}</span>
            </p>
            {renderScene(scene.originalRows, false)}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-body-md text-center">
              <span className="scene-ribbon-red">{t('spot-focus.label.modified', 'Differences')}</span>
            </p>
            {renderScene(scene.modifiedRows, true)}
          </div>
        </div>
      </div>
    );
  }

  // ── COMPLETION ────────────────────────────────────────────────────────────
  return (
    <div
      role="main"
      className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-app-bg text-center"
    >
      <span className="text-7xl" aria-hidden="true">🎉</span>
      <h2 className="text-h2 font-bold text-body-text">
        {t('spot-focus.completion.heading', 'You found all {{count}} differences! Well done!', {
          count: effectiveDiffCount,
        })}
      </h2>
      <p className="text-body-md text-caption-text">
        {t('spot-focus.completion.encouragement', 'Your attention is sharp today!')}
      </p>
      <div className="w-full max-w-xs">
        <Button fullWidth onClick={handleComplete}>
          {t('spot-focus.btn.continue', 'Continue')}
        </Button>
      </div>
    </div>
  );
}
