export const COLORS = {
  primaryBlue:   '#2A66B8',
  emeraldGreen:  '#3BB78F',   // success states
  alertRed:      '#E74C3C',   // errors (use ONLY as a last resort, never with buzz/flash)
  darkGrey:      '#333333',   // body text
  accentPurple:  '#9C5FA8',   // highlights, CTAs
  accentAmber:   '#C9BA2E',   // warnings
  appBg:         '#F4F5F7',
  cardBg:        '#FFFFFF',
  hoverState:    '#F0F3FF',
  bodyText:      '#222222',
  captionText:   '#757575',
} as const;

export const TYPOGRAPHY = {
  h1:      { size: '36px', weight: 700, lineHeight: '44px' },
  h2:      { size: '28px', weight: 600, lineHeight: '36px' },
  h3:      { size: '22px', weight: 500, lineHeight: '30px' },
  body:    { size: '16px', weight: 400, lineHeight: '24px' },
  button:  { size: '16px', weight: 600, lineHeight: '24px' },
  caption: { size: '14px', weight: 500, lineHeight: '20px' },
  small:   { size: '12px', weight: 400, lineHeight: '16px' },
} as const;

export const SPACING = {
  touchTargetMin:    '80px',
  gameCardMin:       '80px',
  gameCardLarge:    '120px',
  sequenceButton:   '120px',
  cardPad:           '24px',
  sectionGap:        '32px',
} as const;

export const FONT_FAMILY = "'Inter', 'Noto Sans Devanagari', 'Noto Sans Kannada', sans-serif";

export type Language = 'en' | 'hi' | 'kn';
export type TextSize = 'normal' | 'large' | 'xlarge';
export type DifficultyLevel = 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5';
export type GameCategory = 'memory' | 'attention' | 'executive';

/* ─── App flow redesign (2026-09) ──────────────────────────────────────────────
 * The chrome palette. Deliberately separate from COLORS above, which the game
 * boards use and which this redesign does not touch. Two palettes is the honest
 * shape here: chrome and board are two systems.
 * Source of truth: the design handoff README, "Design tokens".
 */
export const BRAND = {
  /** Radial screen background stops, outermost first. */
  screen:       ['#45CFEE', '#2A86DE', '#1B5AD0', '#0E2AA8'],
  navy:         '#10237E',
  /** Home / summary row surfaces. */
  surface:       'rgba(9,26,140,0.5)',
  surfaceStrong: 'rgba(9,26,140,0.55)',
  card:          'rgba(255,255,255,0.94)',
  wave:          'rgba(6,18,140,0.4)',
  /** Secondary text on blue. */
  cyan:          '#6FE8FF',
  /** Row headings on blue. */
  cyanBright:    '#57E7FF',
  /** Muted labels, e.g. the "another day" strip. */
  muted:         '#8FB8E8',
  /** Level and success figures. */
  lime:          '#C6F87A',
} as const;

export interface CategoryBrand {
  /** Title word, progress fill, icon accent. */
  accent: string;
  /** The full-width practice band behind white text. */
  band: string;
  /** Body copy on the pastel intro background. */
  label: string;
  /** The intro screen's vertical pastel wash. */
  gradient: string;
  icon: string;
}

/*
 * Keyed by the store's category ids. The handoff calls `executive` "Planning";
 * that name lives only in the i18n bundle, never as a key.
 */
export const CATEGORY_BRAND: Record<GameCategory, CategoryBrand> = {
  memory: {
    accent:   '#7E4A9D',
    band:     '#7E4A9D',
    label:    '#46345F',
    gradient: 'linear-gradient(180deg, #F8E7D6 0%, #EBDCF0 26%, #D5C2EC 52%, #BCA7E6 72%, #A895DE 100%)',
    icon:     '/category/ic-memory.png',
  },
  attention: {
    accent:   '#1668C4',
    band:     '#1C6BB0',
    label:    '#1B3A5E',
    gradient: 'linear-gradient(180deg, #FAF0DE 0%, #E4EEF9 26%, #C3DBF5 52%, #A2C6EF 72%, #8AB6EA 100%)',
    icon:     '/category/ic-attention.png',
  },
  executive: {
    accent:   '#2E7D4F',
    band:     '#2E7D4F',
    label:    '#1E4A32',
    gradient: 'linear-gradient(180deg, #FAF2DC 0%, #E8F3DE 26%, #CBE9CB 52%, #A9DCBB 72%, #92D2B2 100%)',
    icon:     '/category/ic-planning.png',
  },
};
