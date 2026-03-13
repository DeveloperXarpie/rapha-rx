import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { getTodayDifficulty, getRememberMatchParams, getSpotFocusParams, getMorningRoutineParams, getWordSearchParams, scoreToLevel } from '../lib/dynamicDifficulty';
import { useCallback, useEffect, useState, useMemo } from 'react';
import GameShell, { type LevelResult } from '../components/GameShell';
import type { LevelConfig } from '../games/types';
import type { GameCategory } from '../styles/tokens';

// ─── Game imports ─────────────────────────────────────────────────────────────
import RememberMatch from '../games/memory/RememberMatch';
import ShoppingListRecall from '../games/memory/ShoppingListRecall';
import SequenceRepeat from '../games/memory/SequenceRepeat';
import SpotFocus from '../games/attention/SpotFocus';
import WordSearch from '../games/attention/WordSearch';
import FocusFilter from '../games/attention/FocusFilter';
import MorningRoutineQuest from '../games/executive/MorningRoutineQuest';
import RecipeBuilder from '../games/executive/RecipeBuilder';
import GardenSequencer from '../games/executive/GardenSequencer';

// ─── Level config imports (fallback for non-dynamic games) ────────────────────
import { levels as shoppingListLevels } from '../games/memory/ShoppingListRecall/levels.config';
import { levels as sequenceRepeatLevels } from '../games/memory/SequenceRepeat/levels.config';
import { levels as focusFilterLevels } from '../games/attention/FocusFilter/levels.config';
import { levels as recipeBuilderLevels } from '../games/executive/RecipeBuilder/levels.config';
import { levels as gardenSequencerLevels } from '../games/executive/GardenSequencer/levels.config';

// ─── Content generators ───────────────────────────────────────────────────────
import { generateRememberMatchContent, type GeneratedRememberMatchContent } from '../lib/contentGenerators/rememberMatch';
import { generateSpotFocusContent, type GeneratedScene } from '../lib/contentGenerators/spotFocus';
import { generateMorningRoutineContent, type GeneratedRoutineContent } from '../lib/contentGenerators/morningRoutine';
import { generateWordSearchContent } from '../lib/contentGenerators/wordSearch';

// ─── Registry ─────────────────────────────────────────────────────────────────

type GameEntry = {
  component: React.ComponentType<{
    levelConfig: LevelConfig;
    onLevelComplete: (result: LevelResult) => void;
    generatedContent?: any;
  }>;
  levels?: LevelConfig[];
  category: GameCategory;
  /** If true, this game uses the dynamic difficulty system */
  dynamic: boolean;
};

const GAME_REGISTRY: Record<string, GameEntry> = {
  'remember-match':         { component: RememberMatch,        category: 'memory',     dynamic: true },
  'shopping-list-recall':   { component: ShoppingListRecall,   levels: shoppingListLevels,    category: 'memory',     dynamic: false },
  'sequence-repeat':        { component: SequenceRepeat,       levels: sequenceRepeatLevels,  category: 'memory',     dynamic: false },
  'spot-focus':             { component: SpotFocus,            category: 'attention',  dynamic: true },
  'word-search':            { component: WordSearch,           category: 'attention',  dynamic: true },
  'focus-filter':           { component: FocusFilter,          levels: focusFilterLevels,     category: 'attention',  dynamic: false },
  'morning-routine-quest':  { component: MorningRoutineQuest,  category: 'executive',  dynamic: true },
  'recipe-builder':         { component: RecipeBuilder,        levels: recipeBuilderLevels,   category: 'executive',  dynamic: false },
  'garden-sequencer':       { component: GardenSequencer,      levels: gardenSequencerLevels, category: 'executive',  dynamic: false },
};

// ─── Dynamic content generation ───────────────────────────────────────────────

function generateContentForGame(gameId: string, score: number): { levelConfig: LevelConfig; generatedContent: unknown } {
  const level = scoreToLevel(score);
  const levelId = `level_${Math.min(level, 5)}` as LevelConfig['id'];

  if (gameId === 'remember-match') {
    const params = getRememberMatchParams(score);
    const content = generateRememberMatchContent(params);
    return {
      levelConfig: { id: levelId, labelKey: `level.${level}`, params: params as unknown as Record<string, unknown> },
      generatedContent: content,
    };
  }

  if (gameId === 'spot-focus') {
    const params = getSpotFocusParams(score);
    const content = generateSpotFocusContent(params);
    return {
      levelConfig: { id: levelId, labelKey: `level.${level}`, params: params as unknown as Record<string, unknown> },
      generatedContent: content,
    };
  }

  if (gameId === 'morning-routine-quest') {
    const params = getMorningRoutineParams(score);
    const content = generateMorningRoutineContent(params);
    return {
      levelConfig: { id: levelId, labelKey: `level.${level}`, params: params as unknown as Record<string, unknown> },
      generatedContent: content,
    };
  }

  if (gameId === 'word-search') {
    const params = getWordSearchParams(score);
    const content = generateWordSearchContent(params);
    return {
      levelConfig: { id: levelId, labelKey: `level.${level}`, params: params as unknown as Record<string, unknown> },
      generatedContent: content,
    };
  }

  throw new Error(`No dynamic generator for game: ${gameId}`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameRouter() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.activeProfile);
  const setCurrentGame = useAppStore((s) => s.setCurrentGame);

  const [difficultyScore, setDifficultyScore] = useState(0);
  const [loading, setLoading] = useState(true);
  // Incrementing this key forces a full remount of GameShell + game component between rounds
  const [gameKey, setGameKey] = useState(0);

  const entry = gameId ? GAME_REGISTRY[gameId] : undefined;

  const refreshDifficulty = useCallback(async () => {
    if (!gameId || !profile) return;
    if (entry?.dynamic) {
      const state = await getTodayDifficulty(profile.userId, gameId);
      setDifficultyScore(state.score);
    }
  }, [gameId, profile, entry?.dynamic]);

  useEffect(() => {
    refreshDifficulty().then(() => setLoading(false));
  }, [refreshDifficulty]);

  useEffect(() => {
    if (gameId) setCurrentGame(gameId);
  }, [gameId, setCurrentGame]);

  // Generate content for this round (regenerated each time gameKey changes)
  const { levelConfig, generatedContent } = useMemo(() => {
    if (!entry || !gameId) return { levelConfig: { id: 'level_1' as const, labelKey: 'level.1', params: {} }, generatedContent: undefined };

    if (entry.dynamic) {
      return generateContentForGame(gameId, difficultyScore);
    }

    // Static fallback for non-dynamic games
    const staticLevels = entry.levels ?? [];
    const fallback = staticLevels[0] ?? { id: 'level_1' as const, labelKey: 'level.1', params: {} };
    return { levelConfig: fallback, generatedContent: undefined };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, difficultyScore, gameId, entry?.dynamic]);

  if (!entry) return <Navigate to="/app/home" replace />;
  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-h3 text-caption-text">Loading game...</p>
    </div>
  );

  const GameComponent = entry.component;

  async function handleLevelComplete() {
    await refreshDifficulty();
    setGameKey((k) => k + 1);
  }

  return (
    <GameShell
      key={gameKey}
      gameId={gameId!}
      gameCategory={entry.category}
      levelConfig={levelConfig}
      difficultyScore={difficultyScore}
      onLevelComplete={handleLevelComplete}
      onExit={() => navigate('/app/home')}
    >
      <GameComponent
        key={gameKey}
        levelConfig={levelConfig}
        onLevelComplete={handleLevelComplete}
        generatedContent={generatedContent}
      />
    </GameShell>
  );
}
