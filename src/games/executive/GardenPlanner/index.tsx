import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GardenPlannerParams {
  gridSize: 3 | 4;
  plantCount: number;
  toolStepCount: number;
  weatherEventEnabled: boolean;
  sunRuleEnabled: boolean;
  plantPool: 'indian_household_plants';
}

interface Plant {
  id: string;
  emoji: string;
  name: string;
  kannadaName: string;
  sunNeeds: 'full' | 'partial';
  rainSensitive: boolean;
  toolHint: 'water' | 'dig';
}

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Phase sequence (design spec §4) ─────────────────────────────────────────
// garden_intro → planting → weather_event* → completion  (* medium/hard only)

type Phase = 'garden_intro' | 'planting' | 'weather_event' | 'completion';
const PHASES: Phase[] = ['garden_intro', 'planting', 'weather_event', 'completion'];

// ─── Plant pool — Indian household plants (design spec §6) ───────────────────

const PLANT_POOL: Plant[] = [
  { id: 'tulsi',     emoji: '🌿', name: 'Tulsi',         kannadaName: 'ತುಳಸಿ',     sunNeeds: 'full',    rainSensitive: false, toolHint: 'water' },
  { id: 'neem',      emoji: '🌳', name: 'Neem',          kannadaName: 'ಬೇವು',      sunNeeds: 'full',    rainSensitive: false, toolHint: 'dig'   },
  { id: 'marigold',  emoji: '🌼', name: 'Marigold',      kannadaName: 'ಚೆಂಡು ಹೂ', sunNeeds: 'full',    rainSensitive: false, toolHint: 'water' },
  { id: 'hibiscus',  emoji: '🌺', name: 'Hibiscus',      kannadaName: 'ದಾಸವಾಳ',   sunNeeds: 'full',    rainSensitive: true,  toolHint: 'water' },
  { id: 'curryleaf', emoji: '🍃', name: 'Curry Leaf',    kannadaName: 'ಕರಿಬೇವು',  sunNeeds: 'partial', rainSensitive: false, toolHint: 'dig'   },
  { id: 'jasmine',   emoji: '🌸', name: 'Jasmine',       kannadaName: 'ಮಲ್ಲಿಗೆ',  sunNeeds: 'partial', rainSensitive: true,  toolHint: 'water' },
  { id: 'aloe',      emoji: '🪴', name: 'Aloe Vera',     kannadaName: 'ಅಲೋ ವೇರಾ', sunNeeds: 'full',    rainSensitive: true,  toolHint: 'dig'   },
  { id: 'butterfly', emoji: '💐', name: 'Butterfly Pea', kannadaName: 'ಶಂಖಪುಷ್ಪ', sunNeeds: 'partial', rainSensitive: false, toolHint: 'water' },
];

function selectPlants(p: GardenPlannerParams): Plant[] {
  let pool = [...PLANT_POOL].sort(() => Math.random() - 0.5);
  // Ensure at least 1 rain-sensitive plant when weather event is active
  if (p.weatherEventEnabled) {
    const sensitive = pool.filter((pl) => pl.rainSensitive);
    const others    = pool.filter((pl) => !pl.rainSensitive);
    if (sensitive.length > 0) pool = [sensitive[0], ...others, ...sensitive.slice(1)];
  }
  // Ensure mix of full-sun and partial when sun rule is active
  if (p.sunRuleEnabled) {
    const full    = pool.filter((pl) => pl.sunNeeds === 'full');
    const partial = pool.filter((pl) => pl.sunNeeds === 'partial');
    if (full.length > 0 && partial.length > 0) {
      pool = [full[0], partial[0], ...full.slice(1), ...partial.slice(1)];
    }
  }
  return pool.slice(0, p.plantCount);
}

// Sun rule: full-sun plants → row 0 (sunniest); partial-sun → rows below
function isCorrectCell(plant: Plant, row: number, sunRuleEnabled: boolean): boolean {
  if (!sunRuleEnabled) return true;
  return plant.sunNeeds === 'full' ? row === 0 : row !== 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GardenPlanner({ levelConfig, onLevelComplete }: Props) {
  const { t, i18n } = useTranslation();
  const p = levelConfig.params as unknown as GardenPlannerParams;
  const startedAt = useRef(Date.now());

  const { currentPhase, advance, goTo } = useGamePhase<Phase>(PHASES);

  const [plants] = useState(() => selectPlants(p));

  // Which plants need tool prep (first toolStepCount in selection)
  const [toolPlantIds] = useState(
    () => new Set(plants.slice(0, p.toolStepCount).map((pl) => pl.id)),
  );

  // Grid placement
  const [grid, setGrid] = useState<(Plant | null)[][]>(() =>
    Array.from({ length: p.gridSize }, () => Array<Plant | null>(p.gridSize).fill(null)),
  );
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [placedIds, setPlacedIds] = useState<Set<string>>(new Set());

  // Metrics (refs — no re-render needed)
  const triedPlantIds  = useRef<Set<string>>(new Set());
  const toolPreppedIds = useRef<Set<string>>(new Set());
  const [firstPlacementCorrect, setFirstPlacementCorrect] = useState(0);

  // Tool prep inline modal
  const [pendingToolPlant, setPendingToolPlant] = useState<Plant | null>(null);
  const [toolFeedback, setToolFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Wrong-placement fade animation (spec §2: "plant fades away gently")
  const [fadingCell, setFadingCell] = useState<{
    row: number; col: number; plant: Plant; visible: boolean;
  } | null>(null);

  // Weather event
  const [weatherSelected, setWeatherSelected] = useState<Set<string>>(new Set());
  const [weatherSubmitted, setWeatherSubmitted] = useState(false);
  const [weatherCorrect, setWeatherCorrect] = useState<boolean | null>(null);

  // Completion message chosen once on mount (no score — encouragement only per spec §2)
  const [completionMsg] = useState(() => {
    const msgs = [
      t('garden-planner.completion.msg1', 'What a lovely garden! Well done!'),
      t('garden-planner.completion.msg2', "Your plants are going to thrive!"),
      t('garden-planner.completion.msg3', 'Beautiful planning! Your garden is ready!'),
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  });

  const allPlaced  = placedIds.size === plants.length;
  const trayPlants = plants.filter((pl) => !placedIds.has(pl.id));

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePlantTap(plant: Plant) {
    if (pendingToolPlant) return;
    if (toolPlantIds.has(plant.id) && !toolPreppedIds.current.has(plant.id)) {
      setPendingToolPlant(plant);
      setSelectedPlant(null);
    } else {
      setSelectedPlant((prev) => (prev?.id === plant.id ? null : plant));
    }
  }

  function handleToolChoice(tool: 'water' | 'dig') {
    if (!pendingToolPlant || toolFeedback !== null) return;
    const correct = pendingToolPlant.toolHint === tool;
    setToolFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setToolFeedback(null);
      if (correct) {
        toolPreppedIds.current.add(pendingToolPlant.id);
        setSelectedPlant(pendingToolPlant);
        setPendingToolPlant(null);
      }
      // Wrong: keep modal open so user can try again
    }, 1000);
  }

  function handleCellTap(row: number, col: number) {
    if (!selectedPlant || grid[row][col]) return;
    const correct = isCorrectCell(selectedPlant, row, p.sunRuleEnabled);

    if (!correct) {
      // Wrong zone — fade plant away gently, no counter (spec §2)
      triedPlantIds.current.add(selectedPlant.id);
      setFadingCell({ row, col, plant: selectedPlant, visible: true });
      // Two-step: paint opacity-100 first, then transition to opacity-0
      setTimeout(() => setFadingCell((prev) => prev ? { ...prev, visible: false } : null), 32);
      setTimeout(() => setFadingCell(null), 650);
      // selectedPlant remains active — user can try a different cell
      return;
    }

    const isFirstAttempt = !triedPlantIds.current.has(selectedPlant.id);
    if (isFirstAttempt) setFirstPlacementCorrect((c) => c + 1);
    triedPlantIds.current.add(selectedPlant.id);

    const newGrid = grid.map((r) => [...r]);
    newGrid[row][col] = selectedPlant;
    setGrid(newGrid);
    setPlacedIds((prev) => new Set([...prev, selectedPlant!.id]));
    setSelectedPlant(null);
  }

  function handleWeatherSubmit() {
    const rainSensitiveIds = new Set(plants.filter((pl) => pl.rainSensitive).map((pl) => pl.id));
    const correct =
      [...weatherSelected].every((id) => rainSensitiveIds.has(id)) &&
      [...rainSensitiveIds].every((id) => weatherSelected.has(id));
    setWeatherCorrect(correct);
    setWeatherSubmitted(true);
  }

  function completeGame() {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: { firstPlacementCorrect, totalPlants: plants.length, weatherAdaptationCorrect: weatherCorrect },
    });
  }

  // ── Phase: garden_intro ───────────────────────────────────────────────────

  if (currentPhase === 'garden_intro') {
    return (
      <div className="flex-1 flex flex-col items-center gap-5 p-6 bg-[#FAFAF8]">
        <div className="text-center">
          <span className="text-5xl">🌱</span>
          <h2 className="text-h2 font-bold text-body-text mt-2">
            {t('garden-planner.intro.title', 'Plan Your Garden!')}
          </h2>
          <p className="text-body-md text-caption-text mt-1">
            {p.sunRuleEnabled
              ? t('garden-planner.intro.sunRule', 'Place each plant in the right sunlight spot')
              : t('garden-planner.intro.simple', 'Place your plants in the garden')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 w-full max-w-md">
          {plants.map((plant) => (
            <div
              key={plant.id}
              className="bg-card-bg rounded-2xl p-4 flex items-center gap-4 border border-gray-100 shadow-sm"
            >
              <span className="text-4xl">{plant.emoji}</span>
              <div className="flex-1">
                <p className="text-h3 font-bold text-body-text">{plant.name}</p>
                {i18n.language === 'kn' && (
                  <p className="text-body-md text-caption-text">{plant.kannadaName}</p>
                )}
              </div>
              {p.sunRuleEnabled && (
                <span className="text-body-md text-caption-text font-semibold">
                  {plant.sunNeeds === 'full' ? '☀️ Full sun' : '🌤️ Partial'}
                </span>
              )}
              {plant.rainSensitive && p.weatherEventEnabled && (
                <span className="text-xl" title="Needs shelter from rain">🌧️</span>
              )}
            </div>
          ))}
        </div>

        {p.sunRuleEnabled && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-accent-amber/30 w-full max-w-md">
            <p className="text-body-md font-semibold text-body-text">
              {t('garden-planner.intro.sunHint', '☀️ Top row = sunniest spot')}
            </p>
            <p className="text-body-md text-caption-text mt-1">
              {t(
                'garden-planner.intro.sunHint2',
                'Full-sun plants go in the top row. Other rows have partial shade.',
              )}
            </p>
          </div>
        )}

        <button onClick={advance} className="btn-primary w-full max-w-md mt-auto">
          {t('garden-planner.intro.cta', "Let's Plant!")}
        </button>
      </div>
    );
  }

  // ── Phase: planting ───────────────────────────────────────────────────────

  if (currentPhase === 'planting') {
    return (
      <div className="flex-1 flex flex-col items-center gap-5 p-6 bg-[#FAFAF8]">

        {/* Tool prep inline modal (not a separate phase) */}
        {pendingToolPlant && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8">
            <div className="bg-card-bg rounded-3xl p-8 max-w-sm w-full shadow-xl">
              <div className="text-center mb-5">
                <span className="text-5xl">{pendingToolPlant.emoji}</span>
                <h3 className="text-h2 font-bold text-body-text mt-2">{pendingToolPlant.name}</h3>
                <p className="text-body-md text-caption-text mt-1">
                  {t('garden-planner.tool.question', 'Before planting, what does this plant need?')}
                </p>
              </div>

              {toolFeedback && (
                <div
                  className={`rounded-2xl p-3 mb-4 text-center ${
                    toolFeedback === 'correct' ? 'bg-green-50' : 'bg-amber-50'
                  }`}
                >
                  <p className={`text-h3 font-bold ${
                    toolFeedback === 'correct' ? 'text-emerald-green' : 'text-accent-amber'
                  }`}>
                    {toolFeedback === 'correct'
                      ? `✓ ${t('garden-planner.tool.correct', "That's right!")}`
                      : `💡 ${t('garden-planner.tool.wrong', 'Try the other one!')}`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleToolChoice('water')}
                  disabled={toolFeedback !== null}
                  className="rounded-2xl p-4 border-2 border-primary-blue/30 hover:border-primary-blue
                             hover:bg-primary-blue/5 flex flex-col items-center gap-2
                             min-h-[100px] transition-all disabled:opacity-50"
                >
                  <span className="text-4xl">🪣</span>
                  <span className="text-body-md font-semibold text-body-text">
                    {t('garden-planner.tool.water', 'Water it first')}
                  </span>
                </button>
                <button
                  onClick={() => handleToolChoice('dig')}
                  disabled={toolFeedback !== null}
                  className="rounded-2xl p-4 border-2 border-accent-amber/30 hover:border-accent-amber
                             hover:bg-amber-50 flex flex-col items-center gap-2
                             min-h-[100px] transition-all disabled:opacity-50"
                >
                  <span className="text-4xl">⛏️</span>
                  <span className="text-body-md font-semibold text-body-text">
                    {t('garden-planner.tool.dig', 'Loosen the soil')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instruction */}
        <div className="text-center w-full max-w-md">
          <h2 className="text-h2 font-bold text-body-text">
            {t('garden-planner.planting.title', 'Place Your Plants')}
          </h2>
          <p className="text-body-md text-caption-text mt-1">
            {selectedPlant
              ? t('garden-planner.planting.tapCell', 'Tap a spot in the garden for {{name}}', {
                  name: selectedPlant.name,
                })
              : t('garden-planner.planting.tapPlant', 'Tap a plant below, then tap a garden spot')}
          </p>
        </div>

        {p.sunRuleEnabled && (
          <div className="flex justify-between w-full max-w-md text-body-md text-caption-text px-1">
            <span>☀️ {t('garden-planner.planting.sunnyRow', 'Top row = Full sun')}</span>
            <span>🌤️ {t('garden-planner.planting.partialRows', 'Below = Partial shade')}</span>
          </div>
        )}

        {/* Garden grid — 100×100px min per spec §2 */}
        <div className="w-full max-w-md">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${p.gridSize}, 1fr)` }}
          >
            {Array.from({ length: p.gridSize * p.gridSize }, (_, idx) => {
              const row      = Math.floor(idx / p.gridSize);
              const col      = idx % p.gridSize;
              const occupant = grid[row][col];
              const isSunny  = row === 0;
              const canDrop  = !!selectedPlant && !occupant;
              const isFading = fadingCell?.row === row && fadingCell?.col === col;

              return (
                <button
                  key={`${row}-${col}`}
                  onClick={() => handleCellTap(row, col)}
                  disabled={!selectedPlant || !!occupant}
                  className={`
                    min-h-[100px] rounded-2xl flex flex-col items-center justify-center
                    border-2 transition-all duration-150
                    ${occupant
                      ? 'bg-green-50 border-emerald-green/40 cursor-default'
                      : canDrop
                      ? 'bg-primary-blue/10 border-primary-blue border-dashed cursor-pointer hover:bg-primary-blue/20'
                      : isSunny
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-white border-gray-200'}
                  `}
                >
                  {isFading ? (
                    // Fades away gently — no red, no sound, no counter (spec §2)
                    <span
                      className={`text-3xl transition-opacity duration-500 ${
                        fadingCell.visible ? 'opacity-80' : 'opacity-0'
                      }`}
                    >
                      {fadingCell.plant.emoji}
                    </span>
                  ) : occupant ? (
                    <>
                      <span className="text-3xl">{occupant.emoji}</span>
                      <span className="text-small text-caption-text font-semibold text-center px-1 leading-tight mt-1">
                        {occupant.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-xl opacity-20">{isSunny ? '☀️' : '🌤️'}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plant tray */}
        {trayPlants.length > 0 && (
          <div className="w-full max-w-md">
            <p className="text-body-md text-caption-text font-semibold mb-2">
              {t('garden-planner.planting.tray', 'Plants to place:')}
            </p>
            <div className="flex gap-3 flex-wrap">
              {trayPlants.map((plant) => {
                const needsTool =
                  toolPlantIds.has(plant.id) && !toolPreppedIds.current.has(plant.id);
                return (
                  <button
                    key={plant.id}
                    onClick={() => handlePlantTap(plant)}
                    className={`
                      flex flex-col items-center gap-1 rounded-2xl p-3 border-2
                      min-w-[80px] min-h-[80px] transition-all
                      ${selectedPlant?.id === plant.id
                        ? 'bg-primary-blue/10 border-primary-blue scale-105 shadow-md'
                        : 'bg-card-bg border-gray-200 hover:border-primary-blue/50'}
                    `}
                  >
                    <span className="text-3xl">{plant.emoji}</span>
                    <span className="text-small font-semibold text-body-text text-center leading-tight">
                      {plant.name}
                    </span>
                    {needsTool && (
                      <span className="text-small text-accent-amber">🔧 prep</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {allPlaced && (
          <button
            onClick={() => (p.weatherEventEnabled ? advance() : goTo('completion'))}
            className="btn-primary w-full max-w-md mt-auto"
          >
            {t('btn.continue', 'Continue')}
          </button>
        )}
      </div>
    );
  }

  // ── Phase: weather_event ──────────────────────────────────────────────────

  if (currentPhase === 'weather_event') {
    const placedPlants    = grid.flat().filter(Boolean) as Plant[];
    const rainSensitiveIds = new Set(plants.filter((pl) => pl.rainSensitive).map((pl) => pl.id));

    return (
      <div className="flex-1 flex flex-col items-center gap-5 p-6 bg-[#FAFAF8]">
        <div className="text-center">
          <span className="text-5xl">🌧️</span>
          <h2 className="text-h2 font-bold text-body-text mt-2">
            {t('garden-planner.weather.title', 'Heavy Rain is Coming!')}
          </h2>
          <p className="text-body-md text-caption-text mt-1">
            {t('garden-planner.weather.subtitle', 'Which plants need to be moved indoors?')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {placedPlants.map((plant) => {
            const isSel    = weatherSelected.has(plant.id);
            const isSensit = rainSensitiveIds.has(plant.id);
            let cls = 'bg-card-bg border-gray-200';
            if (weatherSubmitted) {
              if (isSel && isSensit)   cls = 'bg-green-100 border-emerald-green';
              else if (isSel)          cls = 'bg-amber-50 border-accent-amber';
              else if (isSensit)       cls = 'bg-gray-100 border-gray-300 opacity-60';
            } else if (isSel) {
              cls = 'bg-primary-blue/10 border-primary-blue';
            }
            return (
              <button
                key={plant.id}
                onClick={() => {
                  if (weatherSubmitted) return;
                  setWeatherSelected((prev) => {
                    const next = new Set(prev);
                    next.has(plant.id) ? next.delete(plant.id) : next.add(plant.id);
                    return next;
                  });
                }}
                disabled={weatherSubmitted}
                className={`rounded-2xl p-4 flex items-center gap-3 border-2 min-h-[80px] transition-all ${cls}`}
              >
                <span className="text-4xl">{plant.emoji}</span>
                <div className="flex-1 text-left">
                  <p className="text-h3 font-semibold text-body-text">{plant.name}</p>
                  {i18n.language === 'kn' && (
                    <p className="text-small text-caption-text">{plant.kannadaName}</p>
                  )}
                </div>
                {weatherSubmitted && isSel &&  isSensit && <span className="text-emerald-green text-xl">✓</span>}
                {weatherSubmitted && isSel && !isSensit && <span className="text-accent-amber  text-xl">✗</span>}
                {weatherSubmitted && !isSel && isSensit && <span className="text-caption-text  text-xl">○</span>}
              </button>
            );
          })}
        </div>

        {!weatherSubmitted ? (
          <button onClick={handleWeatherSubmit} className="btn-primary w-full max-w-md mt-auto">
            {t('btn.done', 'Done')}
          </button>
        ) : (
          <div className="w-full max-w-md mt-auto space-y-3">
            <div
              className={`rounded-2xl p-4 border text-center ${
                weatherCorrect
                  ? 'bg-green-50 border-emerald-green/30'
                  : 'bg-amber-50 border-accent-amber/30'
              }`}
            >
              <p className={`text-h3 font-bold ${weatherCorrect ? 'text-emerald-green' : 'text-accent-amber'}`}>
                {weatherCorrect
                  ? `🌟 ${t('garden-planner.weather.correct', 'All the right plants are safe!')}`
                  : `💡 ${t('garden-planner.weather.partial', 'The circled plants also needed shelter.')}`}
              </p>
            </div>
            <button onClick={advance} className="btn-primary w-full">
              {t('btn.continue', 'Continue')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Phase: completion — encouragement only, NO score numbers (spec §2) ────

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
      <span className="text-7xl">🌱</span>
      <h2 className="text-h1 font-bold text-body-text">{completionMsg}</h2>
      <div className="flex flex-wrap justify-center gap-3 max-w-xs">
        {plants.map((pl) => (
          <span key={pl.id} className="text-4xl">{pl.emoji}</span>
        ))}
      </div>
      <button onClick={completeGame} className="btn-primary w-full max-w-sm">
        {t('btn.continue', 'Continue')}
      </button>
    </div>
  );
}
