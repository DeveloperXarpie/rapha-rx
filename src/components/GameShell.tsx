import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSessionContext } from '../session/SessionManager';
import { track } from '../lib/analytics';
import { adjustDifficulty, scoreLevelLabel, scoreToLevel } from '../lib/dynamicDifficulty';
import { recordLastLevel } from '../lib/lastLevel';
import { getGame } from '../lib/gameCatalog';
import { UI_CLOSE_X } from '../lib/uiKit';
import { useAppStore } from '../store';
import { Button } from './ui/Button';
import type { LevelConfig } from '../games/types';
import { gardenKeeperPerformance } from '../games/attention/GardenKeeper/model';

export interface LevelResult {
  levelId: string;
  durationSeconds: number;
  completed: boolean;
  metrics: Record<string, unknown>;
  newDifficultyScore?: number;
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

/**
 * How long a category runs before rotating. A level completed before this
 * starts another round of the same game; Home derives its session-length copy
 * from it, so the two can never drift.
 */
export const ROTATION_THRESHOLD_SECONDS = 2 * 60; // 2 min per category

interface Anchor { top: number; left: number; right: number }

/**
 * Where the overlay chrome sits: the corners of the BOARD, not of the play box.
 *
 * The six rotation games letterbox a fixed design canvas into the box, so the box
 * corners are out in the margin beside the artwork - the level badge and the exit
 * visibly floated off the board's edge. Each of those games marks its rendered board
 * with `data-board`; everything else has no such element and keeps the box corners,
 * which is right for a game that fills the box with flow layout.
 *
 * Measured rather than computed, because the canvas size and the fit live inside each
 * game and the shell has no business duplicating either.
 */
function useBoardAnchor(enabled: boolean, gameId: string): [(el: HTMLDivElement | null) => void, Anchor | null] {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const measure = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const board = box.querySelector('[data-board]');
    if (!board) { setAnchor(null); return; }
    const b = board.getBoundingClientRect();
    const p = box.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0) return;
    /*
     * Clamped at zero: a board that has been given a croppable margin (geometry's SAFE_X)
     * can be drawn wider than the box, and a negative inset would park the level badge and
     * the exit off the side of the screen. The chrome belongs to the box, not the canvas.
     */
    const next = {
      top: Math.max(0, b.top - p.top),
      left: Math.max(0, b.left - p.left),
      right: Math.max(0, p.right - b.right),
    };
    // Sub-pixel equality, or the observer and this state trade updates forever.
    setAnchor((prev) =>
      prev && Math.abs(prev.top - next.top) < 0.5
        && Math.abs(prev.left - next.left) < 0.5
        && Math.abs(prev.right - next.right) < 0.5
        ? prev
        : next);
  }, []);

  const ref = useCallback((el: HTMLDivElement | null) => {
    boxRef.current = el;
    if (el && enabled) measure();
  }, [enabled, measure]);

  useEffect(() => {
    const box = boxRef.current;
    if (!enabled || !box) return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    // The board mounts after its sprites decode, and its transform changes on every
    // refit; neither is a resize of the box, so the observer alone would miss both.
    const mo = new MutationObserver(measure);
    mo.observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'data-board'] });
    /*
     * Both observers fire on connect for the case that matters (the board is already
     * laid out), and the ref callback measures on mount for the case where it is not.
     * Measuring synchronously here as well only added a second render on every mount.
     */
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [enabled, gameId, measure]);

  return [ref, anchor];
}

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
  const { secondsInCurrentCategory, triggerRotation, sessionComplete } = useSessionContext();
  const profile = useAppStore((s) => s.activeProfile);

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const startedAt = useRef<number>(Date.now());

  // Only the six games the daily session draws from carry a `data-board`; the other
  // nine are left exactly as they were.
  const isRotationGame = getGame(gameId)?.marquee === true;
  const [playBoxRef, anchor] = useBoardAnchor(isRotationGame, gameId);

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
    let newDifficultyScore: number | undefined;

    // Adjust dynamic difficulty score. Picture Postcard is exempt: its own
    // ladder engine is the adaptive authority and already wrote the derived
    // DifficultyState row inside commitTrial (spec SS2.4).
    if (userId && gameId !== 'picture-postcard') {
      // Calculate performance ratio from metrics
      const performanceRatio = computePerformanceRatio(gameId, result);
      const updated = await adjustDifficulty(userId, gameId, {
        completed: result.completed,
        performanceRatio,
      });
      newDifficultyScore = updated.score;

      /*
       * Keep Home's "Last time: level n" in step with the difficulty system
       * without reading through getTodayDifficulty, which writes on a cache
       * miss and on a fresh day returns a warm-up-decayed score rather than
       * the level actually reached.
       *
       * Fire and forget, like the analytics and Firestore writes around it: a
       * failed write costs a level label, not a round. Picture Postcard is
       * outside this branch for the same reason it is exempt above - its ladder
       * runs 1-100 and scoreToLevel's 1-10 would be a different number.
       */
      void recordLastLevel(userId, gameId, scoreToLevel(updated.score));
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

    finishLevel({ ...result, newDifficultyScore });
  }

  function finishLevel(result: LevelResult) {
    /*
     * Past the threshold we ask to rotate, but the ask can decline: `triggerRotation`
     * returns false for free play after the day's session (nothing left to rotate into)
     * and when there is no profile. Both used to fall through to nothing at all - no
     * navigation and no next round - which froze the game on its round-end card with
     * its own commit guard already spent, so the button was dead. Whenever rotation
     * does not move us, the next round starts here.
     */
    const rotated = secondsInCurrentCategory >= ROTATION_THRESHOLD_SECONDS && triggerRotation();
    if (!rotated) onLevelComplete(result);
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
    // A round played after the day's session is free play, so leaving it goes
    // back to the library rather than Home.
    navigate(sessionComplete ? '/app/free-play' : '/app/home');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Game content */}
      {/*
        The play box, which is now the whole route. The chrome bar that used to sit above
        it - game name, category tag, level tag and exit - is gone; the level and the exit
        survive as overlays inside this box, so they cost the board no height at all and
        every game grew by the bar's ~56px. The six games on useStageFit take that up on
        their own, because they measure this box rather than the window.

        It has a real height, because every level above it does, so a game can measure this
        box instead of reaching for `window.innerHeight` and subtracting a guess at the
        chrome. `overflow-hidden` is the contract: a game fits or it scales down, it never
        scrolls.

        `data-testid` is not decoration - scripts/portrait-smoke.mjs asserts against this
        exact element, and a structural selector would silently start matching the wrong
        node the next time anyone adds a div here.
      */}
      <div
        ref={playBoxRef}
        data-testid="play-box"
        /*
         * No padding for a rotation game. Those six letterbox a fixed canvas, so the
         * padding was 32px of white frame around artwork that was already margined by
         * its own fit - it bought nothing and cost the board a slice of both axes.
         * The other nine lay out in flow and still want the gutter.
         */
        className={`relative flex-1 min-h-0 overflow-hidden flex flex-col ${isRotationGame ? '' : 'p-4'}`}
      >
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

        {/*
          Overlay chrome, declared after the board so it paints above it without a z-index
          race. Picture Postcard renders its own 1-100 ladder level; showing the 0-1
          score's 1-10 label beside it would be two conflicting level numbers.
        */}
        {gameId !== 'picture-postcard' && (
          /*
           * Centred over the board, per the Sep-9 review. A full-width row rather than
           * `left: 50%` + a transform, because the board is only centred in the box when
           * its fit leaves equal margins; spanning the measured edges centres the plate
           * on the ARTWORK even when it does not.
           *
           * The row stops short of the exit button's column on both sides, so a long
           * translated label runs out of room before it runs underneath the exit.
           */
          <div
            className="absolute z-20 flex justify-center"
            style={{
              // Inset from the board's own corner when there is one, else the box's, and
              // never above a camera cutout: the board's art may run under one, but a
              // control that sits there is unreadable and on some devices untappable.
              top: `max(${(anchor?.top ?? 0) + 8}px, calc(var(--safe-top, 0px) + 8px))`,
              left: (anchor?.left ?? 0) + 60,
              right: (anchor?.right ?? 0) + 60,
              // Never eats a tap meant for the board underneath it.
              pointerEvents: 'none',
            }}
          >
            <span className="shell-tag-plate">{levelLabel}</span>
          </div>
        )}

        <button
          onClick={handleExit}
          /*
           * 44x44 rather than 48x48. Above the WCAG 2.5.5 minimum but deliberately below
           * this app's own 80px touch-min token: exit ends a round, and it should not be
           * easy to hit by accident. This exception applies to exit and nothing else.
           */
          className="absolute z-20 w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{
            top: `max(${(anchor?.top ?? 0) + 8}px, calc(var(--safe-top, 0px) + 8px))`,
            right: (anchor?.right ?? 0) + 8,
            // The kit's art carries the whole button, so no border or fill of our own.
            background: 'none', border: 'none', padding: 0,
            filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35))',
          }}
          aria-label={t('btn.exit')}
        >
          <img src={UI_CLOSE_X} alt="" aria-hidden="true" className="w-full h-full" draggable={false} />
        </button>
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

  if (gameId === 'picture-postcard') {
    const correct = m.correct === true ? 1 : 0;
    const distPenalty = typeof m.errorDistanceNorm === 'number' ? Math.min(0.3, m.errorDistanceNorm) : 0;
    const hintPenalty = 0.1 * ((m.hintsUsed as number) ?? 0);
    return Math.max(0, Math.min(1, correct - distPenalty - hintPenalty));
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

  if (gameId === 'train-yard') {
    // A train that was sent to the wrong station never counts as first-try, even once it
    // later reaches the right one — the measure is recall, not persistence.
    const firstTryCorrect = (m.firstTryCorrect as number) ?? 0;
    const resets          = (m.resets          as number) ?? 0;
    return Math.max(0, Math.min(1, firstTryCorrect / 4 - resets * 0.1));
  }

  if (gameId === 'garden-sequencer') {
    const firstCorrect = (m.firstAttemptCorrect as number) ?? 0;
    const resets       = (m.resetCount          as number) ?? 0;
    // 4 slots total; each reset penalises 10%
    let ratio = firstCorrect / 4;
    ratio = Math.max(0, ratio - resets * 0.1);
    return Math.min(1, ratio);
  }

  if (gameId === 'serve-guests') {
    // Items rather than guests: the round has no fail state, so the ratio has to be
    // granular enough to move the score on its own.
    const itemsServed    = (m.itemsServed    as number) ?? 0;
    const itemsRequested = (m.itemsRequested as number) ?? 1;
    const dishesBurnt    = (m.dishesBurnt    as number) ?? 0;
    const serveRatio  = itemsServed / Math.max(1, itemsRequested);
    const wastePenalty = Math.min(0.3, dishesBurnt * 0.05);
    return Math.max(0, Math.min(1, serveRatio - wastePenalty));
  }

  if (gameId === 'clear-the-way') {
    // Move efficiency is the whole reading: the puzzle has no fail state and no clock, so
    // a player who thrashes and a player who plans both finish, and only the move count
    // separates them.
    const movesUsed = (m.movesUsed as number) ?? 1;
    const minMoves  = (m.minMoves  as number) ?? 1;
    const resets    = (m.resets    as number) ?? 0;
    const hintsUsed = (m.hintsUsed as number) ?? 0;
    const efficiency = minMoves / Math.max(1, movesUsed);
    return Math.max(0, Math.min(1, efficiency - resets * 0.1 - hintsUsed * 0.15));
  }

  if (gameId === 'garden-keeper') {
    // A deliberate divergence from the house pattern of inlining each game's ratio: this
    // maths is unit-tested against the round model, and a second copy here would drift.
    return gardenKeeperPerformance({
      watered: (m.watered as number) ?? 0,
      targetCount: (m.targetCount as number) ?? 1,
      falseTaps: (m.falseTaps as number) ?? 0,
    });
  }

  if (gameId === 'market-memory') {
    // Wrong picks are penalised harder than misses: picking a twin is the specific
    // failure this game measures, whereas a miss is ordinary forgetting.
    const correct    = (m.correct    as number) ?? 0;
    const wrong      = (m.wrong      as number) ?? 0;
    const listLength = (m.listLength as number) ?? 4;
    const hintsUsed  = (m.hintsUsed  as number) ?? 0;
    const ratio = correct / Math.max(1, listLength) - wrong * 0.15 - hintsUsed * 0.05;
    return Math.max(0, Math.min(1, ratio));
  }

  // Default for non-dynamic games
  return result.completed ? 0.7 : 0.3;
}
