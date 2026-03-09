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
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      stepCount: 4,
      ingredientDecisionEnabled: false,
      midRecipeModificationEnabled: false,
      optionCount: 2,
      recipe: 'idli_sambar',
    } satisfies RecipeBuilderParams,
  },
  {
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      stepCount: 5,
      ingredientDecisionEnabled: true,
      midRecipeModificationEnabled: false,
      optionCount: 2,
      recipe: 'rava_dosa',
    } satisfies RecipeBuilderParams,
  },
  {
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      stepCount: 7,
      ingredientDecisionEnabled: true,
      midRecipeModificationEnabled: true,
      optionCount: 3,
      recipe: 'rasam',
    } satisfies RecipeBuilderParams,
  },
];
