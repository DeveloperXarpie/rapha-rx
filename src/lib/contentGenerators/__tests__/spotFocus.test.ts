import { describe, it, expect } from 'vitest';
import { generateSpotFocusContent } from '../spotFocus';
import { BY_ID } from '../../../games/attention/SpotFocus/items';
import { getSpotFocusParams, type SpotFocusDynamicParams } from '../../dynamicDifficulty';
import { LADDER as SPOT_FOCUS_LADDER } from '../../ladders/spotFocus';

const GRIDS = [
  { gridRows: 3, gridCols: 3 },
  { gridRows: 3, gridCols: 4 },
];

/** A board of one tier, the way the 0-1 score asks for it. */
const oneTier = (differenceCount: number, tier: 'bold' | 'medium' | 'subtle') => ({
  differenceCount,
  mediumCount: tier === 'medium' ? differenceCount : 0,
  subtleCount: tier === 'subtle' ? differenceCount : 0,
});

/** Every shape the difficulty engine can actually ask for: the 0-1 score's and every ladder level. */
function allParams(): SpotFocusDynamicParams[] {
  const out: SpotFocusDynamicParams[] = [];
  for (const grid of GRIDS)
    for (const tier of ['bold', 'medium', 'subtle'] as const)
      for (let differenceCount = 2; differenceCount <= 7; differenceCount++)
        out.push({ ...grid, ...oneTier(differenceCount, tier) });
  return [...out, ...SPOT_FOCUS_LADDER];
}

/** Each difference's tier, read back off the scene. */
function tiersOf(scene: ReturnType<typeof generateSpotFocusContent>) {
  const tiers = { bold: 0, medium: 0, subtle: 0 };
  scene.modifiedRows.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell.isDifference) return;
    const before = BY_ID.get(scene.originalRows[r][c].id)!;
    if (before.twin === cell.id) tiers.subtle++;
    else if (BY_ID.get(cell.id)!.family === before.family) tiers.medium++;
    else tiers.bold++;
  }));
  return tiers;
}

describe('generateSpotFocusContent', () => {
  it('fills the grid the params asked for', () => {
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      expect(scene.originalRows).toHaveLength(params.gridRows);
      expect(scene.modifiedRows).toHaveLength(params.gridRows);
      for (const row of [...scene.originalRows, ...scene.modifiedRows]) {
        expect(row).toHaveLength(params.gridCols);
      }
    }
  });

  it('always produces exactly the number of differences asked for', () => {
    // The count is what the resident is told to find, so it is the promise that holds.
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      const marked = scene.modifiedRows.flat().filter((c) => c.isDifference);
      expect(marked, JSON.stringify(params)).toHaveLength(params.differenceCount);
      expect(scene.differenceCount).toBe(params.differenceCount);
    }
  });

  it('never falls back to a bolder tier for anything the engine can request', () => {
    // A non-zero count here means the catalogue is too thin, not that the code is wrong.
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      expect(scene.fallbacksUsed, JSON.stringify(params)).toBe(0);
    }
  });

  it('marks a cell as a difference exactly when the two grids disagree', () => {
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      scene.modifiedRows.forEach((row, r) =>
        row.forEach((cell, c) => {
          const changed = cell.id !== scene.originalRows[r][c].id;
          expect(Boolean(cell.isDifference)).toBe(changed);
        }),
      );
    }
  });

  it('never repeats a family within a grid', () => {
    // Two teapots on one board is a difference the player can see and the game will not
    // credit, which is worse than an easier round.
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      for (const rows of [scene.originalRows, scene.modifiedRows]) {
        const families = rows.flat().map((c) => BY_ID.get(c.id)!.family);
        expect(new Set(families).size, JSON.stringify(params)).toBe(families.length);
      }
    }
  });

  it('swaps for the twin when subtle is asked for', () => {
    const scene = generateSpotFocusContent({
      gridRows: 3, gridCols: 4, ...oneTier(4, 'subtle'),
    });
    scene.modifiedRows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.isDifference) return;
        expect(BY_ID.get(scene.originalRows[r][c].id)!.twin).toBe(cell.id);
      }),
    );
  });

  it('swaps within the family, but not for the twin, when medium is asked for', () => {
    const scene = generateSpotFocusContent({
      gridRows: 3, gridCols: 4, ...oneTier(4, 'medium'),
    });
    scene.modifiedRows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.isDifference) return;
        const before = BY_ID.get(scene.originalRows[r][c].id)!;
        expect(BY_ID.get(cell.id)!.family).toBe(before.family);
        expect(cell.id).not.toBe(before.twin);
      }),
    );
  });

  it('swaps across families when bold is asked for', () => {
    const scene = generateSpotFocusContent({
      gridRows: 3, gridCols: 4, ...oneTier(4, 'bold'),
    });
    scene.modifiedRows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.isDifference) return;
        const before = BY_ID.get(scene.originalRows[r][c].id)!;
        expect(BY_ID.get(cell.id)!.family).not.toBe(before.family);
      }),
    );
  });

  it('mixes tiers on one board as asked (plan 3b)', () => {
    for (let round = 0; round < 40; round++) {
      const scene = generateSpotFocusContent({ gridRows: 5, gridCols: 3, differenceCount: 5, mediumCount: 2, subtleCount: 2 });
      expect(tiersOf(scene)).toEqual({ bold: 1, medium: 2, subtle: 2 });
    }
  });

  it('builds every ladder level at its exact tiers, round after round (plan 3b)', () => {
    SPOT_FOCUS_LADDER.forEach((params, i) => {
      for (let round = 0; round < 30; round++) {
        const scene = generateSpotFocusContent(params);
        expect(scene.fallbacksUsed, `level ${i + 1}`).toBe(0);
        expect(tiersOf(scene), `level ${i + 1}`).toEqual({
          bold: params.differenceCount - params.mediumCount - params.subtleCount,
          medium: params.mediumCount,
          subtle: params.subtleCount,
        });
      }
    });
  });

  it('carries a label key through to every cell', () => {
    const scene = generateSpotFocusContent(getSpotFocusParams(0.5));
    for (const cell of [...scene.originalRows.flat(), ...scene.modifiedRows.flat()]) {
      expect(cell.labelKey).toBe(`spot-focus.item.${cell.id}`);
    }
  });

  it('holds up over many rounds at the settings the engine produces', () => {
    // Randomised generation can pass once by luck. This is the run that would catch a
    // pool that only just stretches to the hardest round.
    for (let i = 0; i <= 10; i++) {
      const params = getSpotFocusParams(i / 10);
      for (let round = 0; round < 40; round++) {
        const scene = generateSpotFocusContent(params);
        expect(scene.fallbacksUsed).toBe(0);
        expect(scene.modifiedRows.flat().filter((c) => c.isDifference))
          .toHaveLength(params.differenceCount);
      }
    }
  });
});
