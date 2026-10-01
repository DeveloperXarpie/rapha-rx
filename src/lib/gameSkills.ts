import type { GameCategory } from '../styles/tokens';

/**
 * What each rotation game trains, for the game intro screen.
 *
 * From the Rapha Cognitive Performance Measurement Framework v1.0 and its
 * "Game Performance Measurement Format" (docs/scoring and end). Each game has one
 * primary skill and a few secondary ones - never every skill in its domain. The
 * primary is listed first on the intro, and is the skill the score card's main
 * word will come from once scoring exists.
 *
 * Copy lives behind i18n keys: `skill.<id>.name` and `skill.<id>.line`.
 */
export type SkillId =
  // Memory
  | 'recall' | 'recognition' | 'retention' | 'sequences' | 'patterns' | 'association'
  // Attention & focus
  | 'responseTime' | 'accuracy' | 'concentration' | 'sustainedAttention'
  | 'selectiveAttention' | 'taskSwitching'
  // Executive function
  | 'planning' | 'problemSolving' | 'decisionMaking' | 'reasoning'
  | 'cognitiveFlexibility' | 'sequencing';

export interface Skill {
  category: GameCategory;
  nameKey: string;
  lineKey: string;
}

function skill(id: SkillId, category: GameCategory): Skill {
  return { category, nameKey: `skill.${id}.name`, lineKey: `skill.${id}.line` };
}

export const SKILLS: Record<SkillId, Skill> = {
  recall:               skill('recall',               'memory'),
  recognition:          skill('recognition',          'memory'),
  retention:            skill('retention',            'memory'),
  sequences:            skill('sequences',            'memory'),
  patterns:             skill('patterns',             'memory'),
  association:          skill('association',          'memory'),
  responseTime:         skill('responseTime',         'attention'),
  accuracy:             skill('accuracy',             'attention'),
  concentration:        skill('concentration',        'attention'),
  sustainedAttention:   skill('sustainedAttention',   'attention'),
  selectiveAttention:   skill('selectiveAttention',   'attention'),
  taskSwitching:        skill('taskSwitching',        'attention'),
  planning:             skill('planning',             'executive'),
  problemSolving:       skill('problemSolving',       'executive'),
  decisionMaking:       skill('decisionMaking',       'executive'),
  reasoning:            skill('reasoning',            'executive'),
  cognitiveFlexibility: skill('cognitiveFlexibility', 'executive'),
  sequencing:           skill('sequencing',           'executive'),
};

/** The highlighted domain name in "This game improves your ___". */
export const DOMAIN_KEY: Record<GameCategory, string> = {
  memory:    'gameIntro.domain.memory',
  attention: 'gameIntro.domain.attention',
  executive: 'gameIntro.domain.executive',
};

export interface GameSkills {
  category: GameCategory;
  primary: SkillId;
  secondary: SkillId[];
}

/** Keyed by gameId. Only the six marquee games - the ones a session plays. */
export const GAME_SKILLS: Record<string, GameSkills> = {
  'market-memory': { category: 'memory',    primary: 'recall',             secondary: ['recognition', 'retention', 'association'] },
  'train-yard':    { category: 'memory',    primary: 'sequences',          secondary: ['recall', 'patterns'] },
  'spot-focus':    { category: 'attention', primary: 'selectiveAttention', secondary: ['responseTime'] },
  'garden-keeper': { category: 'attention', primary: 'selectiveAttention', secondary: ['accuracy'] },
  'serve-guests':  { category: 'executive', primary: 'planning',           secondary: ['decisionMaking', 'sequencing'] },
  'clear-the-way': { category: 'executive', primary: 'problemSolving',     secondary: ['planning', 'cognitiveFlexibility'] },
};

/** Primary first, then the secondaries. Empty for a game outside the rotation. */
export function skillsFor(gameId: string): SkillId[] {
  const g = GAME_SKILLS[gameId];
  return g ? [g.primary, ...g.secondary] : [];
}
