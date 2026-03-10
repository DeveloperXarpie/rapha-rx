import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../session/SessionManager';
import { track } from '../lib/analytics';
import { adjustDifficulty, scoreLevelLabel } from '../lib/dynamicDifficulty';
import { useAppStore } from '../store';
import { Badge } from './ui/Badge';
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

const CATEGORY_BADGE_VARIANTS: Record<string, 'blue' | 'green' | 'purple'> = {
  memory: 'blue',
  attention: 'green',
  executive: 'purple',
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
      <div className="bg-card-bg border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <div className="flex-1">
          <h2 className="text-h2 font-bold text-body-text">{gameName}</h2>
        </div>
        <Badge variant={CATEGORY_BADGE_VARIANTS[gameCategory] ?? 'blue'}>
          {t(CATEGORY_LABEL_KEYS[gameCategory] ?? '')}
        </Badge>
        <Badge variant="amber">{levelLabel}</Badge>
        <button
          onClick={handleExit}
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-hover-state transition-colors text-xl text-caption-text"
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
          <div className="bg-card-bg rounded-3xl p-8 max-w-sm w-full shadow-xl">
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

  // Default for non-dynamic games
  return result.completed ? 0.7 : 0.3;
}
