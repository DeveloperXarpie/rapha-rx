import { CROSS_SEGMENTS, MAIN_SEGMENTS, type Segment } from './geometry';
import { TRACK_TILE } from './sprites';

/**
 * The lattice: sixteen lane-to-station diagonals under eight verticals.
 *
 * Each segment is one div anchored at the segment's midpoint, rotated onto the segment's
 * own angle, painting the seamless one-sleeper track tile repeating along its length. The
 * tile keeps its natural aspect (background-size 100% auto), so the sleeper spacing scales
 * with the bed width and the rails never skew.
 */
function TrackSegment({ s }: { s: Segment }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: s.cx - s.bed / 2,
        top: s.cy - s.length / 2,
        width: s.bed,
        height: s.length,
        transform: `rotate(${s.angleDeg.toFixed(3)}deg)`,
        backgroundImage: `url(${TRACK_TILE.src})`,
        backgroundRepeat: 'repeat-y',
        backgroundSize: '100% auto',
      }}
    />
  );
}

export default function TrackLayer() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {CROSS_SEGMENTS.map((s) => <TrackSegment key={s.key} s={s} />)}
      {MAIN_SEGMENTS.map((s) => <TrackSegment key={s.key} s={s} />)}
    </div>
  );
}
