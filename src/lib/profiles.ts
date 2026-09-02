import { v4 as uuidv4 } from 'uuid';
import { getProfilesByCareHome, upsertUserProfile } from './db';
import type { UserProfile } from './db';

export interface FindOrCreateResult {
  profile: UserProfile;
  /** False when an existing profile was reused rather than a new one made. */
  created: boolean;
}

/**
 * The duplicate-name rule, in one place.
 *
 * Signing up with a name that already exists under the same prescriber signs
 * the resident into that profile rather than creating a second one. Residents
 * do not remember whether they have signed up before, and two profiles for one
 * person splits their progress and their study data in half.
 *
 * Scoped to the prescriber, not global: two different people named Meera under
 * two different prescribers are two profiles, which is correct. Two residents
 * of the same name under one prescriber would collide - that was true before
 * this refactor too, and it needs a real disambiguator (a surname or a study
 * id) to fix properly rather than a change here.
 *
 * Deliberately Dexie-only. Auth, the Firestore mirror and analytics stay with
 * the caller, so this stays testable in the node environment the suite runs in.
 */
export async function findOrCreateProfile(
  name: string,
  prescriberId: string,
): Promise<FindOrCreateResult> {
  const trimmed = name.trim();
  const existing = await getProfilesByCareHome(prescriberId);

  const match = existing.find(
    (p) =>
      p.firstName.trim().toLowerCase() === trimmed.toLowerCase() ||
      (p.nickname?.trim().toLowerCase() ?? '') === trimmed.toLowerCase(),
  );

  if (match) {
    const refreshed: UserProfile = { ...match, lastSeenAt: Date.now() };
    await upsertUserProfile(refreshed);
    return { profile: refreshed, created: false };
  }

  const profile: UserProfile = {
    userId: uuidv4(),
    firstName: trimmed,
    lastName: '',
    nickname: trimmed,
    careHomeId: prescriberId,
    language: 'en',
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
    soundEnabled: true,
    textSize: 'normal',
  };
  await upsertUserProfile(profile);
  return { profile, created: true };
}
