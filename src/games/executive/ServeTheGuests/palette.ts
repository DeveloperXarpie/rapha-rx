/**
 * Palette, lifted from the Claude Design prototype so the port keeps the handoff's warm
 * tiffin-counter look. It has shrunk since the painted frames landed: the bubble, bar and
 * cook-fill colours went with the CSS shapes they were mixed for.
 *
 * Kept apart from `styles.tsx` so that file exports a component and nothing else, which is
 * what react-refresh needs to hot-reload it cleanly.
 */

export const COLOURS = {
  woodDark: '#3d2b16',
  woodMid: '#6b3f16',
  cream: '#fbf1de',
  creamBorder: '#dcc39a',
  gold: '#f4c23c',
  goldBorder: '#e0a218',
  wasted: '#c0392b',
  /**
   * The counter's cell plates, sampled off the portrait tray art. They are drawn rather
   * than sliced because the sheet paints 4x2 cells and the board deals six in 3x2, so
   * only the tray's outer frame comes from the sprite.
   */
  cell: '#fffaf0',
  cellRim: '#eddcb6',
  /** A burnt dish tints its own plate, so the card reads as spoiled at a glance. */
  cellBurnt: '#f7e6e0',
} as const;

/**
 * Button face per dish state: [background, shadow colour, label colour].
 *
 * This is the fallback for languages the painted buttons are not drawn in - see
 * `PAINTED_BUTTON_LANG` in `sprites.ts`. The four match the painted pills' colours, so the
 * board reads the same whichever variant a player gets.
 */
export const BUTTON_SKIN: Record<string, [string, string, string]> = {
  idle: ['linear-gradient(180deg,#7ec8f0,#3d9bd6)', '#2b7bb0', '#123a52'],
  cooking: ['linear-gradient(180deg,#ffb454,#f0830d)', '#c1650a', '#123a52'],
  ready: ['linear-gradient(180deg,#8ede63,#4caf27)', '#2f7d32', '#1e4d16'],
  burnt: ['linear-gradient(180deg,#f0554a,#d32f1f)', '#962013', '#fff4f2'],
};
