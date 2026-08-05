/**
 * Train and station colours, and the station-name pool.
 *
 * The art sheet ships only the four distinct hues, so the handoff's "similar colours"
 * difficulty tier is produced by filtering the same sprites toward four close warm hues
 * rather than by shipping a second art set. A train and its station always take the same
 * filter, so the pairing a resident learns is the pairing they see.
 */

export interface PaletteEntry {
  /** i18n key suffix for the colour name used in the "Where does the ... train go?" caption. */
  id: string;
  /** Body colour, used for the selection ring tint and the lane marker. */
  hex: string;
  dark: string;
  /** CSS filter applied to the sprite in this tier; empty for the standard set. */
  filter: string;
}

export const STANDARD_PALETTE: PaletteEntry[] = [
  { id: 'red',    hex: '#D7443C', dark: '#A32C26', filter: '' },
  { id: 'blue',   hex: '#3D7CC9', dark: '#2A5A98', filter: '' },
  { id: 'green',  hex: '#5AA83F', dark: '#3F7E2B', filter: '' },
  { id: 'yellow', hex: '#EDBB2A', dark: '#BC8F14', filter: '' },
];

export const SIMILAR_PALETTE: PaletteEntry[] = [
  { id: 'brick', hex: '#C0533C', dark: '#903827', filter: 'saturate(.78) brightness(.92) hue-rotate(-6deg)' },
  { id: 'rust',  hex: '#D2782E', dark: '#A0561C', filter: 'hue-rotate(170deg) saturate(.95) brightness(1.02)' },
  { id: 'ochre', hex: '#DFA62C', dark: '#AE7C17', filter: 'hue-rotate(-38deg) saturate(.62) brightness(1.06)' },
  { id: 'olive', hex: '#9A9436', dark: '#726D22', filter: 'saturate(.6) brightness(.9) hue-rotate(-6deg)' },
];

export function paletteFor(similarColours: boolean): PaletteEntry[] {
  return similarColours ? SIMILAR_PALETTE : STANDARD_PALETTE;
}

/**
 * Station names. Short by design: the sign plate is roughly 85 design pixels wide, and a
 * name that has to shrink below the handoff's 17px floor stops being readable across a
 * room. Four are drawn per round.
 */
export const STATION_NAME_KEYS = [
  'ty.station.1', 'ty.station.2', 'ty.station.3', 'ty.station.4',
  'ty.station.5', 'ty.station.6', 'ty.station.7', 'ty.station.8',
] as const;

export const STATION_NAME_FALLBACKS: Record<string, string> = {
  'ty.station.1': 'MYSURU',
  'ty.station.2': 'UDUPI',
  'ty.station.3': 'HASSAN',
  'ty.station.4': 'MANDYA',
  'ty.station.5': 'BIDAR',
  'ty.station.6': 'BELAGAVI',
  'ty.station.7': 'HUBBALLI',
  'ty.station.8': 'TUMAKURU',
};

/** Fisher-Yates. Callers shuffle once per round inside a lazy state initialiser. */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
