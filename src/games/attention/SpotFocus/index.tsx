import { useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

interface SceneCell {
  id: string;
  display: string;
  label: string;
  isDifference?: true;
}

interface Scene {
  label: string;
  originalRows: SceneCell[][];
  modifiedRows: SceneCell[][];
}

// ── EASY SCENES ───────────────────────────────────────────────────────────────

const KITCHEN_A: Scene = {
  label: 'Kitchen',
  originalRows: [
    [ {id:'window', display:'🪟', label:'Window'}, {id:'jar', display:'🫙', label:'Pickle jar'}, {id:'kettle', display:'🫖', label:'Tea kettle'} ],
    [ {id:'pot', display:'🫕', label:'Cooking pot'}, {id:'cooker', display:'🍲', label:'Pressure cooker'}, {id:'spoon', display:'🥄', label:'Serving spoon'} ],
    [ {id:'tomato', display:'🍅🍅', label:'Tomatoes'}, {id:'curry', display:'🌿', label:'Curry leaves'}, {id:'stove', display:'🔥', label:'Gas stove'} ],
  ],
  modifiedRows: [
    [ {id:'window', display:'🪟', label:'Window'}, {id:'jar', display:'🫙', label:'Pickle jar'}, {id:'kettle', display:'☕', label:'Coffee cup', isDifference:true} ],
    [ {id:'pot', display:'', label:'Empty space', isDifference:true}, {id:'cooker', display:'🍲', label:'Pressure cooker'}, {id:'spoon', display:'🥄', label:'Serving spoon'} ],
    [ {id:'tomato', display:'🍅🍅🍅', label:'Tomatoes', isDifference:true}, {id:'curry', display:'🌿', label:'Curry leaves'}, {id:'stove', display:'🔥', label:'Gas stove'} ],
  ],
};

const KITCHEN_B: Scene = {
  label: 'Kitchen',
  originalRows: [
    [ {id:'lamp', display:'💡', label:'Light'}, {id:'bowl', display:'🥣', label:'Bowl'}, {id:'ladle', display:'🥄', label:'Ladle'} ],
    [ {id:'dal', display:'🫘', label:'Dal pot'}, {id:'cooker2', display:'🍲', label:'Pressure cooker'}, {id:'oil', display:'🫙', label:'Oil jar'} ],
    [ {id:'onion', display:'🧅🧅', label:'Onions'}, {id:'lime', display:'🍋', label:'Lime'}, {id:'salt', display:'🧂', label:'Salt'} ],
  ],
  modifiedRows: [
    [ {id:'lamp', display:'💡', label:'Light'}, {id:'bowl', display:'🪣', label:'Bucket', isDifference:true}, {id:'ladle', display:'🥄', label:'Ladle'} ],
    [ {id:'dal', display:'🫘', label:'Dal pot'}, {id:'cooker2', display:'🍲', label:'Pressure cooker'}, {id:'oil', display:'', label:'Empty', isDifference:true} ],
    [ {id:'onion', display:'🧅🧅🧅', label:'Onions', isDifference:true}, {id:'lime', display:'🍋', label:'Lime'}, {id:'salt', display:'🧂', label:'Salt'} ],
  ],
};

const EASY_SCENES = [KITCHEN_A, KITCHEN_B];

// ── MEDIUM SCENES ─────────────────────────────────────────────────────────────

const GARDEN_A: Scene = {
  label: 'Garden',
  originalRows: [
    [
      {id:'tulsi', display:'🌿', label:'Tulsi'},
      {id:'neem', display:'🌳', label:'Neem tree'},
      {id:'marigold', display:'🌺', label:'Marigold'},
      {id:'hibiscus', display:'🌸', label:'Hibiscus'},
    ],
    [
      {id:'pot1', display:'🪴', label:'Pot'},
      {id:'watering', display:'🚿', label:'Watering can'},
      {id:'bench', display:'🪑', label:'Bench'},
      {id:'jasmine', display:'🌼', label:'Jasmine'},
    ],
    [
      {id:'soil', display:'🟫', label:'Soil patch'},
      {id:'butterfly', display:'🦋', label:'Butterfly'},
      {id:'sparrow', display:'🐦', label:'Sparrow'},
      {id:'sun', display:'☀️', label:'Sunny patch'},
    ],
  ],
  modifiedRows: [
    [
      {id:'tulsi', display:'🌿', label:'Tulsi'},
      {id:'neem', display:'🌳', label:'Neem tree'},
      {id:'marigold', display:'🌻', label:'Sunflower', isDifference:true},
      {id:'hibiscus', display:'🌸', label:'Hibiscus'},
    ],
    [
      {id:'pot1', display:'', label:'Empty', isDifference:true},
      {id:'watering', display:'🪣', label:'Bucket', isDifference:true},
      {id:'bench', display:'🪑', label:'Bench'},
      {id:'jasmine', display:'🌼', label:'Jasmine'},
    ],
    [
      {id:'soil', display:'🟫', label:'Soil patch'},
      {id:'butterfly', display:'🐛', label:'Caterpillar', isDifference:true},
      {id:'sparrow', display:'🐦', label:'Sparrow'},
      {id:'sun', display:'🌧️', label:'Rain cloud', isDifference:true},
    ],
  ],
};

const GARDEN_B: Scene = {
  label: 'Garden',
  originalRows: [
    [
      {id:'aloe', display:'🌵', label:'Aloe vera'},
      {id:'rose', display:'🌹', label:'Rose'},
      {id:'curry', display:'🌿', label:'Curry leaf'},
      {id:'mango', display:'🥭', label:'Mango tree'},
    ],
    [
      {id:'rake', display:'🧹', label:'Rake'},
      {id:'bucket', display:'🪣', label:'Bucket'},
      {id:'seeds', display:'🌱', label:'Seedlings'},
      {id:'crow', display:'🐦‍⬛', label:'Crow'},
    ],
    [
      {id:'path', display:'🟤', label:'Garden path'},
      {id:'wall', display:'🧱', label:'Wall'},
      {id:'tap', display:'🚰', label:'Garden tap'},
      {id:'coconut', display:'🥥', label:'Coconut tree'},
    ],
  ],
  modifiedRows: [
    [
      {id:'aloe', display:'🌵', label:'Aloe vera'},
      {id:'rose', display:'🌷', label:'Tulip', isDifference:true},
      {id:'curry', display:'🌿', label:'Curry leaf'},
      {id:'mango', display:'🥭', label:'Mango tree'},
    ],
    [
      {id:'rake', display:'🧹', label:'Rake'},
      {id:'bucket', display:'🪣', label:'Bucket'},
      {id:'seeds', display:'🌱🌱', label:'More seedlings', isDifference:true},
      {id:'crow', display:'', label:'Empty', isDifference:true},
    ],
    [
      {id:'path', display:'🟤', label:'Garden path'},
      {id:'wall', display:'🧱', label:'Wall'},
      {id:'tap', display:'🚿', label:'Shower tap', isDifference:true},
      {id:'coconut', display:'🍌', label:'Banana tree', isDifference:true},
    ],
  ],
};

const MEDIUM_SCENES = [GARDEN_A, GARDEN_B];

// ── HARD SCENES ───────────────────────────────────────────────────────────────

const LIVING_ROOM_A: Scene = {
  label: 'Living Room',
  originalRows: [
    [
      {id:'clock', display:'🕰️', label:'Clock'},
      {id:'photo', display:'🖼️', label:'Photo frame'},
      {id:'window2', display:'🪟', label:'Window'},
      {id:'fan', display:'💨', label:'Ceiling fan'},
    ],
    [
      {id:'sofa', display:'🛋️', label:'Sofa'},
      {id:'lamp2', display:'💡', label:'Floor lamp'},
      {id:'table', display:'🪵', label:'Coffee table'},
      {id:'plant', display:'🌿', label:'Indoor plant'},
    ],
    [
      {id:'remote', display:'📱', label:'Remote'},
      {id:'cup2', display:'☕', label:'Tea cup'},
      {id:'book', display:'📚', label:'Books'},
      {id:'cat', display:'🐈', label:'Cat'},
    ],
    [
      {id:'mat', display:'🟩', label:'Doormat'},
      {id:'shoes', display:'👟', label:'Shoes'},
      {id:'bag', display:'👜', label:'Bag'},
      {id:'umbrella', display:'☂️', label:'Umbrella'},
    ],
  ],
  modifiedRows: [
    [
      {id:'clock', display:'⏰', label:'Alarm clock', isDifference:true},
      {id:'photo', display:'🖼️', label:'Photo frame'},
      {id:'window2', display:'🚪', label:'Door', isDifference:true},
      {id:'fan', display:'💨', label:'Ceiling fan'},
    ],
    [
      {id:'sofa', display:'🛋️', label:'Sofa'},
      {id:'lamp2', display:'', label:'Empty', isDifference:true},
      {id:'table', display:'🪵', label:'Coffee table'},
      {id:'plant', display:'🌵', label:'Cactus', isDifference:true},
    ],
    [
      {id:'remote', display:'📺', label:'TV remote', isDifference:true},
      {id:'cup2', display:'☕', label:'Tea cup'},
      {id:'book', display:'📖', label:'Single book', isDifference:true},
      {id:'cat', display:'🐈', label:'Cat'},
    ],
    [
      {id:'mat', display:'🟩', label:'Doormat'},
      {id:'shoes', display:'👟👟', label:'Pair of shoes', isDifference:true},
      {id:'bag', display:'👜', label:'Bag'},
      {id:'umbrella', display:'', label:'Empty', isDifference:true},
    ],
  ],
};

const HARD_SCENES = [LIVING_ROOM_A];

// ── PHASE TYPE ────────────────────────────────────────────────────────────────

// ── Scene picker (avoids consecutive repeats) ────────────────────────────────
const lastSceneIndex: Record<string, number> = {};

function pickScene(pool: Scene[], difficultyId: string): Scene {
  if (pool.length === 1) return pool[0];
  const last = lastSceneIndex[difficultyId] ?? -1;
  let idx: number;
  do { idx = Math.floor(Math.random() * pool.length); } while (idx === last);
  lastSceneIndex[difficultyId] = idx;
  return pool[idx];
}

type Phase = 'scene_intro' | 'find_differences' | 'completion';

// ── COMPONENT ─────────────────────────────────────────────────────────────────

export default function SpotFocus({ levelConfig, onLevelComplete }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance } = useGamePhase<Phase>([
    'scene_intro',
    'find_differences',
    'completion',
  ]);

  const scene = useMemo<Scene>(() => {
    const pool =
      levelConfig.id === 'level_5'                                  ? HARD_SCENES   :
      levelConfig.id === 'level_3' || levelConfig.id === 'level_4'  ? MEDIUM_SCENES :
                                                                       EASY_SCENES;
    return pickScene(pool, levelConfig.id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- stable per mount

  const [found, setFound] = useState<Set<string>>(new Set());
  const falseTapsRef = useRef(0);
  const startedAt = useRef(Date.now());

  // Use params.differenceCount so level_1 (2 required) can complete before finding all 3 in scene
  const effectiveDiffCount = levelConfig.params.differenceCount as number;

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
      // Zero response — nothing changes in DOM
    }
    // Already found: zero response too
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
      'flex-1 min-h-[80px] min-w-[80px] rounded-xl flex items-center justify-center text-4xl bg-app-bg relative select-none';
    const emptyClasses = isEmpty ? 'border-2 border-dashed border-gray-300' : '';
    const interactiveClasses = interactive
      ? 'cursor-pointer active:scale-95 transition-transform'
      : '';

    return (
      <div
        key={cell.id}
        className={`${baseClasses} ${emptyClasses} ${interactiveClasses}`}
        aria-label={cell.label}
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
            <span className="text-emerald-green text-3xl font-bold">✓</span>
          </div>
        )}
      </div>
    );
  }

  function renderScene(rows: SceneCell[][], interactive: boolean) {
    return (
      <div className="bg-card-bg rounded-2xl p-3 flex flex-col gap-1 flex-1">
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
        <h2 className="text-h2 font-bold text-body-text text-center">
          {t('spot-focus.intro.heading', 'Can you spot the differences?')}
        </h2>
        <p className="text-body-md text-caption-text text-center max-w-lg">
          {t(
            'spot-focus.intro.instruction',
            'Look at both pictures carefully. Tap on the right picture where you see a difference.'
          )}
        </p>

        <div className="w-full flex flex-col md:flex-row gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-body-md font-semibold text-caption-text text-center">
              {t('spot-focus.label.original', 'Original')}
            </p>
            {renderScene(scene.originalRows, false)}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-body-md font-semibold text-primary-blue text-center">
              {t('spot-focus.label.modified', 'Find differences here →')}
            </p>
            {renderScene(scene.modifiedRows, false)}
          </div>
        </div>

        <div className="w-full max-w-xs mt-auto">
          <Button fullWidth onClick={advance}>
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
            <p className="text-body-md font-semibold text-caption-text text-center">
              {t('spot-focus.label.original', 'Original')}
            </p>
            {renderScene(scene.originalRows, false)}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-body-md font-semibold text-primary-blue text-center">
              {t('spot-focus.label.modified', 'Find differences here →')}
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
