import { useParams, Navigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { getCurrentLevel } from '../lib/adaptiveDifficulty';
import { useEffect, useState } from 'react';
import GameShell, { type LevelResult } from '../components/GameShell';
import type { LevelConfig } from '../games/types';
import type { GameCategory } from '../styles/tokens';

// ─── Game imports ─────────────────────────────────────────────────────────────
import RememberMatch from '../games/memory/RememberMatch';
import ShoppingListRecall from '../games/memory/ShoppingListRecall';
import SequenceRepeat from '../games/memory/SequenceRepeat';
import SpotFocus from '../games/attention/SpotFocus';
import TargetTap from '../games/attention/TargetTap';
import FocusFilter from '../games/attention/FocusFilter';
import MorningRoutineQuest from '../games/executive/MorningRoutineQuest';
import RecipeBuilder from '../games/executive/RecipeBuilder';
import GardenPlanner from '../games/executive/GardenPlanner';

// ─── Level config imports ─────────────────────────────────────────────────────
import { levels as rememberMatchLevels } from '../games/memory/RememberMatch/levels.config';
import { levels as shoppingListLevels } from '../games/memory/ShoppingListRecall/levels.config';
import { levels as sequenceRepeatLevels } from '../games/memory/SequenceRepeat/levels.config';
import { levels as spotFocusLevels } from '../games/attention/SpotFocus/levels.config';
import { levels as targetTapLevels } from '../games/attention/TargetTap/levels.config';
import { levels as focusFilterLevels } from '../games/attention/FocusFilter/levels.config';
import { levels as morningRoutineLevels } from '../games/executive/MorningRoutineQuest/levels.config';
import { levels as recipeBuilderLevels } from '../games/executive/RecipeBuilder/levels.config';
import { levels as gardenPlannerLevels } from '../games/executive/GardenPlanner/levels.config';

// ─── Registry ─────────────────────────────────────────────────────────────────

type GameEntry = {
  component: React.ComponentType<{
    levelConfig: LevelConfig;
    onLevelComplete: (result: LevelResult) => void;
  }>;
  levels: LevelConfig[];
  category: GameCategory;
};

const GAME_REGISTRY: Record<string, GameEntry> = {
  'remember-match':         { component: RememberMatch,         levels: rememberMatchLevels,   category: 'memory' },
  'shopping-list-recall':   { component: ShoppingListRecall,   levels: shoppingListLevels,    category: 'memory' },
  'sequence-repeat':        { component: SequenceRepeat,        levels: sequenceRepeatLevels,  category: 'memory' },
  'spot-focus':             { component: SpotFocus,             levels: spotFocusLevels,       category: 'attention' },
  'target-tap':             { component: TargetTap,             levels: targetTapLevels,       category: 'attention' },
  'focus-filter':           { component: FocusFilter,           levels: focusFilterLevels,     category: 'attention' },
  'morning-routine-quest':  { component: MorningRoutineQuest,  levels: morningRoutineLevels,  category: 'executive' },
  'recipe-builder':         { component: RecipeBuilder,         levels: recipeBuilderLevels,   category: 'executive' },
  'garden-planner':         { component: GardenPlanner,         levels: gardenPlannerLevels,   category: 'executive' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameRouter() {
  const { gameId } = useParams<{ gameId: string }>();
  const profile = useAppStore((s) => s.activeProfile);
  const setCurrentGame = useAppStore((s) => s.setCurrentGame);

  const [levelId, setLevelId] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [loading, setLoading] = useState(true);

  const entry = gameId ? GAME_REGISTRY[gameId] : undefined;

  useEffect(() => {
    if (!gameId || !profile) return;
    getCurrentLevel(profile.userId, gameId).then((l) => {
      setLevelId(l);
      setLoading(false);
    });
  }, [gameId, profile]);

  useEffect(() => {
    if (gameId) setCurrentGame(gameId);
  }, [gameId, setCurrentGame]);

  if (!entry) return <Navigate to="/app/home" replace />;
  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-h3 text-caption-text">Loading game...</p>
    </div>
  );

  const levelConfig = entry.levels.find((l) => l.id === levelId) ?? entry.levels[0];
  const GameComponent = entry.component;

  function handleLevelComplete(result: LevelResult) {
    // After level complete in GameShell, navigate back to home
    // (GameShell handles rotation logic itself)
    // GameRouter just resets to home if not rotating
  }

  return (
    <GameShell
      gameId={gameId!}
      gameCategory={entry.category}
      levelConfig={levelConfig}
      onLevelComplete={handleLevelComplete}
      onExit={() => {}}
    >
      <GameComponent
        levelConfig={levelConfig}
        onLevelComplete={handleLevelComplete}
      />
    </GameShell>
  );
}
