import type { SkillId } from '../gameSkills';

/**
 * Each scored skill's colour on the scorecard bars and summary rings. Mock 3 fixes the
 * four memory skills; the others reuse that palette so a category's two games never
 * share a colour.
 */
const GREEN = '#9BDB6B';
const YELLOW = '#F2D27A';
const CYAN = '#57D9F2';
const PINK = '#F28BA8';

const SKILL_COLOURS: Partial<Record<SkillId, string>> = {
  recall: GREEN, retention: YELLOW, sequences: CYAN, association: PINK,
  selectiveAttention: GREEN, responseTime: YELLOW,
  sequencing: GREEN, decisionMaking: YELLOW, planning: CYAN, problemSolving: PINK,
};

export function skillColour(skill: SkillId): string {
  return SKILL_COLOURS[skill] ?? CYAN;
}
