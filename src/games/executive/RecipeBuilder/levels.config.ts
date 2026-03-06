import type { LevelConfig } from '../../types';

type SouthIndianRecipe =
  | 'idli_sambar' | 'upma' | 'poha' | 'pongal'
  | 'rava_dosa' | 'chapati_sabzi'
  | 'rasam' | 'avial' | 'rava_kesari';

interface RecipeBuilderParams {
  stepCount: number;
  ingredientDecisionEnabled: boolean;
  midRecipeModificationEnabled: boolean;
  optionCount: number;
  recipe: SouthIndianRecipe;
}

export const levels: LevelConfig[] = [
  {
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      stepCount: 4,
      ingredientDecisionEnabled: false,
      midRecipeModificationEnabled: false,
      optionCount: 2,
      recipe: 'idli_sambar',
    } satisfies RecipeBuilderParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      stepCount: 5,
      ingredientDecisionEnabled: true,
      midRecipeModificationEnabled: false,
      optionCount: 2,
      recipe: 'rava_dosa',
    } satisfies RecipeBuilderParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      stepCount: 7,
      ingredientDecisionEnabled: true,
      midRecipeModificationEnabled: true,
      optionCount: 3,
      recipe: 'rasam',
    } satisfies RecipeBuilderParams,
  },
];
