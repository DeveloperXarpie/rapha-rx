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
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type DifficultyOverride = 'easy' | 'medium' | 'hard' | 'auto';
export type GameCategory = 'memory' | 'attention' | 'executive';
