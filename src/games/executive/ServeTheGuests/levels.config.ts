import type { LevelConfig } from '../../types';

/**
 * Vestigial, kept for parity with the other games: dynamic difficulty drives the real
 * params via `getServeGuestsParams`. These entries only document the ladder.
 */
export const SERVE_THE_GUESTS_LEVELS: LevelConfig[] = [
  { id: 'level_1', labelKey: 'level.1', params: { maxItemsPerGuest: 1 } },
  { id: 'level_2', labelKey: 'level.2', params: { maxItemsPerGuest: 1 } },
  { id: 'level_3', labelKey: 'level.3', params: { maxItemsPerGuest: 2 } },
  { id: 'level_4', labelKey: 'level.4', params: { maxItemsPerGuest: 2 } },
  { id: 'level_5', labelKey: 'level.5', params: { maxItemsPerGuest: 3 } },
];

export default SERVE_THE_GUESTS_LEVELS;
