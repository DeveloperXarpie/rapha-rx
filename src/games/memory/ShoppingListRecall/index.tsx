import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import AssetPanel from '../../../components/AssetPanel';
import { registerAsset } from '../../../lib/assets/catalog';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'study' | 'gap' | 'recall' | 'bonus_sort' | 'completion';

interface GroceryItem {
  id: string;
  assetId: string;
  label: string;
  category: 'vegetables' | 'fresh' | 'dry' | 'dairy' | 'spices';
  panelColorClass?: string;
}

interface RawGroceryItem {
  id: string;
  emoji: string;
  label: string;
  category: 'vegetables' | 'fresh' | 'dry' | 'dairy' | 'spices';
}

interface ShoppingListParams {
  itemCount: number;
  studyDurationMs: number;
  distractorGapEnabled: boolean;
  recallFieldSize: number;
  bonusSortEnabled: boolean;
}

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Item pool ────────────────────────────────────────────────────────────────

const RAW_GROCERY_POOL: RawGroceryItem[] = [
  { id: 'tomato',    emoji: '🍅', label: 'Tomato',        category: 'vegetables' },
  { id: 'onion',     emoji: '🧅', label: 'Onion',         category: 'vegetables' },
  { id: 'potato',    emoji: '🥔', label: 'Potato',        category: 'vegetables' },
  { id: 'brinjal',   emoji: '🍆', label: 'Brinjal',       category: 'vegetables' },
  { id: 'carrot',    emoji: '🥕', label: 'Carrot',        category: 'vegetables' },
  { id: 'cucumber',  emoji: '🥒', label: 'Cucumber',      category: 'vegetables' },
  { id: 'coconut',   emoji: '🥥', label: 'Coconut',       category: 'fresh'      },
  { id: 'banana',    emoji: '🍌', label: 'Banana',        category: 'fresh'      },
  { id: 'lemon',     emoji: '🍋', label: 'Lemon',         category: 'fresh'      },
  { id: 'mango',     emoji: '🥭', label: 'Mango',         category: 'fresh'      },
  { id: 'rice',      emoji: '🍚', label: 'Rice',          category: 'dry'        },
  { id: 'dal',       emoji: '🫘', label: 'Dal',           category: 'dry'        },
  { id: 'oil',       emoji: '🫙', label: 'Coconut Oil',   category: 'dry'        },
  { id: 'salt',      emoji: '🧂', label: 'Salt',          category: 'dry'        },
  { id: 'milk',      emoji: '🥛', label: 'Milk',          category: 'dairy'      },
  { id: 'butter',    emoji: '🧈', label: 'Butter',        category: 'dairy'      },
  { id: 'ginger',    emoji: '🫚', label: 'Ginger',        category: 'spices'     },
  { id: 'coriander', emoji: '🌿', label: 'Coriander',     category: 'spices'     },
  { id: 'tamarind',  emoji: '🌰', label: 'Tamarind',      category: 'spices'     },
  { id: 'mustard',   emoji: '🫛', label: 'Mustard Seeds', category: 'spices'     },
];

const GROCERY_POOL: GroceryItem[] = RAW_GROCERY_POOL.map((item) => {
  const assetId = `item.${item.id}`;
  registerAsset({ assetId, token: item.emoji });
  return {
    id: item.id,
    assetId,
    label: item.label,
    category: item.category,
  };
});

// ─── Content builder (randomised once per mount) ──────────────────────────────

function buildContent(p: ShoppingListParams) {
  const pool       = [...GROCERY_POOL].sort(() => Math.random() - 0.5);
  const studyItems = pool.slice(0, p.itemCount);
  const studyIds   = new Set(studyItems.map(i => i.id));
  const recallItems = [
    ...studyItems,
    ...pool.slice(p.itemCount, p.recallFieldSize),
  ].sort(() => Math.random() - 0.5);
  return { studyItems, recallItems, studyIds };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShoppingListRecall({ levelConfig, onLevelComplete }: Props) {
  const { t }     = useTranslation();
  const startedAt = useRef(Date.now());
  const p         = levelConfig.params as unknown as ShoppingListParams;

  const [content]                       = useState(() => buildContent(p));
  const [phase, setPhase]               = useState<Phase>('study');
  const [elapsed, setElapsed]           = useState(0);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [submitted, setSubmitted]       = useState(false);
  const [sortSelected, setSortSelected] = useState<Set<string>>(new Set());
  const [sortSubmitted, setSortSubmitted] = useState(false);

  // Study phase countdown
  useEffect(() => {
    if (phase !== 'study') return;
    if (elapsed >= p.studyDurationMs) { advanceFromStudy(); return; }
    const id = setInterval(() => setElapsed(e => e + 100), 100);
    return () => clearInterval(id);
  });

  // Gap auto-advance
  useEffect(() => {
    if (phase !== 'gap') return;
    const id = setTimeout(() => setPhase('recall'), 2000);
    return () => clearTimeout(id);
  }, [phase]);

  function advanceFromStudy() {
    setPhase(p.distractorGapEnabled ? 'gap' : 'recall');
  }

  function toggleRecall(id: string) {
    if (submitted) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const correctHits    = [...selected].filter(id =>  content.studyIds.has(id)).length;
  const falsePositives = [...selected].filter(id => !content.studyIds.has(id)).length;

  function completeLevel(bonusSortCompleted = false) {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        itemsRecalled: correctHits,
        totalItems:    p.itemCount,
        falsePositives,
        bonusSortCompleted,
      },
    });
  }

  // ── Study ────────────────────────────────────────────────────────────────────
  if (phase === 'study') {
    const progressPct = Math.min(100, (elapsed / p.studyDurationMs) * 100);
    return (
      <div className="flex-1 flex flex-col items-center gap-5 p-6 bg-[#FAFAF8]">
        <div className="text-center">
          <span className="text-5xl">🛒</span>
          <h2 className="game-title-banner game-title-banner-compact text-center mt-2">
            {t('shopping-list.study.title', 'Remember these items!')}
          </h2>
          <p className="text-body-md text-caption-text">
            {t('shopping-list.study.subtitle', 'Study the shopping list carefully')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
          {content.studyItems.map(item => (
            <div
              key={item.id}
              className="bg-card-bg rounded-2xl p-4 flex items-center gap-3 shadow-sm
                         border border-gray-100 min-h-[80px]"
            >
              <AssetPanel
                assetId={item.assetId}
                label={item.label}
                gameId="shopping-list-recall"
                panelColorClass={item.panelColorClass}
                className="rounded-xl px-2 py-1 flex items-center gap-3 w-full"
              />
            </div>
          ))}
        </div>

        <div className="w-full max-w-lg mt-auto space-y-3">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-blue rounded-full transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <button onClick={advanceFromStudy} className="btn-ready w-full">
            {t('shopping-list.study.ready', "I'm Ready!")}
          </button>
        </div>
      </div>
    );
  }

  // ── Gap ──────────────────────────────────────────────────────────────────────
  if (phase === 'gap') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center">
        <span className="text-7xl">🧠</span>
        <h2 className="text-h2 font-bold text-body-text">
          {t('shopping-list.gap.title', 'Now recall the list!')}
        </h2>
        <p className="text-h3 text-caption-text">
          {t('shopping-list.gap.subtitle', 'Get ready…')}
        </p>
      </div>
    );
  }

  // ── Recall ───────────────────────────────────────────────────────────────────
  if (phase === 'recall') {
    return (
      <div className="flex-1 flex flex-col items-center gap-5 p-6 bg-[#FAFAF8]">
        <div className="text-center">
          <h2 className="text-h2 font-bold text-body-text">
            {submitted
              ? t('shopping-list.recall.results', 'Here are your results!')
              : t('shopping-list.recall.title',   'Which items were on the list?')}
          </h2>
          {!submitted && (
            <p className="text-body-md text-caption-text mt-1">
              {t('shopping-list.recall.subtitle', 'Tap all the items you remember seeing')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
          {content.recallItems.map(item => {
            const isSel    = selected.has(item.id);
            const isTarget = content.studyIds.has(item.id);
            let cls = 'bg-card-bg border-gray-200';
            if (submitted) {
              if (isSel && isTarget)   cls = 'bg-green-100 border-emerald-green';
              else if (isSel)          cls = 'bg-amber-50 border-accent-amber';
              else if (isTarget)       cls = 'bg-gray-100 border-gray-300 opacity-60';
            } else if (isSel) {
              cls = 'bg-primary-blue/10 border-primary-blue';
            }
            return (
              <button
                key={item.id}
                onClick={() => toggleRecall(item.id)}
                disabled={submitted}
                className={`rounded-2xl p-4 flex items-center gap-3 border-2 min-h-[80px]
                            transition-all duration-150 text-left ${cls}`}
              >
                <AssetPanel
                  assetId={item.assetId}
                  label={item.label}
                  gameId="shopping-list-recall"
                  panelColorClass={item.panelColorClass}
                  className="rounded-xl px-2 py-1 flex items-center gap-3 flex-1"
                />
                {submitted && isSel &&  isTarget && <span className="text-emerald-green text-xl">✓</span>}
                {submitted && isSel && !isTarget && <span className="text-accent-amber  text-xl">✗</span>}
                {submitted && !isSel && isTarget && <span className="text-caption-text  text-xl">○</span>}
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button onClick={() => setSubmitted(true)} className="btn-primary w-full max-w-lg mt-auto">
            {t('shopping-list.recall.check', 'Check My Memory')}
          </button>
        ) : (
          <div className="w-full max-w-lg mt-auto space-y-3">
            <div className="bg-card-bg rounded-2xl p-5 text-center border border-gray-100 shadow-sm">
              <p className="text-h1 font-bold text-primary-blue">{correctHits} / {p.itemCount}</p>
              <p className="text-body-md text-caption-text mt-1">
                {t('shopping-list.recall.score', 'items correctly recalled')}
              </p>
              {falsePositives > 0 && (
                <p className="text-body-md text-caption-text">
                  +{falsePositives} {t('shopping-list.recall.extra', 'extra selected')}
                </p>
              )}
            </div>
            <button
              onClick={() => p.bonusSortEnabled ? setPhase('bonus_sort') : setPhase('completion')}
              className="btn-primary w-full"
            >
              {t('btn.continue', 'Continue')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Bonus sort ───────────────────────────────────────────────────────────────
  if (phase === 'bonus_sort') {
    const vegIds     = new Set(content.studyItems.filter(i => i.category === 'vegetables').map(i => i.id));
    const allCorrect =
      sortSubmitted &&
      vegIds.size > 0 &&
      [...sortSelected].every(id => vegIds.has(id)) &&
      [...vegIds].every(id => sortSelected.has(id));

    return (
      <div className="flex-1 flex flex-col items-center gap-5 p-6 bg-[#FAFAF8]">
        <div className="text-center">
          <span className="text-4xl">🌟</span>
          <h2 className="text-h2 font-bold text-body-text mt-2">
            {t('shopping-list.sort.title', 'Bonus Challenge!')}
          </h2>
          <p className="text-body-md text-caption-text mt-1">
            {t('shopping-list.sort.subtitle', 'Which of these items are vegetables?')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
          {content.studyItems.map(item => {
            const isSel = sortSelected.has(item.id);
            const isVeg = vegIds.has(item.id);
            let cls = 'bg-card-bg border-gray-200';
            if (sortSubmitted) {
              if (isSel && isVeg)   cls = 'bg-green-100 border-emerald-green';
              else if (isSel)       cls = 'bg-amber-50 border-accent-amber';
              else if (isVeg)       cls = 'bg-gray-100 border-gray-300 opacity-60';
            } else if (isSel) {
              cls = 'bg-primary-blue/10 border-primary-blue';
            }
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (sortSubmitted) return;
                  setSortSelected(prev => {
                    const next = new Set(prev);
                    next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                    return next;
                  });
                }}
                disabled={sortSubmitted}
                className={`rounded-2xl p-4 flex items-center gap-3 border-2 min-h-[80px] transition-all ${cls}`}
              >
                <AssetPanel
                  assetId={item.assetId}
                  label={item.label}
                  gameId="shopping-list-recall"
                  panelColorClass={item.panelColorClass}
                  className="rounded-xl px-2 py-1 flex items-center gap-3 w-full"
                />
              </button>
            );
          })}
        </div>

        {!sortSubmitted ? (
          <button onClick={() => setSortSubmitted(true)} className="btn-primary w-full max-w-lg mt-auto">
            {t('shopping-list.sort.check', 'Check')}
          </button>
        ) : (
          <div className="w-full max-w-lg mt-auto space-y-3">
            {allCorrect && (
              <p className="text-center text-h3 font-bold text-emerald-green">
                🌟 {t('shopping-list.sort.perfect', 'Perfect! You sorted them all correctly!')}
              </p>
            )}
            <button onClick={() => completeLevel(allCorrect)} className="btn-primary w-full">
              {t('btn.continue', 'Continue')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Completion ───────────────────────────────────────────────────────────────
  const score = correctHits;
  const total = p.itemCount;
  const msg =
    score === total
      ? t('shopping-list.completion.perfect', 'Perfect recall! Excellent!')
      : score >= Math.ceil(total * 0.7)
      ? t('shopping-list.completion.great',   'Wonderful memory!')
      : t('shopping-list.completion.good',    'Good effort! Keep practising.');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
      <span className="text-7xl">🛒</span>
      <h2 className="text-h1 font-bold text-body-text">{msg}</h2>
      <div className="bg-card-bg rounded-2xl p-6 shadow-sm border border-gray-100">
        <p className="text-h1 font-bold text-primary-blue">{score} / {total}</p>
        <p className="text-body-md text-caption-text mt-1">
          {t('shopping-list.completion.items', 'items remembered')}
        </p>
      </div>
      <button onClick={() => completeLevel(false)} className="btn-primary w-full max-w-sm">
        {t('btn.continue', 'Continue')}
      </button>
    </div>
  );
}
