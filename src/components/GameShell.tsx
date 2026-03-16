import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../session/SessionManager';
import { track } from '../lib/analytics';
import { adjustDifficulty, scoreLevelLabel } from '../lib/dynamicDifficulty';
import { useAppStore } from '../store';
import { Button } from './ui/Button';
import type { LevelConfig } from '../games/types';

export interface LevelResult {
  levelId: string;
  durationSeconds: number;
  completed: boolean;
  metrics: Record<string, unknown>;
}

interface GameShellProps {
  gameId: string;
  gameCategory: 'memory' | 'attention' | 'executive';
  levelConfig: LevelConfig;
  difficultyScore?: number;
  onLevelComplete: (result: LevelResult) => void;
  onExit: () => void;
  children: React.ReactNode;
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  memory: 'game.category.memory',
  attention: 'game.category.attention',
  executive: 'game.category.executive',
};

const ROTATION_THRESHOLD_SECONDS = 1 * 30; // 30 seconds for testing

export default function GameShell({
  gameId,
  gameCategory,
  levelConfig,
  difficultyScore,
  onLevelComplete,
  onExit,
  children,
}: GameShellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { secondsInCurrentCategory, triggerRotation } = useSessionContext();
  const profile = useAppStore((s) => s.activeProfile);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const gameName = gameId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const levelLabel = difficultyScore !== undefined
    ? scoreLevelLabel(difficultyScore)
    : t(`level.${levelConfig.id}`);

  useEffect(() => {
    track('game_started', {
      gameId,
      gameCategory,
      levelId: levelConfig.id,
      difficultyScore,
    });

    const handleBeforeUnload = () => {
      track('session_interrupted', {
        gameId,
        levelId: levelConfig.id,
        timeInSessionSeconds: secondsInCurrentCategory,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameId, gameCategory, levelConfig.id, secondsInCurrentCategory, difficultyScore]);

  async function handleLevelComplete(result: LevelResult) {
    const userId = profile?.userId;

    // Adjust dynamic difficulty score
    if (userId) {
      // Calculate performance ratio from metrics
      const performanceRatio = computePerformanceRatio(gameId, result);
      await adjustDifficulty(userId, gameId, {
        completed: result.completed,
        performanceRatio,
      });
    }

    const eventName = result.completed ? 'level_completed' : 'level_not_completed';
    track(eventName, {
      gameId,
      levelId: result.levelId,
      durationSeconds: result.durationSeconds,
      completed: result.completed,
      metrics: result.metrics,
      difficultyScore,
    });

    finishLevel(result);
  }

  function finishLevel(result: LevelResult) {
    // Check if rotation should happen
    if (secondsInCurrentCategory >= ROTATION_THRESHOLD_SECONDS) {
      triggerRotation();
    } else {
      onLevelComplete(result);
    }
  }

  function handleExit() {
    setShowExitConfirm(true);
  }

  function confirmExit() {
    track('session_interrupted', {
      gameId,
      levelId: levelConfig.id,
      timeInSessionSeconds: secondsInCurrentCategory,
    });
    navigate('/app/home');
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="panel-surface px-6 py-4 flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-h2">
            <span className="game-title-banner game-title-banner-compact">{gameName}</span>
          </h2>
        </div>
        <span className="shell-tag shell-tag-category">
          {t(CATEGORY_LABEL_KEYS[gameCategory] ?? '')}
        </span>
        <span className="shell-tag shell-tag-level">{levelLabel}</span>
        <button
          onClick={handleExit}
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-hover-state transition-colors text-xl text-caption-text border border-gray-200 bg-white/70"
          aria-label={t('btn.exit')}
        >
          ✕
        </button>
      </div>

      {/* Game content */}
      <div className="flex-1 flex flex-col p-4">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<{
              onLevelComplete?: (result: LevelResult) => void;
              levelConfig?: LevelConfig;
            }>, {
              onLevelComplete: handleLevelComplete,
              levelConfig,
            });
          }
          return child;
        })}
      </div>

      {/* Exit confirmation dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="panel-surface p-8 max-w-sm w-full shadow-xl">
            <h3 className="text-h2 font-bold text-body-text mb-3">{t('game.exit.confirm.title')}</h3>
            <p className="text-body-md text-caption-text mb-8">{t('game.exit.confirm.message')}</p>
            <div className="flex flex-col gap-3">
              <Button fullWidth onClick={confirmExit}>{t('game.exit.confirm.yes')}</Button>
              <Button variant="secondary" fullWidth onClick={() => setShowExitConfirm(false)}>
                {t('game.exit.confirm.no')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Performance ratio computation ────────────────────────────────────────────

function computePerformanceRatio(gameId: string, result: LevelResult): number {
  const m = result.metrics;

  if (gameId === 'remember-match') {
    const quizCorrect = (m.quizCorrect as number) ?? 0;
    const quizTotal = (m.quizTotal as number) ?? 1;
    const flipAttempts = (m.flipAttempts as number) ?? 0;
    // Perfect = quizTotal * 2 flips (one for each pair's two cards)
    const optimalFlips = (quizTotal > 0 ? quizTotal : 3) * 2;
    const flipRatio = Math.min(1, optimalFlips / Math.max(1, flipAttempts));
    const quizRatio = quizCorrect / Math.max(1, quizTotal);
    return (flipRatio + quizRatio) / 2;
  }

  if (gameId === 'spot-focus') {
    const falseTaps = (m.falseTaps as number) ?? 0;
    // Fewer false taps = higher performance
    return Math.max(0, 1 - falseTaps * 0.15);
  }

  if (gameId === 'morning-routine-quest') {
    const firstAttempt = (m.firstAttemptPlacements as number) ?? 0;
    const totalCards = (m.totalCards as number) ?? 4;
    const decisionCorrect = m.decisionCorrect;
    let ratio = firstAttempt / Math.max(1, totalCards);
    if (decisionCorrect === false) ratio *= 0.7;
    return ratio;
  }

  if (gameId === 'word-search') {
    const wordsFound  = (m.wordsFound  as number) ?? 0;
    const totalWords  = (m.totalWords  as number) ?? 1;
    const falseDrags  = (m.falseDrags  as number) ?? 0;
    const foundRatio    = wordsFound / Math.max(1, totalWords);
    const accuracyRatio = Math.max(0, 1 - falseDrags / Math.max(1, totalWords * 3));
    return (foundRatio + accuracyRatio) / 2;
  }

  if (gameId === 'shopping-list-recall') {
    const recalled       = (m.itemsRecalled   as number) ?? 0;
    const total          = (m.totalItems      as number) ?? 1;
    const falsePositives = (m.falsePositives  as number) ?? 0;
    const recallRatio   = recalled / Math.max(1, total);
    const precisionRatio = Math.max(0, 1 - falsePositives / Math.max(1, total));
    return (recallRatio + precisionRatio) / 2;
  }

  if (gameId === 'recipe-builder') {
    const firstCorrect   = (m.firstChoiceCorrect as number) ?? 0;
    const totalSteps     = (m.totalSteps         as number) ?? 4;
    const ingCorrect     = m.ingredientDecisionCorrect;
    let ratio = firstCorrect / Math.max(1, totalSteps);
    if (ingCorrect === false) ratio *= 0.8;
    if (ingCorrect === true)  ratio = Math.min(1, ratio * 1.1);
    return ratio;
  }

  if (gameId === 'sequence-repeat') {
    const peak   = (m.peakSequenceLength as number) ?? 0;
    const max    = (m.maxLength          as number) ?? Math.max(1, peak);
    const errors = (m.totalErrors        as number) ?? 0;
    const lengthRatio = Math.min(1, peak / Math.max(1, max));
    const errorPenalty = Math.max(0, 1 - errors * 0.1);
    return (lengthRatio + errorPenalty) / 2;
  }

  if (gameId === 'focus-filter') {
    const firstCorrect = (m.firstAttemptCorrect as number) ?? 0;
    const total        = (m.totalQuestions      as number) ?? 1;
    return firstCorrect / Math.max(1, total);
  }

  if (gameId === 'garden-sequencer') {
    const firstCorrect = (m.firstAttemptCorrect as number) ?? 0;
    const resets       = (m.resetCount          as number) ?? 0;
    // 4 slots total; each reset penalises 10%
    let ratio = firstCorrect / 4;
    ratio = Math.max(0, ratio - resets * 0.1);
    return Math.min(1, ratio);
  }

  // Default for non-dynamic games
  return result.completed ? 0.7 : 0.3;
}
