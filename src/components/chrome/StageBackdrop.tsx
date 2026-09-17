/**
 * Fills the space a fixed-aspect surface cannot cover.
 *
 * Every board in this app is a design canvas of a fixed shape, drawn at around 0.63,
 * and it is letterboxed into whatever the device is. There is no aspect that avoids
 * that: an iPhone 16 Plus is 0.46 and leaves 27% of the screen over, top and bottom; a
 * 4:3 tablet is 0.75 and leaves it down the sides instead. Widening the art to suit one
 * only moves the bars to the other, which is exactly what happened when the Sep-9
 * review's re-cut splashes fixed a tablet's side bars and doubled a phone's.
 *
 * So nothing here tries to make the art fit. The leftover is filled with the same art,
 * cover-cropped to the whole stage and blurred past legibility. That works at every
 * aspect in both directions, it is the right colours by construction because it is the
 * same image, and it costs no second asset and no second decode - the browser has this
 * src already for the board itself.
 *
 * The scale is not decoration: a blur samples transparent pixels in from the edges of
 * its own box, and without it the fill wears a pale border.
 *
 * Callers give the stage `position: relative` and put the board above this at
 * `zIndex: 1`. An absolutely positioned element paints after non-positioned in-flow
 * content, so a board that is merely a flex item would otherwise end up underneath.
 */
export default function StageBackdrop({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'blur(34px) saturate(1.15) brightness(0.92)',
        transform: 'scale(1.15)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
