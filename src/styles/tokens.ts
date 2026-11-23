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
  /** Skill names on the game intro's blue panel. */
  skill:         '#FFF33B',
  /**
   * The category intro's full-width practice band. One blue for all three
   * categories, not the category colour the handoff's table asks for - see the
   * note on CATEGORY_BRAND.
   */
  introBand:     '#0E2AA8',
} as const;

/*
 * The scorecard and 10-minute summary, sampled off the amends mocks
 * (docs/ Rapha_amends - nov23-2026.pdf, pages 3-5).
 */
export const SCORE_UI = {
  /** The scorecard's panel over the game art. */
  panel:      '#233C7E',
  /** A skill card on the scorecard. */
  card:       '#2C498F',
  /** The "3/5" disc at the start of a skill bar. */
  disc:       '#1E3577',
  pillOff:    '#4E66A2',
  /** "MEMORY" under the tile, and the summary's subtitle. */
  label:      '#A9B9E6',
  /** The accolade badge: yellow word, dark ink, yellow then rust rims. */
  accolade:     '#FFE14A',
  accoladeInk:  '#2B1239',
  accoladeRim:  '#FAD241',
  accoladeEdge: '#A45228',
  /** The 10-minute summary's screen, ring cards and ring track. */
  summaryBg:   '#1A3373',
  ringCard:    '#223F83',
  ringTrack:   '#445D9B',
  headline:    '#F0FDA5',
  up:          '#77C368',
  down:        '#EB615A',
  /** The summary's "HISTORY METRICS" expander (amends p4): lavender face, darker lip. */
  historyFace: '#93AEF0',
  historyEdge: '#546FB4',
  historyInk:  '#23397E',
} as const;

/* The popup and its button, sampled off page 6 of the same amends. */
export const POPUP_UI = {
  rim:    '#D0D8F8',
  border: '#05218A',
  faceTop:    '#D5DEFB',
  faceBottom: '#B4BDFF',
  text:   '#032C90',
} as const;

export interface CategoryBrand {
  /** Title word, progress fill, icon accent. */
  accent: string;
  /** Body copy on the pastel intro background. */
  label: string;
  /** The intro screen's vertical pastel wash. */
  gradient: string;
  icon: string;
}

/*
 * Keyed by the store's category ids. The handoff calls `executive` "Planning";
 * that name lives only in the i18n bundle, never as a key.
 *
 * No `band` here on purpose. The handoff's table gives the practice band the
 * category colour, but all three intros now carry the same blue (BRAND.introBand),
 * so a per-category field would be three copies of one value.
 */
export const CATEGORY_BRAND: Record<GameCategory, CategoryBrand> = {
  memory: {
    accent:   '#7E4A9D',
    label:    '#46345F',
    gradient: 'linear-gradient(180deg, #F8E7D6 0%, #EBDCF0 26%, #D5C2EC 52%, #BCA7E6 72%, #A895DE 100%)',
    icon:     '/category/ic-memory.png',
  },
  attention: {
    accent:   '#1668C4',
    label:    '#1B3A5E',
    gradient: 'linear-gradient(180deg, #FAF0DE 0%, #E4EEF9 26%, #C3DBF5 52%, #A2C6EF 72%, #8AB6EA 100%)',
    icon:     '/category/ic-attention.png',
  },
  executive: {
    accent:   '#2E7D4F',
    label:    '#1E4A32',
    gradient: 'linear-gradient(180deg, #FAF2DC 0%, #E8F3DE 26%, #CBE9CB 52%, #A9DCBB 72%, #92D2B2 100%)',
    icon:     '/category/ic-planning.png',
  },
};
