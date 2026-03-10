/**
 * Procedural content generator for MorningRoutineQuest.
 * Assembles unique routine scenarios from step/decision/disruption banks.
 */

import type { MorningRoutineDynamicParams } from '../../lib/dynamicDifficulty';

// ── Step Bank ────────────────────────────────────────────────────────────────

interface StepDef {
  id: string;
  emoji: string;
  label: string;
  subLabel: string;
  category: 'morning' | 'prep' | 'activity' | 'transition';
}

const STEP_BANK: StepDef[] = [
  // Morning essentials (position 1-2 typically)
  { id: 'wake',        emoji: '🌅', label: 'Wake up',              subLabel: 'Start the morning',     category: 'morning' },
  { id: 'brush',       emoji: '🪥', label: 'Brush teeth',          subLabel: 'Fresh and clean',       category: 'morning' },
  { id: 'wash_face',   emoji: '💧', label: 'Wash face',            subLabel: 'Cool water',            category: 'morning' },
  { id: 'freshen',     emoji: '🚿', label: 'Freshen up',           subLabel: 'Bathe and get ready',   category: 'morning' },

  // Preparation steps (position 3-5 typically)
  { id: 'breakfast',   emoji: '🍽️', label: 'Eat breakfast',        subLabel: 'Idli or upma',          category: 'prep' },
  { id: 'chai',        emoji: '☕', label: 'Drink chai',            subLabel: 'Sit and relax',         category: 'prep' },
  { id: 'water',       emoji: '💧', label: 'Drink water',          subLabel: 'Stay hydrated',         category: 'prep' },
  { id: 'meds',        emoji: '💊', label: 'Take medicine',        subLabel: 'As prescribed',         category: 'prep' },
  { id: 'dress',       emoji: '👗', label: 'Wear clean clothes',   subLabel: 'Comfortable outfit',    category: 'prep' },
  { id: 'yoga_cloth',  emoji: '👕', label: 'Wear yoga clothes',    subLabel: 'Comfortable outfit',    category: 'prep' },
  { id: 'docs',        emoji: '📋', label: 'Collect documents',    subLabel: 'Health records',        category: 'prep' },
  { id: 'list',        emoji: '📝', label: 'Write shopping list',  subLabel: 'What is needed',        category: 'prep' },
  { id: 'bag',         emoji: '🛍️', label: 'Take cloth bags',     subLabel: 'Eco-friendly',          category: 'prep' },
  { id: 'money',       emoji: '💵', label: 'Take money',           subLabel: 'Check the amount',      category: 'prep' },
  { id: 'shoes',       emoji: '👟', label: 'Wear shoes',           subLabel: 'Comfortable pair',      category: 'prep' },
  { id: 'clean_room',  emoji: '🧹', label: 'Tidy the room',       subLabel: 'Make it welcoming',     category: 'prep' },
  { id: 'cook',        emoji: '🍳', label: 'Prepare food',         subLabel: 'Sambar and rice',       category: 'prep' },

  // Activity / destination (last steps typically)
  { id: 'temple',      emoji: '🛕', label: 'Walk to temple',       subLabel: 'Morning puja',          category: 'activity' },
  { id: 'garden',      emoji: '🌳', label: 'Go to the garden',     subLabel: 'Fresh air',             category: 'activity' },
  { id: 'yoga',        emoji: '🧘', label: 'Do yoga',              subLabel: 'In the garden',         category: 'activity' },
  { id: 'walk',        emoji: '🚶', label: 'Go for a walk',        subLabel: 'In the garden',         category: 'activity' },
  { id: 'market',      emoji: '🛒', label: 'Go to market',         subLabel: 'Before it gets hot',    category: 'activity' },
  { id: 'hospital',    emoji: '🏥', label: 'Leave for hospital',   subLabel: 'On time',               category: 'activity' },
  { id: 'wait_door',   emoji: '🪑', label: 'Wait at the door',     subLabel: 'Welcome guests',        category: 'activity' },
];

// ── Scenario templates ──────────────────────────────────────────────────────

interface ScenarioTemplate {
  emoji: string;
  title: string;
  contextDescription: string;
  requiredStepIds: string[];  // steps that must be included, in order
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    emoji: '🛕', title: 'Getting Ready for the Temple',
    contextDescription: 'Today you are visiting the neighbourhood temple for morning puja.',
    requiredStepIds: ['wake', 'freshen', 'breakfast', 'dress', 'temple'],
  },
  {
    emoji: '🧘', title: 'Yoga in the Garden',
    contextDescription: 'Yoga class starts at 7am in the care home garden — help get ready in time!',
    requiredStepIds: ['wake', 'wash_face', 'yoga_cloth', 'water', 'garden'],
  },
  {
    emoji: '🌅', title: 'Morning Wash',
    contextDescription: 'A simple morning routine before a relaxing day at home.',
    requiredStepIds: ['wake', 'brush', 'breakfast', 'chai'],
  },
  {
    emoji: '🌳', title: 'Morning Garden Walk',
    contextDescription: 'Help plan a simple morning walk in the care home garden.',
    requiredStepIds: ['wake', 'water', 'shoes', 'walk'],
  },
  {
    emoji: '🏥', title: 'Getting Ready for the Doctor',
    contextDescription: 'Help Amma get ready for her checkup at the district hospital at 10am!',
    requiredStepIds: ['wake', 'freshen', 'meds', 'dress', 'docs', 'hospital'],
  },
  {
    emoji: '👨‍👩‍👧‍👦', title: 'Family is Coming!',
    contextDescription: 'The grandchildren are coming for lunch — help prepare for their visit!',
    requiredStepIds: ['wake', 'freshen', 'clean_room', 'cook', 'dress', 'wait_door'],
  },
  {
    emoji: '🛒', title: 'Morning Market Trip',
    contextDescription: 'Help plan the morning trip to the local sabzi mandi — everything must be done before it gets too hot!',
    requiredStepIds: ['wake', 'freshen', 'breakfast', 'list', 'bag', 'money', 'shoes', 'market'],
  },
];

// ── Decision bank ───────────────────────────────────────────────────────────

interface DecisionTemplate {
  prompt: string;
  optionA: string;
  optionB: string;
  correctOption: 'A' | 'B';
}

const DECISION_BANK: DecisionTemplate[] = [
  { prompt: 'The hospital is 3 km away. How will Amma travel?', optionA: '🛺 Auto-rickshaw (faster)', optionB: '🚶 Walk slowly (30 min)', correctOption: 'A' },
  { prompt: "There's not enough sambar for everyone. What to do?", optionA: '🍲 Make more sambar quickly', optionB: '📞 Order from nearby restaurant', correctOption: 'A' },
  { prompt: 'The vegetable prices are high today. What to do?', optionA: '🥬 Buy less but fresh vegetables', optionB: '🏠 Come back tomorrow', correctOption: 'A' },
  { prompt: 'It starts raining on the way. What to do?', optionA: '☂️ Take an umbrella and continue', optionB: '🏠 Go back home', correctOption: 'A' },
  { prompt: 'You forgot the shopping list at home. What to do?', optionA: '📝 Remember what you can and buy', optionB: '🏠 Go back home to get it', correctOption: 'A' },
  { prompt: 'The yoga mat is wet from morning dew. What to do?', optionA: '🧹 Wipe it with a cloth and use it', optionB: '🏠 Skip yoga today', correctOption: 'A' },
];

// ── Disruption bank ─────────────────────────────────────────────────────────

interface DisruptionTemplate {
  notification: string;
  prompt: string;
}

const DISRUPTION_BANK: DisruptionTemplate[] = [
  { notification: '⚠️ The main market is closing early today due to a local event!', prompt: 'You need to leave sooner — hurry up!' },
  { notification: '⚠️ The doctor moved the appointment 30 minutes earlier!', prompt: 'Skip breakfast and leave now!' },
  { notification: '⚠️ It looks like it might rain heavily soon!', prompt: 'Better take an umbrella and leave quickly!' },
  { notification: '⚠️ The grandchildren are arriving an hour early!', prompt: 'Hurry the preparations!' },
];

// ── Shuffle helper ───────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Generated content types ─────────────────────────────────────────────────

export interface GeneratedStep {
  id: string;
  emoji: string;
  label: string;
  subLabel: string;
  correctPosition: number;
}

export interface GeneratedDecisionBranch {
  prompt: string;
  optionA: string;
  optionB: string;
  correctOption: 'A' | 'B';
}

export interface GeneratedDisruptionEvent {
  notification: string;
  prompt: string;
}

export interface GeneratedRoutineContent {
  emoji: string;
  title: string;
  contextDescription: string;
  steps: GeneratedStep[];
  decisionBranch?: GeneratedDecisionBranch;
  disruptionEvent?: GeneratedDisruptionEvent;
}

// ── Main generator ──────────────────────────────────────────────────────────

export function generateMorningRoutineContent(params: MorningRoutineDynamicParams): GeneratedRoutineContent {
  // Find templates that fit the card count
  const fittingTemplates = SCENARIO_TEMPLATES.filter(
    (t) => t.requiredStepIds.length <= params.cardCount
  );
  const template = fittingTemplates.length > 0
    ? fittingTemplates[Math.floor(Math.random() * fittingTemplates.length)]
    : SCENARIO_TEMPLATES[0];

  // Build steps from the template's required step IDs
  const stepDefs = template.requiredStepIds
    .map((id) => STEP_BANK.find((s) => s.id === id))
    .filter((s): s is StepDef => !!s);

  // If we need more cards than the template provides, pad with compatible steps
  if (stepDefs.length < params.cardCount) {
    const usedIds = new Set(stepDefs.map((s) => s.id));
    const extras = shuffle(STEP_BANK.filter((s) => !usedIds.has(s.id)));
    // Insert 'prep' category steps before the last step (activity)
    const lastStep = stepDefs.pop()!;
    for (const extra of extras) {
      if (stepDefs.length >= params.cardCount - 1) break;
      if (extra.category === 'prep' || extra.category === 'transition') {
        stepDefs.push(extra);
      }
    }
    stepDefs.push(lastStep);
  }

  // Trim to exact card count if needed
  const finalSteps = stepDefs.slice(0, params.cardCount);

  // Assign correct positions
  const steps: GeneratedStep[] = finalSteps.map((s, i) => ({
    id: s.id,
    emoji: s.emoji,
    label: s.label,
    subLabel: s.subLabel,
    correctPosition: i + 1,
  }));

  // Decision branch
  let decisionBranch: GeneratedDecisionBranch | undefined;
  if (params.decisionBranchEnabled) {
    const decision = DECISION_BANK[Math.floor(Math.random() * DECISION_BANK.length)];
    decisionBranch = { ...decision };
  }

  // Disruption event
  let disruptionEvent: GeneratedDisruptionEvent | undefined;
  if (params.disruptionEventEnabled) {
    const disruption = DISRUPTION_BANK[Math.floor(Math.random() * DISRUPTION_BANK.length)];
    disruptionEvent = { ...disruption };
  }

  return {
    emoji: template.emoji,
    title: template.title,
    contextDescription: template.contextDescription,
    steps,
    decisionBranch,
    disruptionEvent,
  };
}
