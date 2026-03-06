import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../session/SessionManager';
import { track } from '../lib/analytics';
import { recordCompletion, shouldPrompt, markPrompted } from '../lib/adaptiveDifficulty';
import { upsertGameProgress } from '../lib/db';
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
  onLevelComplete: (result: LevelResult) => void;
  onExit: () => void;
  children: React.ReactNode;
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  memory:    'game.category.memory',
  attention: 'game.category.attention',
  executive: 'game.category.executive',
};

const CATEGORY_BADGE_VARIANTS: Record<string, 'blue' | 'green' | 'purple'> = {
  memory:    'blue',
  attention: 'green',
  executive: 'purple',
};

const ROTATION_THRESHOLD_SECONDS = 10 * 60; // 10 minutes

export default function GameShell({
  gameId,
  gameCategory,
  levelConfig,
  onLevelComplete,
  onExit,
  children,
}: GameShellProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { secondsInCurrentCategory, triggerRotation } = useSessionContext();
  const profile = useAppStore((s) => s.activeProfile);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showChallengePrompt, setShowChallengePrompt] = useState(false);
  const [pendingResult, setPendingResult] = useState<LevelResult | null>(null);
  const startedAt = useRef<number>(Date.now());

  const gameName = gameId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  useEffect(() => {
    track('game_started', {
      gameId,
      gameCategory,
      levelId: levelConfig.id,
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
  }, [gameId, gameCategory, levelConfig.id, secondsInCurrentCategory]);

  async function handleLevelComplete(result: LevelResult) {
    const userId = profile?.userId;

    if (userId) {
      await recordCompletion(userId, gameId, result.completed);
    }

    const eventName = result.completed ? 'level_completed' : 'level_not_completed';
    track(eventName, {
      gameId,
      levelId: result.levelId,
      durationSeconds: result.durationSeconds,
      completed: result.completed,
      metrics: result.metrics,
    });

    // Check if user should be prompted for a level up
    if (userId && result.completed) {
      const prompt = await shouldPrompt(userId, gameId);
      if (prompt) {
        setPendingResult(result);
        setShowChallengePrompt(true);
        await markPrompted(userId, gameId);
        return;
      }
    }

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
        <Badge variant="amber">{t(`level.${levelConfig.id}`)}</Badge>
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

      {/* Challenge prompt dialog */}
      {showChallengePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-card-bg rounded-3xl p-8 max-w-sm w-full shadow-xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🌟</div>
              <h3 className="text-h2 font-bold text-body-text mb-3">{t('challenge.prompt.title')}</h3>
              <p className="text-body-md text-caption-text">{t('challenge.prompt.message')}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                fullWidth
                onClick={() => {
                  setShowChallengePrompt(false);
                  if (pendingResult) finishLevel(pendingResult);
                }}
              >
                {t('challenge.prompt.yes')}
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowChallengePrompt(false);
                  if (pendingResult) finishLevel(pendingResult);
                }}
              >
                {t('challenge.prompt.no')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
