import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { Button } from '../../../components/ui/Button';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { useStageFit } from '../../../hooks/useStageFit';

import {
  boardMetrics, cornerRect, CORNERS, escapeOffset, exitRect, pieceOrigin, pieceSize, railRect, SIDES,
} from './geometry';
import {
  allowedAxes, applyMove, isSolved, keyEscapeSlide, parseLevel, travelRange,
  type Axis, type Board, type LevelDef, type Piece,
} from './model';
import { nextBestMove } from './solver';
import { pickLevel } from './levels';
import { blockSlab, cornerFlip, floorPaint, keyFacing, railPaint, SKIN } from './skin';
import { CORNER_RATIO } from './sprites';
import { ClearTheWayStyles } from './styles';
import InstructionPanel, { InstructionPanelStyles } from '../../../components/chrome/InstructionPanel';

// ─── Params ───────────────────────────────────────────────────────────────────

export interface ClearTheWayParams {
  /** 1-5, from the daily difficulty score. Chooses which shelf of the catalog to draw from. */
  tier: number;
}

const DEFAULT_PARAMS: ClearTheWayParams = { tier: 1 };

/** Finger travel before a free 1x1 commits to an axis, so one drag is always one move. */
const AXIS_LOCK_PX = 8;

/**
 * The hint appears only once the player has spent twice the optimal move count. With no
 * timer and no fail state, a stuck resident is otherwise stuck for good.
 */
const HINT_AFTER_RATIO = 2;

/** Beat between the lane opening and the fish leaving, so the player sees what freed it. */
const CLEAR_BEAT_MS = 300;

/** The auto-swim to the wall. The 150ms settle is too fast to read across an open lane. */
const SWIM_MS = 450;

/** Where along the swim each trailing bubble is dropped, as a fraction of the path. */
const BUBBLE_STOPS = [0.12, 0.28, 0.44, 0.6, 0.76, 0.92];

type Phase = 'play' | 'clearing' | 'swimming' | 'escaping' | 'done';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  generatedContent?: { level: LevelDef };
  /** Test/config override for the OS media query. */
  reducedMotion?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClearTheWay({ levelConfig, onLevelComplete, generatedContent, reducedMotion }: Props) {
  const { t } = useTranslation();

  const params: ClearTheWayParams = useMemo(
    () => ({ ...DEFAULT_PARAMS, ...(levelConfig.params as Partial<ClearTheWayParams>) }),
    [levelConfig.params],
  );

  // One puzzle per round. GameRouter remounts this component between rounds, so the
  // level is chosen once and never changes underneath the player.
  const level = useMemo(
    () => generatedContent?.level ?? pickLevel(params.tier),
    [generatedContent, params.tier],
  );
  const start = useMemo(() => parseLevel(level), [level]);

  const [board, setBoard] = useState<Board>(start);
  const [moves, setMoves] = useState(0);
  const [resets, setResets] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintPieceId, setHintPieceId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('play');
  /** Board-box geometry of the auto-swim, captured when it starts so the bubbles have a path. */
  const [trail, setTrail] = useState<null | { x: number; y: number; dx: number; dy: number }>(null);

  // Stamped in an effect rather than at render: reading the clock during render is
  // impure, and the difference between mount and first paint is not worth measuring.
  const startedAt = useRef(0);
  useEffect(() => { startedAt.current = Date.now(); }, []);

  const osReducedMotion = useReducedMotion();
  const reduced = reducedMotion ?? osReducedMotion;

  // ── Fit the board into whatever space the shell gives us ────────────────────

  // Unlike the scaled boards, this one sizes its own cells from the space available, so
  // it takes the raw box rather than a scale factor. Either way the box now comes from
  // the play box itself, not from the viewport minus a guess. See hooks/useStageFit.ts.
  const [stageRef, avail] = useStageFit();

  const metrics = useMemo(
    () => boardMetrics(start, avail.width, avail.height),
    [start, avail],
  );

  // ── Drag ───────────────────────────────────────────────────────────────────

  /**
   * The live drag lives in a ref as well as in state: the pointer handlers need the
   * current offset synchronously on pointerup, and reading it back out of state there
   * would be a frame stale.
   */
  const dragRef = useRef<null | {
    pieceId: string;
    pointerId: number;
    startX: number;
    startY: number;
    ranges: Record<Axis, { min: number; max: number }>;
    axis: Axis | null;
    offset: number;
  }>(null);

  const [drag, setDrag] = useState<null | { pieceId: string; axis: Axis | null; offset: number }>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, piece: Piece) {
    if (phase !== 'play') return;
    const axes = allowedAxes(piece);
    const axis = axes.length === 1 ? axes[0] : null;

    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pieceId: piece.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      ranges: {
        x: travelRange(board, piece.id, 'x'),
        y: travelRange(board, piece.id, 'y'),
      },
      axis,
      offset: 0,
    };
    setDrag({ pieceId: piece.id, axis, offset: 0 });
    setHintPieceId(null);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    // A 1x1 is free on both axes, but a single drag commits to one of them: an L-shaped
    // pull would be two moves wearing one drag's clothes.
    if (!d.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      d.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }

    const range = d.ranges[d.axis];
    const raw = d.axis === 'x' ? dx : dy;
    // Clamped to the free run, so a block visibly stops dead against its neighbour.
    d.offset = Math.max(range.min * metrics.cell, Math.min(range.max * metrics.cell, raw));
    setDrag({ pieceId: d.pieceId, axis: d.axis, offset: d.offset });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    setDrag(null);
    if (!d.axis) return;

    const range = d.ranges[d.axis];
    const delta = Math.max(range.min, Math.min(range.max, Math.round(d.offset / metrics.cell)));
    if (delta === 0) return;

    const next = applyMove(board, d.pieceId, d.axis, delta);
    setBoard(next);
    setMoves((m) => m + 1);
    setHintPieceId(null);
    if (isSolved(next)) setPhase('escaping');
    else if (keyEscapeSlide(next) !== null) setPhase('clearing');
  }

  /**
   * The auto-swim. Once nothing stands between the fish and the gap, asking for one more
   * drag is busywork: the puzzle is already solved and the drag only tests the hand. It
   * still counts as a move - the solver's `minMoves` includes this slide, so making it
   * free would put every player one move under the baseline and flatten the score.
   */
  useEffect(() => {
    if (phase !== 'clearing') return;

    // Everything happens in the timer, including the decision: the effect body itself
    // must not touch state, or every clearing render cascades into another.
    const go = () => {
      const delta = keyEscapeSlide(board);
      const key = board.pieces.find((p) => p.isKey);
      // Nothing can close the lane between the commit and here, but returning to play
      // beats throwing out of a timer if that ever stops being true.
      if (delta === null || !key) { setPhase('play'); return; }

      const axis: Axis = board.exit.side === 'left' || board.exit.side === 'right' ? 'x' : 'y';
      const origin = pieceOrigin(key, metrics);
      const size = pieceSize(key, metrics);

      setTrail({
        x: origin.x + size.w / 2,
        y: origin.y + size.h / 2,
        dx: axis === 'x' ? delta * metrics.cell : 0,
        dy: axis === 'y' ? delta * metrics.cell : 0,
      });
      setBoard((b) => applyMove(b, key.id, axis, delta));
      setMoves((m) => m + 1);
      setPhase(reduced ? 'escaping' : 'swimming');
    };

    // Reduced motion gets no beat and no swim: the board jumps to solved on the next
    // frame and hands over to the escape's jump cut.
    const id = setTimeout(go, reduced ? 0 : CLEAR_BEAT_MS);
    return () => clearTimeout(id);
  }, [phase, board, metrics, reduced]);

  useEffect(() => {
    if (phase !== 'swimming') return;
    const id = setTimeout(() => setPhase('escaping'), SWIM_MS);
    return () => clearTimeout(id);
  }, [phase]);

  // The escape is a view flourish over an already-decided board, so it is a timer rather
  // than a transition callback: a cancelled or dropped transitionend must not strand the
  // round without its completion panel.
  useEffect(() => {
    if (phase !== 'escaping') return;
    const id = setTimeout(() => setPhase('done'), reduced ? 260 : 950);
    return () => clearTimeout(id);
  }, [phase, reduced]);

  // ── Controls ───────────────────────────────────────────────────────────────

  function handleReset() {
    setBoard(start);
    setResets((r) => r + 1);
    setHintPieceId(null);
    setTrail(null);
    // The move counter keeps running: it counts what this puzzle cost, and starting over
    // is one of the things it cost.
  }

  function handleHint() {
    const move = nextBestMove(board);
    if (!move) return;
    setHintPieceId(move.pieceId);
    setHintsUsed((h) => h + 1);
  }

  function handleFinish() {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        levelKey: level.id,
        tier: level.tier,
        movesUsed: moves,
        minMoves: level.minMoves,
        resets,
        hintsUsed,
      },
    });
  }

  const hintUnlocked = phase === 'play' && level.minMoves > 0 && moves >= level.minMoves * HINT_AFTER_RATIO;
  const gap = exitRect(board.exit, board, metrics);
  const escape = escapeOffset(board.exit, metrics);
  const cornerSize = Math.round(metrics.wall * CORNER_RATIO);
  const gone = phase === 'escaping' || phase === 'done';
  const swimming = phase === 'swimming';

  return (
    <div className="h-full min-h-0 flex flex-col items-center gap-3">
      <ClearTheWayStyles reduced={reduced} />
      <InstructionPanelStyles />

      {/*
        The shared blue instruction panel, since the Sep-17 review. It was a plain line
        of caption text on the tank's own background, which is the one thing the review
        said should never be how a game speaks to a resident.
      */}
      <InstructionPanel className="w-full max-w-2xl flex-none" fontSize={24}>
        {t('clearTheWay.instruction', 'Slide the blocks out of the way and free the fish.')}
      </InstructionPanel>

      {/*
        `flex-1 min-h-0` is what makes this measurable: the frame's height comes from the
        column above it, never from the board inside it, so observing it cannot feed back
        into the size it reports.
      */}
      <div ref={stageRef} className="flex-1 min-h-0 w-full flex justify-center">
        <div
          data-board
          className="relative flex items-center justify-center"
          style={{
            // Wide enough to hold the exit beacon, which is drawn outside the wall.
            // Comes from the metrics rather than a literal, so the fit calculation and
            // the rendered padding cannot drift apart - they did, and the board overhung
            // the screen by exactly this much.
            padding: metrics.pad,
            borderRadius: 28,
            backgroundImage: `url(${SKIN.backdrop})`,
            backgroundSize: 'cover',
            // Bottom, so the seabed and its anchor stay in shot as the panel gets shorter.
            backgroundPosition: 'center bottom',
            // No `overflow: hidden` here: the freed fish swims past the frame on its way
            // out, and clipping the panel would cut it off mid-escape.
            boxShadow: 'inset 0 2px 22px rgba(0,0,0,.35)',
          }}
        >
          {/* Drifting bubbles: decoration only, and the first thing reduced motion drops. */}
          {!reduced && [0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="ctw-drift pointer-events-none absolute rounded-full"
              style={{
                left: `${8 + i * 21}%`,
                bottom: 6,
                width: 6 + (i % 3) * 4,
                height: 6 + (i % 3) * 4,
                background: 'rgba(210,245,255,.55)',
                animationDelay: `${i * 1.7}s`,
              }}
            />
          ))}

          {/* The frame: floor inset, four rails around it, one gap painted back to floor. */}
          <div className="relative" style={{ width: metrics.boardW, height: metrics.boardH }}>
            <div
              className="absolute"
              style={{
                // Inset by the wall so the floor tile's own joints land on the cell grid
                // rather than a wall's width off it.
                left: metrics.wall,
                top: metrics.wall,
                width: metrics.boardW - metrics.wall * 2,
                height: metrics.boardH - metrics.wall * 2,
                ...floorPaint(metrics.cell),
                boxShadow: '0 8px 0 rgba(0,0,0,.28)',
              }}
            />

            {SIDES.map((side) => (
              <div
                key={side}
                className="absolute"
                style={{ ...railRect(side, metrics), ...railPaint(side, metrics.wall) }}
                aria-hidden
              />
            ))}

            {/* The gap: the rail painted back to floor, and the beacon beyond it. */}
            <div
              className="absolute"
              style={{
                left: gap.x, top: gap.y, width: gap.w, height: gap.h,
                ...floorPaint(metrics.cell),
                // Kept in step with the floor beside it, so the gap reads as the floor
                // running out through the wall rather than as a tile patched into it.
                backgroundPosition: `${metrics.wall - gap.x}px ${metrics.wall - gap.y}px`,
              }}
            />

            {CORNERS.map((corner) => (
              <img
                key={corner}
                src={SKIN.corner}
                alt=""
                className="absolute pointer-events-none"
                style={{
                  ...cornerRect(corner, metrics, cornerSize),
                  width: cornerSize,
                  height: cornerSize,
                  transform: cornerFlip(corner),
                }}
                aria-hidden
              />
            ))}

            <img
              src={SKIN.exitArrow}
              alt=""
              className="ctw-exit-glow absolute pointer-events-none"
              style={{
                left: gap.x + gap.w,
                top: gap.y + gap.h / 2 - metrics.cell * 0.35,
                width: metrics.cell * 0.6,
                height: metrics.cell * 0.7,
                objectFit: 'contain',
              }}
              aria-hidden
            />

            {board.pieces.map((piece) => {
              const origin = pieceOrigin(piece, metrics);
              const size = pieceSize(piece, metrics);
              const dragging = drag?.pieceId === piece.id;
              const dragX = dragging && drag.axis === 'x' ? drag.offset : 0;
              const dragY = dragging && drag.axis === 'y' ? drag.offset : 0;
              const flying = piece.isKey && gone;
              const outX = flying && !reduced ? escape.x : 0;
              const outY = flying && !reduced ? escape.y : 0;
              const radius = Math.round(metrics.cell * 0.18);

              return (
                <div
                  key={piece.id}
                  role="button"
                  tabIndex={-1}
                  aria-label={piece.isKey
                    ? t('clearTheWay.aria.key', 'The trapped fish')
                    : t('clearTheWay.aria.block', 'A blocking stone')}
                  onPointerDown={(e) => handlePointerDown(e, piece)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className={`absolute select-none ${hintPieceId === piece.id ? 'ctw-hint' : ''}`}
                  style={{
                    left: 0,
                    top: 0,
                    width: size.w,
                    height: size.h,
                    borderRadius: radius,
                    transform: `translate3d(${origin.x + dragX + outX}px, ${origin.y + dragY + outY}px, 0)`,
                    transition: flying
                      ? (reduced
                        ? 'opacity 200ms ease-in'
                        : 'transform 900ms cubic-bezier(.45,.05,.55,1), opacity 900ms ease-in')
                      : dragging ? 'none'
                      : swimming && piece.isKey ? `transform ${SWIM_MS}ms cubic-bezier(.34,.02,.28,1)`
                      : 'transform 150ms ease-out',
                    opacity: flying ? 0 : 1,
                    touchAction: 'none',
                    cursor: phase === 'play' ? 'grab' : 'default',
                    zIndex: piece.isKey ? 3 : 2,
                  }}
                >
                  {/* The key carries no slab: the fish swims in its cells rather than
                      riding a block, so its piece box is transparent and only the fish is
                      painted. Everything else wears the slab cut for its shape, drawn
                      `contain`ed so the sheet's own inset shows the floor between blocks
                      and no sprite is ever stretched to fit. */}
                  <img
                    src={piece.isKey ? SKIN.key : blockSlab(piece)}
                    alt=""
                    draggable={false}
                    className="w-full h-full pointer-events-none"
                    style={{
                      objectFit: 'contain',
                      transform: piece.isKey ? keyFacing(board.exit.side) : undefined,
                      filter: 'drop-shadow(0 3px 2px rgba(0,0,0,.35))',
                    }}
                    aria-hidden
                  />
                </div>
              );
            })}

            {/* The fish's wake, dropped along the path it swims rather than puffed at one
                spot: staggered by where each bubble sits, so they surface behind it. */}
            {trail && !reduced && (swimming || gone) && BUBBLE_STOPS.map((at, i) => {
              const size = Math.round(metrics.cell * (0.12 + (i % 3) * 0.04));
              return (
                <span
                  key={i}
                  className="ctw-bubble pointer-events-none absolute rounded-full"
                  style={{
                    left: trail.x + trail.dx * at - size / 2,
                    top: trail.y + trail.dy * at - size / 2,
                    width: size,
                    height: size,
                    background: SKIN.bubbleFill,
                    boxShadow: `inset 0 0 0 1px ${SKIN.bubbleEdge}`,
                    animationDelay: `${Math.round(at * SWIM_MS)}ms`,
                    zIndex: 4,
                  }}
                  aria-hidden
                />
              );
            })}
          </div>

          {phase === 'done' && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              // Above the blocks, which carry their own z-index: without one of its own
              // this panel loses to them and the board shows through it.
              style={{ borderRadius: 28, background: 'rgba(5,32,46,.72)', zIndex: 10 }}
            >
              <div className="ctw-freed panel-surface flex flex-col items-center gap-3 px-8 py-6 text-center">
                <img src={SKIN.key} alt="" style={{ width: 96 }} aria-hidden />
                <p className="text-h2">{t('clearTheWay.freed', 'Free!')}</p>
                <p className="text-body text-caption-text">
                  {t('clearTheWay.movesTaken', 'You did it in {{moves}} moves. Best possible: {{best}}.', {
                    moves, best: level.minMoves,
                  })}
                </p>
                <Button variant="kit" onClick={handleFinish}>{t('clearTheWay.next', 'Next puzzle')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HUD */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="shell-tag shell-tag-level">
          {t('clearTheWay.moves', 'Moves')}: {moves}
        </span>
        <span className="shell-tag shell-tag-category">
          {t('clearTheWay.best', 'Fewest possible')}: {level.minMoves}
        </span>
        <Button variant="secondary" size="md" onClick={handleReset} disabled={phase !== 'play'}>
          {t('clearTheWay.reset', 'Start over')}
        </Button>
        {hintUnlocked && (
          <Button variant="secondary" size="md" onClick={handleHint}>
            {t('clearTheWay.hint', 'Show me')}
          </Button>
        )}
      </div>
    </div>
  );
}
