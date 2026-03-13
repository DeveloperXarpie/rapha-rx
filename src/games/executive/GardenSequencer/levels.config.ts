import type { LevelConfig } from '../../types';

interface GardenSequencerParams {
  activityIds: string[];
  anchorFirstStep: boolean; // pre-fill slot 1 with correct first item (Easy only)
}

export const levels: LevelConfig[] = [
  {
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      activityIds: ['plant_seed', 'water_garden'],
      anchorFirstStep: true,
    } satisfies GardenSequencerParams,
  },
  {
    id: 'level_2',
    labelKey: 'level.2',
    params: {
      activityIds: ['water_garden', 'weed_bed'],
      anchorFirstStep: true,
    } satisfies GardenSequencerParams,
  },
  {
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      activityIds: ['harvest_veg', 'collect_flowers', 'make_bouquet'],
      anchorFirstStep: false,
    } satisfies GardenSequencerParams,
  },
  {
    id: 'level_4',
    labelKey: 'level.4',
    params: {
      activityIds: ['make_bouquet', 'compost_waste'],
      anchorFirstStep: false,
    } satisfies GardenSequencerParams,
  },
  {
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      activityIds: ['repot_plant', 'market_stall', 'save_seeds'],
      anchorFirstStep: false,
    } satisfies GardenSequencerParams,
  },
];
