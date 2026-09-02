import { describe, it, expect } from 'vitest';
import { PRESCRIBERS, prescriberName } from '../prescribers';

/*
 * Three lists existed before this module: CareHomeSelector's LOCATIONS
 * (silver-meadows and friends), and a different CARE_HOME_NAMES map duplicated
 * in SettingsScreen and ProfileSelector (asha-indiranagar and friends). Real
 * profiles carry ids from the first family. Both must keep resolving or a
 * resident's prescriber row goes blank.
 */
const LEGACY_LOCATION_IDS = [
  'silver-meadows', 'golden-years', 'serenity-haven', 'sunrise-elder',
  'graceful-living', 'evergreen-senior', 'my-residence',
];
const LEGACY_CARE_HOME_IDS = [
  'asha-indiranagar', 'vatsalya-koramangala', 'prayag-jayanagar',
];

describe('prescribers', () => {
  it('offers at least one prescriber to choose from', () => {
    expect(PRESCRIBERS.length).toBeGreaterThan(0);
  });

  it('gives every offered prescriber a unique id and a non-empty name', () => {
    const ids = PRESCRIBERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PRESCRIBERS) expect(p.name.trim()).not.toBe('');
  });

  it('resolves every id it offers', () => {
    for (const p of PRESCRIBERS) expect(prescriberName(p.id)).toBe(p.name);
  });

  it('still resolves every legacy id, so existing profiles keep a label', () => {
    for (const id of [...LEGACY_LOCATION_IDS, ...LEGACY_CARE_HOME_IDS]) {
      expect(prescriberName(id), id).not.toBe('');
      expect(prescriberName(id), id).not.toBe(id);
    }
  });

  it('falls back to the id rather than an empty label for an unknown id', () => {
    expect(prescriberName('not-a-real-id')).toBe('not-a-real-id');
  });

  it('never returns an empty string', () => {
    for (const id of ['', 'x', ...LEGACY_LOCATION_IDS]) {
      expect(typeof prescriberName(id)).toBe('string');
    }
  });
});
