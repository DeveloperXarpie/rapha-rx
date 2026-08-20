/**
 * Screen colours for Spot Focus, sampled from the reference mockup with a modal-colour
 * probe rather than eyeballed. The item art carries its own colour, so nothing here
 * describes an object.
 *
 * These exist because the delivered UI kit has English text baked into the signboard and
 * both ribbons, and the app ships in English, Hindi and Kannada. The shapes are flat
 * rounded rectangles, so CSS draws them crisply at any size and in any language, where a
 * sprite would blur when scaled and be wrong in two of the three.
 */
export const COLOURS = {
  skyTop: '#149dfd',
  skyMid: '#5ec1fb',

  panelFrame: '#3c52a4',
  cardFill: '#ffffff',
  cardEdge: 'rgba(60,82,164,.18)',

  foundFill: '#f08c89',
  foundEdge: '#e05a56',

  pillFill: '#bee6fe',
  pillText: '#0e4795',

  ribbonBlue: '#034eb4',
  ribbonRed: '#b20604',
  ribbonText: '#ffffff',

  signWood: '#fbc161',
  signGrain: '#f6b04a',
  signFrame: '#f2a242',
  signText: '#43260c',
} as const;
