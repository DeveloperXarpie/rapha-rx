import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { appDb } from '../db';
import { findOrCreateProfile } from '../profiles';

const DR_A = 'dr-dominic-benjamin';
const DR_B = 'dr-anita-rao';

/**
 * The duplicate-name rule. It was inline in CareHomeSelector before the
 * redesign and moved into SignupScreen with it, which meant nobody could see
 * whether it had survived. These tests are the answer.
 */
describe('findOrCreateProfile', () => {
  beforeEach(async () => {
    await appDb.userProfile.clear();
  });

  it('creates a profile when the name is new', async () => {
    const { profile, created } = await findOrCreateProfile('Meera', DR_A);
    expect(created).toBe(true);
    expect(profile.firstName).toBe('Meera');
    expect(profile.careHomeId).toBe(DR_A);
    expect(await appDb.userProfile.count()).toBe(1);
  });

  it('reuses the profile when the same name signs up again under the same prescriber', async () => {
    const first = await findOrCreateProfile('Meera', DR_A);
    const second = await findOrCreateProfile('Meera', DR_A);

    expect(second.created).toBe(false);
    expect(second.profile.userId).toBe(first.profile.userId);
    expect(await appDb.userProfile.count()).toBe(1);
  });

  it('ignores case and surrounding whitespace when matching', async () => {
    const first = await findOrCreateProfile('Meera', DR_A);
    for (const variant of ['  meera  ', 'MEERA', 'MeErA']) {
      const again = await findOrCreateProfile(variant, DR_A);
      expect(again.created, variant).toBe(false);
      expect(again.profile.userId, variant).toBe(first.profile.userId);
    }
    expect(await appDb.userProfile.count()).toBe(1);
  });

  it('keeps the same name under a different prescriber as a separate person', async () => {
    const a = await findOrCreateProfile('Meera', DR_A);
    const b = await findOrCreateProfile('Meera', DR_B);

    expect(b.created).toBe(true);
    expect(b.profile.userId).not.toBe(a.profile.userId);
    expect(await appDb.userProfile.count()).toBe(2);
  });

  it('creates a second profile for a different name', async () => {
    await findOrCreateProfile('Meera', DR_A);
    const other = await findOrCreateProfile('Kamala', DR_A);
    expect(other.created).toBe(true);
    expect(await appDb.userProfile.count()).toBe(2);
  });

  it('matches on nickname as well as first name', async () => {
    const { profile } = await findOrCreateProfile('Krishnamurthy', DR_A);
    await appDb.userProfile.update(profile.userId, { nickname: 'Krishna' });

    const again = await findOrCreateProfile('Krishna', DR_A);
    expect(again.created).toBe(false);
    expect(again.profile.userId).toBe(profile.userId);
    expect(await appDb.userProfile.count()).toBe(1);
  });

  it('stamps lastSeenAt on a reused profile so it does not look dormant', async () => {
    const { profile } = await findOrCreateProfile('Meera', DR_A);
    await appDb.userProfile.update(profile.userId, { lastSeenAt: 0 });

    const again = await findOrCreateProfile('Meera', DR_A);
    expect(again.profile.lastSeenAt).toBeGreaterThan(0);
  });

  it('does not lose an existing profile progress fields when reusing it', async () => {
    const { profile } = await findOrCreateProfile('Meera', DR_A);
    await appDb.userProfile.update(profile.userId, { textSize: 'xlarge', language: 'hi' });

    const again = await findOrCreateProfile('Meera', DR_A);
    expect(again.profile.textSize).toBe('xlarge');
    expect(again.profile.language).toBe('hi');
  });
});
