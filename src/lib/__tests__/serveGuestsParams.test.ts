import { describe, it, expect } from 'vitest';
import { getServeGuestsParams } from '../dynamicDifficulty';

describe('getServeGuestsParams guest mix (DIFFICULTY_RULES 3.5)', () => {
  it('starts with all Middle guests', () =>
    expect(getServeGuestsParams(0.2).guestMix).toEqual({ impatient: 0, patient: 0 }));
  it('brings in guest types mid-curve', () =>
    expect(getServeGuestsParams(0.5).guestMix).toEqual({ impatient: 0.2, patient: 0.2 }));
  it('tops out at 30/40/30', () =>
    expect(getServeGuestsParams(0.9).guestMix).toEqual({ impatient: 0.3, patient: 0.3 }));
});
