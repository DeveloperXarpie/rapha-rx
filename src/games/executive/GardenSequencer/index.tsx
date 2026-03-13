import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GardenSequencerParams {
  activityIds: string[];
  anchorFirstStep: boolean;
}

interface ActivityItem {
  id: string;
  emoji: string;
  labelEn: string;
  labelKn: string;
  labelHi: string;
}

interface Activity {
  id: string;
  emoji: string;
  titleEn: string;
  titleKn: string;
  titleHi: string;
  completionEn: string; // shown on completion screen
  items: [ActivityItem, ActivityItem, ActivityItem, ActivityItem]; // correct order
}

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Phase sequence ───────────────────────────────────────────────────────────
type Phase = 'goal_card' | 'placement' | 'completion';
const PHASES: Phase[] = ['goal_card', 'placement', 'completion'];

// ─── All 10 activities — garden lifecycle (design spec §10 levels) ────────────

const ALL_ACTIVITIES: Activity[] = [
  {
    id: 'plant_seed',
    emoji: '🌱',
    titleEn: 'Plant a seed',
    titleKn: 'ತೋಟದಲ್ಲಿ ಬೀಜ ನೆಡಿ',
    titleHi: 'बगीचे में बीज बोएं',
    completionEn: 'Well done! The seed is planted and ready to grow.',
    items: [
      { id: 'dig',   emoji: '⛏️', labelEn: 'Dig a hole',      labelKn: 'ಗುದ್ದಲಿ',          labelHi: 'कुदाल' },
      { id: 'seed',  emoji: '🌱', labelEn: 'Place the seed',  labelKn: 'ಬೀಜ',              labelHi: 'बीज' },
      { id: 'water', emoji: '🪣', labelEn: 'Water gently',    labelKn: 'ನೀರಿನ ಕ್ಯಾನ್',    labelHi: 'पानी का डब्बा' },
      { id: 'cover', emoji: '🤲', labelEn: 'Cover with soil', labelKn: 'ಮಣ್ಣು',            labelHi: 'मिट्टी' },
    ],
  },
  {
    id: 'water_garden',
    emoji: '🪣',
    titleEn: 'Water the garden',
    titleKn: 'ಎಲ್ಲಾ ಗಿಡಗಳಿಗೆ ನೀರು ಹಾಕಿ',
    titleHi: 'सभी पौधों को पानी दें',
    completionEn: 'Wonderful! Your plants have been watered beautifully.',
    items: [
      { id: 'check_soil',  emoji: '👆', labelEn: 'Check the soil',       labelKn: 'ಮಣ್ಣು ಪರೀಕ್ಷೆ',     labelHi: 'मिट्टी जाँच' },
      { id: 'fill_can',    emoji: '🚿', labelEn: 'Fill the watering can', labelKn: 'ನಲ್ಲಿ',              labelHi: 'नल' },
      { id: 'water_plants',emoji: '🪣', labelEn: 'Water each plant',      labelKn: 'ನೀರಿನ ಕ್ಯಾನ್',     labelHi: 'पानी का डब्बा' },
      { id: 'empty_can',   emoji: '🫗', labelEn: 'Empty excess water',    labelKn: 'ಖಾಲಿ ಕ್ಯಾನ್',      labelHi: 'खाली डब्बा' },
    ],
  },
  {
    id: 'weed_bed',
    emoji: '🌿',
    titleEn: 'Weed the garden bed',
    titleKn: 'ತರಕಾರಿ ಹಾಸಿಗೆಯ ಕಳೆ ತೆಗೆಯಿರಿ',
    titleHi: 'सब्जी की क्यारी से खरपतवार हटाएं',
    completionEn: 'Excellent! The garden bed is clean and ready.',
    items: [
      { id: 'spot_weeds', emoji: '👁️', labelEn: 'Spot the weeds',   labelKn: 'ಗಮನಿಸಿ',       labelHi: 'ध्यान दें' },
      { id: 'gloves',     emoji: '🧤', labelEn: 'Put on gloves',    labelKn: 'ಕೈಗವಸು',       labelHi: 'दस्ताने' },
      { id: 'loosen',     emoji: '🍴', labelEn: 'Loosen the soil',  labelKn: 'ಕೈ ಗುದ್ದಲಿ',  labelHi: 'हाथ की कुदाल' },
      { id: 'mulch',      emoji: '🌾', labelEn: 'Add mulch',        labelKn: 'ಮಲ್ಚ್',         labelHi: 'गीली घास' },
    ],
  },
  {
    id: 'harvest_veg',
    emoji: '🍅',
    titleEn: 'Harvest the vegetables',
    titleKn: 'ಹಣ್ಣಾದ ತರಕಾರಿ ಕೊಯ್ಯಿ',
    titleHi: 'पकी हुई सब्जियां काटें',
    completionEn: 'Lovely! Fresh vegetables are ready for the kitchen.',
    items: [
      { id: 'check_ripe', emoji: '👁️', labelEn: 'Check if ripe',        labelKn: 'ಬಣ್ಣ ಪರೀಕ್ಷೆ',  labelHi: 'रंग जाँच' },
      { id: 'cut',        emoji: '✂️', labelEn: 'Cut from the plant',   labelKn: 'ಕತ್ತರಿ',         labelHi: 'कैंची' },
      { id: 'rinse',      emoji: '💧', labelEn: 'Rinse the produce',     labelKn: 'ನೀರು',           labelHi: 'पानी' },
      { id: 'basket',     emoji: '🧺', labelEn: 'Place in basket',       labelKn: 'ಬುಟ್ಟಿ',        labelHi: 'टोकरी' },
    ],
  },
  {
    id: 'collect_flowers',
    emoji: '🌸',
    titleEn: 'Collect flowers',
    titleKn: 'ತೋಟದಿಂದ ತಾಜಾ ಹೂಗಳನ್ನು ಆಯ್ಕೆ ಮಾಡಿ',
    titleHi: 'बगीचे से ताजे फूल चुनें',
    completionEn: 'Beautiful! Your fresh flowers are ready.',
    items: [
      { id: 'pick_blooms',  emoji: '👁️', labelEn: 'Choose the best blooms', labelKn: 'ಹೂ ಆಯ್ಕೆ',        labelHi: 'फूल चुनाव' },
      { id: 'cut_stem',     emoji: '✂️', labelEn: 'Cut the stem',            labelKn: 'ಕತ್ತರಿ',           labelHi: 'कैंची' },
      { id: 'strip_leaves', emoji: '🌿', labelEn: 'Remove lower leaves',     labelKn: 'ಎಲೆ ತೆಗೆ',        labelHi: 'पत्ती हटाएं' },
      { id: 'water_vase',   emoji: '🪣', labelEn: 'Place in water',          labelKn: 'ನೀರಿನ ಬಕೆಟ್',    labelHi: 'पानी की बाल्टी' },
    ],
  },
  {
    id: 'make_bouquet',
    emoji: '💐',
    titleEn: 'Make a flower bouquet',
    titleKn: 'ಮನೆಗಾಗಿ ಹೂಗುಚ್ಛ ತಯಾರಿಸಿ',
    titleHi: 'घर के लिए फूलों का गुलदस्ता बनाएं',
    completionEn: 'Gorgeous! Your bouquet is ready to brighten the home.',
    items: [
      { id: 'sort_colour', emoji: '🎨', labelEn: 'Sort by colour',   labelKn: 'ಬಣ್ಣ ವಿಂಗಡಿಸಿ', labelHi: 'रंग छांटें' },
      { id: 'arrange',     emoji: '🙌', labelEn: 'Arrange the bunch', labelKn: 'ಜೋಡಿಸಿ',         labelHi: 'सजाएं' },
      { id: 'tie_stems',   emoji: '🪡', labelEn: 'Tie the stems',     labelKn: 'ದಾರ',             labelHi: 'धागा' },
      { id: 'wrap',        emoji: '📦', labelEn: 'Wrap and present',  labelKn: 'ಸುತ್ತಿ',         labelHi: 'लपेटें' },
    ],
  },
  {
    id: 'compost_waste',
    emoji: '♻️',
    titleEn: 'Make garden compost',
    titleKn: 'ಅಡುಗೆಮನೆ ತ್ಯಾಜ್ಯವನ್ನು ಗೊಬ್ಬರವಾಗಿ ಪರಿವರ್ತಿಸಿ',
    titleHi: 'रसोई के कचरे को खाद में बदलें',
    completionEn: 'Brilliant! Kitchen waste turned into garden gold.',
    items: [
      { id: 'collect_scraps', emoji: '🥬', labelEn: 'Collect scraps',       labelKn: 'ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹ', labelHi: 'कचरा इकट्ठा' },
      { id: 'chop',           emoji: '🔪', labelEn: 'Chop into pieces',      labelKn: 'ಕತ್ತರಿಸಿ',       labelHi: 'काटें' },
      { id: 'compost_bin',    emoji: '🗑️', labelEn: 'Add to compost bin',   labelKn: 'ಗೊಬ್ಬರ ಡಬ್ಬ',  labelHi: 'खाद डब्बा' },
      { id: 'mix',            emoji: '🍴', labelEn: 'Mix it in',             labelKn: 'ಗೊಬ್ಬರ ಮಿಶ್ರ', labelHi: 'मिलाएं' },
    ],
  },
  {
    id: 'repot_plant',
    emoji: '🪴',
    titleEn: 'Repot a plant',
    titleKn: 'ಗಿಡವನ್ನು ದೊಡ್ಡ ಕುಂಡಕ್ಕೆ ಸ್ಥಳಾಂತರಿಸಿ',
    titleHi: 'पौधे को बड़े गमले में लगाएं',
    completionEn: 'Wonderful! Your plant has a lovely new home.',
    items: [
      { id: 'remove_old',   emoji: '🏺', labelEn: 'Remove from old pot',   labelKn: 'ಹಳೇ ಕುಂಡ',   labelHi: 'पुराना गमला' },
      { id: 'shake_roots',  emoji: '🤲', labelEn: 'Shake off old soil',    labelKn: 'ಹಳೇ ಮಣ್ಣು',  labelHi: 'पुरानी मिट्टी' },
      { id: 'new_pot',      emoji: '🪴', labelEn: 'Place in new pot',      labelKn: 'ಹೊಸ ಕುಂಡ',   labelHi: 'नया गमला' },
      { id: 'water_settle', emoji: '🪣', labelEn: 'Water to settle roots', labelKn: 'ನೀರು',         labelHi: 'पानी' },
    ],
  },
  {
    id: 'market_stall',
    emoji: '🛒',
    titleEn: 'Sell at the market',
    titleKn: 'ತೋಟದ ಉತ್ಪನ್ನಗಳನ್ನು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಮಾರಾಟ ಮಾಡಿ',
    titleHi: 'बगीचे की उपज बाजार में बेचें',
    completionEn: 'Excellent! Your market stall is a great success.',
    items: [
      { id: 'pack',     emoji: '🧺', labelEn: 'Pack the produce',      labelKn: 'ಪ್ಯಾಕ್ ಮಾಡಿ', labelHi: 'पैक करें' },
      { id: 'label',    emoji: '🏷️', labelEn: 'Label each bundle',    labelKn: 'ಲೇಬಲ್',         labelHi: 'लेबल' },
      { id: 'set_stall',emoji: '🪑', labelEn: 'Set up the stall',      labelKn: 'ಅಂಗಡಿ ತೆರೆ',  labelHi: 'दुकान लगाएं' },
      { id: 'serve',    emoji: '🤝', labelEn: 'Serve the customer',    labelKn: 'ಗ್ರಾಹಕ',        labelHi: 'ग्राहक' },
    ],
  },
  {
    id: 'save_seeds',
    emoji: '🫙',
    titleEn: 'Save seeds for next season',
    titleKn: 'ಮುಂದಿನ ಋತುವಿಗಾಗಿ ತೋಟದಿಂದ ಬೀಜ ಉಳಿಸಿ',
    titleHi: 'अगले मौसम के लिए बगीचे से बीज बचाएं',
    completionEn: 'Perfect! Your seeds are saved for a new garden next season.',
    items: [
      { id: 'dry_pod',    emoji: '🌾', labelEn: 'Let the pod dry',      labelKn: 'ಒಣಗಿದ ಕಾಯಿ',   labelHi: 'सूखी फली' },
      { id: 'open_pod',   emoji: '🤲', labelEn: 'Open the pod',         labelKn: 'ಕಾಯಿ ತೆರೆ',    labelHi: 'फली खोलें' },
      { id: 'collect_seeds', emoji: '🫙', labelEn: 'Collect the seeds', labelKn: 'ಬೀಜ ಸಂಗ್ರಹ',  labelHi: 'बीज इकट्ठा' },
      { id: 'envelope',   emoji: '📩', labelEn: 'Store in envelope',    labelKn: 'ಲಕೋಟೆ',         labelHi: 'लिफाफा' },
    ],
  },
];

const ACTIVITY_MAP = new Map(ALL_ACTIVITIES.map((a) => [a.id, a]));

function pickActivity(ids: string[]): Activity {
  const id = ids[Math.floor(Math.random() * ids.length)];
  return ACTIVITY_MAP.get(id) ?? ALL_ACTIVITIES[0];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GardenSequencer({ levelConfig, onLevelComplete }: Props) {
  const { t, i18n } = useTranslation();
  const p = levelConfig.params as unknown as GardenSequencerParams;
  const startedAt = useRef(Date.now());

  const { currentPhase, advance } = useGamePhase<Phase>(PHASES);

  // Stable activity per mount
  const activity = useMemo(() => pickActivity(p.activityIds), []);

  // Slot 0 pre-filled if anchor enabled
  const [slots, setSlots] = useState<(ActivityItem | null)[]>(() =>
    p.anchorFirstStep
      ? [activity.items[0], null, null, null]
      : [null, null, null, null],
  );

  // Tray — shuffled, minus the anchor if applicable
  const [trayItems, setTrayItems] = useState<ActivityItem[]>(() =>
    shuffle(p.anchorFirstStep ? activity.items.slice(1) : [...activity.items]),
  );

  const [selectedItem, setSelectedItem] = useState<ActivityItem | null>(null);
  const [wrongSlotIndex, setWrongSlotIndex] = useState<number | null>(null);
  const [wrongPromptVisible, setWrongPromptVisible] = useState(false);

  // Metrics (refs — no re-render needed)
  const firstAttemptCorrect = useRef(p.anchorFirstStep ? 1 : 0);
  const totalAttempts = useRef(0);
  const attemptedSlots = useRef<Set<number>>(p.anchorFirstStep ? new Set([0]) : new Set());
  const [resetCount, setResetCount] = useState(0);

  // Helpers
  function getLabel(item: ActivityItem): string {
    if (i18n.language === 'kn') return item.labelKn;
    if (i18n.language === 'hi') return item.labelHi;
    return item.labelEn;
  }

  function getTitle(): string {
    if (i18n.language === 'kn') return activity.titleKn;
    if (i18n.language === 'hi') return activity.titleHi;
    return activity.titleEn;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleItemTap(item: ActivityItem) {
    if (currentPhase !== 'placement') return;
    setSelectedItem((prev) => (prev?.id === item.id ? null : item));
    setWrongSlotIndex(null);
    setWrongPromptVisible(false);
  }

  function handleSlotTap(slotIndex: number) {
    if (currentPhase !== 'placement' || !selectedItem) return;
    if (slots[slotIndex] !== null) return; // already filled

    totalAttempts.current += 1;
    const correctPosition = activity.items.findIndex((i) => i.id === selectedItem.id);

    if (correctPosition === slotIndex) {
      // Correct placement
      if (!attemptedSlots.current.has(slotIndex)) {
        firstAttemptCorrect.current += 1;
      }
      attemptedSlots.current.add(slotIndex);

      const newSlots = [...slots];
      newSlots[slotIndex] = selectedItem;
      setSlots(newSlots);
      setTrayItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
      setSelectedItem(null);

      // All 4 placed → advance to completion
      if (newSlots.every((s) => s !== null)) {
        setTimeout(() => advance(), 800);
      }
    } else {
      // Wrong placement — amber flash, item stays in tray
      attemptedSlots.current.add(slotIndex); // mark as attempted
      setWrongSlotIndex(slotIndex);
      setWrongPromptVisible(true);
      setSelectedItem(null);
      setTimeout(() => {
        setWrongSlotIndex(null);
        setWrongPromptVisible(false);
      }, 1800);
    }
  }

  function handleReset() {
    setResetCount((c) => c + 1);
    const anchoredSlot = p.anchorFirstStep ? [activity.items[0]] : [];
    setSlots(p.anchorFirstStep ? [activity.items[0], null, null, null] : [null, null, null, null]);
    const remaining = p.anchorFirstStep ? activity.items.slice(1) : [...activity.items];
    setTrayItems(shuffle(remaining));
    setSelectedItem(null);
    setWrongSlotIndex(null);
    setWrongPromptVisible(false);
    // Reset metrics for this attempt
    firstAttemptCorrect.current = anchoredSlot.length;
    totalAttempts.current = 0;
    attemptedSlots.current = p.anchorFirstStep ? new Set([0]) : new Set();
  }

  // ── Phase: goal_card ──────────────────────────────────────────────────────

  if (currentPhase === 'goal_card') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-[#FAFAF8]">
        <span className="text-8xl">{activity.emoji}</span>
        <div>
          <h2 className="text-h1 font-bold text-body-text">{getTitle()}</h2>
          <p className="text-h3 text-caption-text mt-3">
            {t('garden-sequencer.goal.subtitle', 'Place the 4 steps in the right order')}
          </p>
          {p.anchorFirstStep && (
            <p className="text-body-md text-caption-text mt-2 italic">
              {t('garden-sequencer.goal.anchor', 'Step 1 is already placed to help you start!')}
            </p>
          )}
        </div>

        {/* Step preview tiles */}
        <div className="flex gap-3 justify-center flex-wrap">
          {activity.items.map((item, i) => (
            <div
              key={item.id}
              className={`w-[80px] h-[80px] rounded-2xl border-2 flex flex-col items-center
                          justify-center gap-1 shadow-sm
                          ${p.anchorFirstStep && i === 0
                            ? 'bg-green-50 border-emerald-green/60'
                            : 'bg-white border-gray-200'}`}
            >
              <span className="text-3xl">{item.emoji}</span>
            </div>
          ))}
        </div>

        <button onClick={advance} className="btn-primary w-full max-w-sm mt-2">
          {t('btn.startGame', 'Start!')}
        </button>
      </div>
    );
  }

  // ── Phase: placement ──────────────────────────────────────────────────────

  if (currentPhase === 'placement') {
    const allPlaced = slots.every((s) => s !== null);

    return (
      <div className="flex-1 flex flex-col gap-4 p-5 bg-[#FAFAF8]">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{activity.emoji}</span>
            <p className="text-h3 font-bold text-body-text">{getTitle()}</p>
          </div>
          <button
            onClick={handleReset}
            className="text-body-md text-caption-text border border-gray-200 rounded-xl
                       px-3 py-1 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {t('garden-sequencer.btn.startOver', 'Start over')}
          </button>
        </div>

        {/* Wrong placement prompt */}
        {wrongPromptVisible && (
          <div className="bg-amber-50 border border-accent-amber/40 rounded-2xl p-3 text-center">
            <p className="text-body-md font-semibold text-accent-amber">
              💡 {t('garden-sequencer.wrong', "Hmm — what would you do first?")}
            </p>
          </div>
        )}

        {/* Instruction hint */}
        {!wrongPromptVisible && (
          <p className="text-body-md text-caption-text text-center">
            {selectedItem
              ? t('garden-sequencer.tapSlot', 'Now tap a numbered step to place it')
              : t('garden-sequencer.tapItem', 'Tap an item below, then tap the step number')}
          </p>
        )}

        {/* Numbered slots — Step 1 → Step 4 */}
        <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
          {slots.map((slotItem, slotIndex) => {
            const isAnchor = p.anchorFirstStep && slotIndex === 0;
            const isEmpty = slotItem === null;
            const isWrong = wrongSlotIndex === slotIndex;
            const canDrop = !!selectedItem && isEmpty && !isAnchor;

            return (
              <button
                key={slotIndex}
                onClick={() => handleSlotTap(slotIndex)}
                disabled={!isEmpty || isAnchor}
                aria-label={`Step ${slotIndex + 1}`}
                className={`
                  min-h-[80px] rounded-2xl border-2 flex items-center gap-4 px-4
                  transition-all duration-150
                  ${slotItem
                    ? 'bg-green-50 border-emerald-green/60 cursor-default'
                    : isWrong
                    ? 'bg-amber-50 border-accent-amber'
                    : canDrop
                    ? 'bg-primary-blue/10 border-primary-blue border-dashed cursor-pointer hover:bg-primary-blue/20'
                    : 'bg-white border-gray-200'}
                `}
              >
                {/* Step number badge */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    text-h3 font-bold
                    ${slotItem ? 'bg-emerald-green/20 text-emerald-green'
                               : isWrong ? 'bg-accent-amber/20 text-accent-amber'
                               : 'bg-gray-100 text-caption-text'}`}
                >
                  {slotIndex + 1}
                </div>

                {slotItem ? (
                  <>
                    <span className="text-3xl">{slotItem.emoji}</span>
                    <div className="flex-1 text-left">
                      <p className="text-body-md font-semibold text-body-text leading-tight">
                        {getLabel(slotItem)}
                      </p>
                      {i18n.language !== 'en' && (
                        <p className="text-small text-caption-text">{slotItem.labelEn}</p>
                      )}
                    </div>
                    <span className="text-emerald-green text-xl font-bold">✓</span>
                  </>
                ) : isWrong ? (
                  <p className="text-body-md text-accent-amber font-semibold flex-1 text-left">
                    {t('garden-sequencer.wrong', "Hmm — what would you do first?")}
                  </p>
                ) : (
                  <p className="text-body-md text-caption-text flex-1 text-left">
                    {t('garden-sequencer.emptySlot', 'Tap to place here')}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Item tray */}
        <div className="mt-auto w-full max-w-md mx-auto">
          <p className="text-body-md text-caption-text font-semibold mb-2 text-center">
            {t('garden-sequencer.tray', 'Items to place:')}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {/* If anchor, show anchored item dimmed */}
            {p.anchorFirstStep && (
              <div
                className="min-w-[100px] min-h-[100px] rounded-2xl border-2 border-gray-200
                           bg-gray-50 flex flex-col items-center justify-center gap-2
                           opacity-40 cursor-default"
              >
                <span className="text-4xl">{activity.items[0].emoji}</span>
                <span className="text-small font-semibold text-body-text text-center px-1 leading-tight">
                  {getLabel(activity.items[0])}
                </span>
              </div>
            )}
            {trayItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  aria-label={getLabel(item)}
                  className={`
                    min-w-[100px] min-h-[100px] rounded-2xl border-2 flex flex-col
                    items-center justify-center gap-2 transition-all duration-100
                    ${isSelected
                      ? 'bg-primary-blue/10 border-primary-blue scale-105 shadow-md'
                      : 'bg-card-bg border-gray-200 hover:border-primary-blue/40 active:scale-95'}
                  `}
                >
                  <span className="text-4xl pointer-events-none">{item.emoji}</span>
                  <span className="text-small font-semibold text-body-text text-center px-2 leading-tight pointer-events-none">
                    {getLabel(item)}
                  </span>
                  {i18n.language !== 'en' && (
                    <span className="text-small text-caption-text text-center px-2 leading-tight pointer-events-none">
                      {item.labelEn}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Completion overlay — shouldn't normally be visible since we auto-advance */}
        {allPlaced && (
          <div className="flex items-center justify-center py-2">
            <p className="text-h3 font-semibold text-emerald-green animate-pulse">
              {t('garden-sequencer.allPlaced', '🌟 All steps placed!')}
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Phase: completion — goal card + sequence + encouragement (spec Phase 4) ─

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-[#FAFAF8]">
      <span className="text-7xl">{activity.emoji}</span>
      <h2 className="text-h2 font-bold text-body-text">{getTitle()}</h2>

      {/* Completed sequence */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {activity.items.map((item, i) => (
          <div
            key={item.id}
            className="bg-green-50 border border-emerald-green/40 rounded-2xl
                       flex items-center gap-3 px-4 py-3"
          >
            <span className="text-emerald-green font-bold text-h3 w-6 text-center">{i + 1}</span>
            <span className="text-2xl">{item.emoji}</span>
            <span className="text-body-md font-semibold text-body-text flex-1 text-left">
              {getLabel(item)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-h3 text-caption-text font-semibold">{activity.completionEn}</p>

      <button
        onClick={() =>
          onLevelComplete({
            levelId: levelConfig.id,
            durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
            completed: true,
            metrics: {
              firstAttemptCorrect: firstAttemptCorrect.current,
              totalAttempts: totalAttempts.current,
              resetCount,
            },
          })
        }
        className="btn-primary w-full max-w-sm mt-2"
      >
        {t('btn.continue', 'Continue')}
      </button>
    </div>
  );
}
