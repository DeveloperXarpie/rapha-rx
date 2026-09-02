/**
 * Who prescribed this study to the resident.
 *
 * "Prescriber" is a UI label over the existing `UserProfile.careHomeId` field.
 * The storage name, the Dexie index, the Amplitude user property and the
 * Firestore document shape are all unchanged - renaming them would be a
 * migration for no benefit.
 */
export interface Prescriber {
  id: string;
  name: string;
  site?: string;
}

/**
 * PLACEHOLDER DATA. The real prescriber names have not been supplied - the
 * design handoff lists this as an open item. Swapping this array is the whole
 * change; nothing else reads a prescriber name literal.
 */
export const PRESCRIBERS: Prescriber[] = [
  { id: 'dr-dominic-benjamin', name: 'Dr. Dominic Benjamin', site: 'BBH' },
  { id: 'dr-anita-rao',        name: 'Dr. Anita Rao',        site: 'Bangalore' },
  { id: 'dr-suresh-kumar',     name: 'Dr. Suresh Kumar',     site: 'Bangalore' },
];

/**
 * Ids from before this module existed. Three separate lists were in play:
 * CareHomeSelector's LOCATIONS, and a different CARE_HOME_NAMES map duplicated
 * in SettingsScreen and ProfileSelector. Every profile already on a device
 * carries an id from one of them, so both families stay resolvable - dropping
 * either would blank the prescriber row for real residents.
 */
const LEGACY_NAMES: Record<string, string> = {
  // CareHomeSelector's LOCATIONS - the ids real profiles actually carry.
  'silver-meadows':       'Silver Meadows Senior Living',
  'golden-years':         'Golden Years Care Home',
  'serenity-haven':       'Serenity Haven Senior Care',
  'sunrise-elder':        'Sunrise Elder Care Residence',
  'graceful-living':      'Graceful Living Senior Home',
  'evergreen-senior':     'Evergreen Senior Care Centre',
  'my-residence':         'My Residence in Bangalore',
  // The CARE_HOME_NAMES map from SettingsScreen and ProfileSelector.
  'asha-indiranagar':     'Asha Care Home, Indiranagar',
  'vatsalya-koramangala': 'Vatsalya Senior Living, Koramangala',
  'prayag-jayanagar':     'Prayag Care Centre, Jayanagar',
};

/**
 * A display name for a stored id. Falls back to the id rather than an empty
 * string: a row reading "silver-meadows" is odd, but a blank one looks broken
 * and tells support nothing.
 */
export function prescriberName(id: string): string {
  const offered = PRESCRIBERS.find((p) => p.id === id);
  if (offered) return offered.name;
  return LEGACY_NAMES[id] ?? id;
}
