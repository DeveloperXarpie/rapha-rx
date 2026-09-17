import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { kitButton } from '../../../styles/kitButton';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useImagesReady } from '../../../lib/useImagesReady';
import { useStageScale } from '../../../hooks/useStageFit';

import Blind from './Blind';
import Station from './Station';
import Train, { BACK_MS, RUN_MS, type TrainStatus } from './Train';
import TrackLayer from './TrackLayer';
import { EffectView, TickView } from './effects';
import { TICK_MS, lifetime, makeConfetti, nextFxId, type Effect, type Tick } from './effectModel';
import {
  BANNER, BOARD_H, BOARD_W, CANVAS_H, CANVAS_W, COL_X, GROUND, HUD_H, LANE_Y, MOUTH_Y,
  RESET_BTN, SAFE_X, SCENERY,
} from './geometry';
import { STATION_NAME_FALLBACKS, STATION_NAME_KEYS, paletteFor, shuffled } from './palette';
import { ALL_SPRITE_URLS, BOARD_BACKGROUND, HEART, RESET_GLYPH, SCENERY_SPRITES } from './sprites';
import { INSTRUCTION_SCRIM, INSTRUCTION_SCRIM_CLEAR, KIT_COLOURS } from '../../../lib/uiKit';
import InstructionPanel, { InstructionPanelStyles } from '../../../components/chrome/InstructionPanel';
import StageBackdrop from '../../../components/chrome/StageBackdrop';
import { COLOURS, EASE_SETTLE, TrainYardStyles } from './styles';

// ─── Timings ──────────────────────────────────────────────────────────────────

const BLIND_MS = 540;
/** The blind must land before the signs blank, or the player watches them pop to `?`. */
const ARM_MS = 40;
const ARRIVE_MS = RUN_MS + 60;
const SETTLE_MS = 700;
const RETURN_DELAY_MS = 380;
const DOT_TICK_MS = 120;

// ─── The mask's two holes ─────────────────────────────────────────────────────
//
// Both pools are the same size and hang off the geometry they are cut around, so a
// change to where the stations or the lanes sit moves the holes with them.

/** Centre of the station pool. The station body stands about 130px above its mouth. */
const STATION_POOL_Y = MOUTH_Y - 40;
/** Centre of the train pool. LANE_Y is where a parked train's track begins. */
const TRAIN_POOL_Y = LANE_Y + 40;
/**
 * Where the top piece of the mask ends and the bottom begins. It has to fall between
 * the two pools and far enough from both that each is already at full strength, or the
 * seam shows as a band.
 */
const MASK_SPLIT = 620;
/**
 * Pool size, and how much of each radius is clear before the falloff starts. Wide
 * enough that all four lanes are in the clear and only the board's margins - the house,
 * the water tower, the trees down both edges - stay masked.
 */
const POOL_RX = 420;
const POOL_RY = 300;
const POOL_PLATEAU = '55%';

// ─── Params ───────────────────────────────────────────────────────────────────

export interface TrainYardParams {
  signMs: number;
  retentionHoldMs: number;
  similarColours: boolean;
  lives: number;
}

const DEFAULT_PARAMS: TrainYardParams = {
  signMs: 8000,
  retentionHoldMs: 1500,
  similarColours: false,
  lives: 3,
};

type Phase = 'encoding' | 'retention' | 'dispatch' | 'roundEnd' | 'gameOver';

interface TrainState { lane: number; c: number; status: TrainStatus; target: number | null }

interface TrainYardProps {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  /** Test/config override for the OS media query. */
  reducedMotion?: boolean;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(override?: boolean): boolean {
  const prefers = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
  return override ?? prefers;
}

export default function TrainYard({ levelConfig, onLevelComplete, reducedMotion }: TrainYardProps) {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion(reducedMotion);
  const imagesReady = useImagesReady(ALL_SPRITE_URLS);

  const params = useMemo<TrainYardParams>(
    () => ({ ...DEFAULT_PARAMS, ...(levelConfig.params as unknown as Partial<TrainYardParams>) }),
    [levelConfig.params],
  );
  const palette = useMemo(() => paletteFor(params.similarColours), [params.similarColours]);

  /**
   * `assign` and `order` are shuffled independently, so a train's lane position carries no
   * information about its station. Frozen in a lazy initialiser: a re-render must never
   * reshuffle the round underneath the player.
   */
  const [round] = useState(() => ({
    order: shuffled([0, 1, 2, 3]),
    assign: shuffled([0, 1, 2, 3]),
    names: shuffled(STATION_NAME_KEYS).slice(0, 4),
  }));

  const [phase, setPhase] = useState<Phase>('encoding');
  const [trains, setTrains] = useState<TrainState[]>(() =>
    round.order.map((c, lane) => ({ lane, c, status: 'lane' as TrainStatus, target: null })),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [suggested, setSuggested] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const [lives, setLives] = useState(params.lives);
  const [covered, setCovered] = useState(false);
  const [blindDown, setBlindDown] = useState(false);
  const [retentionPct, setRetentionPct] = useState(0);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [tick, setTick] = useState<Tick | null>(null);

  // Refs that timeouts read, so a callback fired 4.5s later never sees a stale closure.
  const timersRef = useRef<number[]>([]);
  const tokenRef = useRef(0);
  const livesRef = useRef(params.lives);
  const trainsRef = useRef(trains);
  const homeLanesRef = useRef<Set<number>>(new Set());
  const erroredLanesRef = useRef<Set<number>>(new Set());
  const resetsRef = useRef(0);
  const wrongRef = useRef(0);
  const committedRef = useRef(false);
  const startedAt = useRef(0);

  useEffect(() => { trainsRef.current = trains; }, [trains]);

  useEffect(() => { startedAt.current = Date.now(); }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const pushEffects = useCallback((fx: Effect[]) => {
    setEffects((prev) => [...prev, ...fx]);
    fx.forEach((f) => {
      // Reap by object identity. Filtering by id lets a stale reaper delete a live scrap
      // from a later burst.
      later(() => setEffects((prev) => prev.filter((e) => e !== f)), lifetime(f.kind));
    });
  }, [later]);

  const setTrainPatch = useCallback((lane: number, patch: Partial<TrainState>) => {
    setTrains((ts) => ts.map((tr) => (tr.lane === lane ? { ...tr, ...patch } : tr)));
  }, []);

  /**
   * Puts the next waiting train forward, already selected.
   *
   * The handoff had the player tap a train and then its station. That second tap carries no
   * memory load - the train is right there under their finger - so the game picks the train
   * and the player answers with one tap on a station. The chosen train takes both the
   * selection ring and the nudge glow, so what is being asked about is unmistakable.
   */
  const nominate = useCallback(() => {
    const waiting = trainsRef.current.filter((tr) => tr.status === 'lane' && !homeLanesRef.current.has(tr.lane));
    if (waiting.length === 0) { setSuggested(null); setSelected(null); return; }
    const lane = waiting[Math.floor(Math.random() * waiting.length)].lane;
    setSuggested(lane);
    setSelected(lane);
  }, []);

  // ─── Phase machine ──────────────────────────────────────────────────────────
  // Each phase arms its own timers and tears them down on exit, so the display ticker can
  // never move the game and a remount (StrictMode double-mounts) cannot double-arm.

  useEffect(() => {
    if (!imagesReady) return;

    if (phase === 'encoding') {
      const id = window.setTimeout(() => {
        setCovered(false);
        setRetentionPct(0);
        setBlindDown(true);
        setPhase('retention');
      }, params.signMs);
      return () => window.clearTimeout(id);
    }

    if (phase === 'retention') {
      const hold = params.retentionHoldMs;
      const t0 = Date.now();
      // The signs blank only once the blind has landed - gated on this timer, never on the
      // phase, or the names visibly pop to `?` before the cover arrives.
      const coverId = window.setTimeout(() => setCovered(true), BLIND_MS);
      const dots = window.setInterval(() => {
        setRetentionPct(Math.min(1, (Date.now() - t0 - BLIND_MS) / hold));
      }, DOT_TICK_MS);
      const liftId = window.setTimeout(() => setBlindDown(false), BLIND_MS + hold);
      const doneId = window.setTimeout(() => {
        setPhase('dispatch');
        nominate();   // the board always opens with an obvious next move
      }, BLIND_MS + hold + BLIND_MS);
      return () => {
        window.clearTimeout(coverId);
        window.clearInterval(dots);
        window.clearTimeout(liftId);
        window.clearTimeout(doneId);
      };
    }
  }, [phase, imagesReady, params.signMs, params.retentionHoldMs, nominate]);

  // ─── Interaction ────────────────────────────────────────────────────────────

  const busy = trains.some((tr) => tr.status === 'arm' || tr.status === 'run' || tr.status === 'back');
  const canAct = phase === 'dispatch' && !busy;

  /** Switching to a different waiting train is allowed; there is no way to end up with none. */
  function pickTrain(lane: number) {
    if (!canAct || trains[lane].status === 'done' || selected === lane) return;
    setSelected(lane);
    setSuggested(lane);
  }

  function pickStation(stIdx: number) {
    if (!canAct || selected === null || revealed.has(stIdx)) return;
    send(selected, stIdx);
  }

  function send(lane: number, stIdx: number) {
    const token = ++tokenRef.current;
    const train = trainsRef.current[lane];
    const correct = round.assign[stIdx] === train.c;

    setTrainPatch(lane, { target: stIdx, status: 'arm' });
    setSelected(null);
    setSuggested(null);

    // One frame between committing the path and starting the run. Do both in the same
    // commit and the browser has nothing to interpolate from, so the train teleports.
    later(() => setTrainPatch(lane, { status: 'run' }), ARM_MS);

    later(() => {
      if (token !== tokenRef.current) return;

      if (correct) {
        homeLanesRef.current.add(lane);
        setRevealed((prev) => new Set(prev).add(stIdx));
        setTrainPatch(lane, { status: 'done' });
        pushEffects([
          { id: nextFxId(), kind: 'bloom', x: COL_X[stIdx], y: MOUTH_Y },
          ...makeConfetti(COL_X[stIdx], MOUTH_Y),
        ]);
        later(() => {
          if (token !== tokenRef.current) return;
          if (homeLanesRef.current.size === 4) setPhase('roundEnd');
          else nominate();
        }, SETTLE_MS);
        return;
      }

      erroredLanesRef.current.add(lane);
      wrongRef.current += 1;
      pushEffects([{ id: nextFxId(), kind: 'dip', x: COL_X[stIdx], y: MOUTH_Y + 26 }]);
      const tk: Tick = { id: nextFxId(), x: COL_X[stIdx], y: MOUTH_Y - 20, label: t('ty.wrong', 'Not this one') };
      setTick(tk);
      later(() => setTick((cur) => (cur === tk ? null : cur)), TICK_MS);

      const nextLives = livesRef.current - 1;
      livesRef.current = nextLives;
      setLives(nextLives);

      later(() => {
        if (token !== tokenRef.current) return;
        setTrainPatch(lane, { status: 'back' });
      }, RETURN_DELAY_MS);

      // The card waits for the train to finish its return run - the yard is put back
      // before the player is told the round is over.
      later(() => {
        if (token !== tokenRef.current) return;
        setTrainPatch(lane, { status: 'lane', target: null });
        if (nextLives <= 0) setPhase('gameOver');
        else nominate();
      }, RETURN_DELAY_MS + BACK_MS);
    }, ARRIVE_MS);
  }

  /**
   * Restarts the round's dispatch: every train back to its lane and every sign blank again.
   * Lives are not restored and the reset is scored, so it is a way out of a muddle rather
   * than a way to fish for the answer. Disabled mid-animation, so it cannot be used to
   * cancel a dispatch that is about to be wrong.
   */
  function reset() {
    if (!canAct) return;
    tokenRef.current += 1;          // strands any callback still queued
    resetsRef.current += 1;
    homeLanesRef.current.clear();
    setRevealed(new Set());
    setSelected(null);
    setTrains(round.order.map((c, lane) => ({ lane, c, status: 'lane' as TrainStatus, target: null })));
    setEffects([]);
    nominate();
  }

  /** `endedAt` comes from the event handler, so the elapsed clock is read at the tap. */
  function commit(completed: boolean, endedAt: number) {
    if (committedRef.current) return;
    committedRef.current = true;
    const home = [...homeLanesRef.current];
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((endedAt - startedAt.current) / 1000),
      completed,
      metrics: {
        trainsHome: home.length,
        totalTrains: 4,
        firstTryCorrect: home.filter((lane) => !erroredLanesRef.current.has(lane)).length,
        wrongDispatches: wrongRef.current,
        resets: resetsRef.current,
        livesLeft: Math.max(0, lives),
        signMs: params.signMs,
      },
    });
  }

  // ─── Presentation ───────────────────────────────────────────────────────────

  // The board is measured against the play box GameShell hands us, not against the
  // viewport minus a guess at the chrome. See hooks/useStageFit.ts.
  const [stageRef, stage] = useStageScale(CANVAS_W, CANVAS_H, { safe: SAFE_X, ground: GROUND });

  const selectedColour = selected !== null ? palette[trains[selected].c] : null;
  const caption = (() => {
    /*
     * The Sep-10 review's "fix UI text". The old line told the resident to learn the
     * station NAMES, and the names are not the task - a train is matched to its
     * station by colour, and the names on the signs are scenery. The line and the
     * game now agree.
     */
    if (phase === 'encoding') return t('ty.caption.encoding', 'Remember the colour of each station.');
    if (phase === 'retention') return t('ty.caption.retention', 'Hold them in mind...');
    if (phase === 'roundEnd') return t('ty.caption.roundEnd', 'Every train home. Well done.');
    if (phase === 'gameOver') return t('ty.caption.gameOver', 'Out of hearts - try that yard again.');
    if (selectedColour) {
      return t('ty.caption.selected', 'Where does the {{colour}} train go?', {
        colour: t(`ty.colour.${selectedColour.id}`, selectedColour.id),
      });
    }
    if (busy) return t('ty.caption.sending', 'On its way…');
    /*
     * The standing instruction while the board waits, which is the state the review's
     * reference mock is in. Selecting a train swaps it for the question above.
     */
    return t('ty.caption.dispatch', 'Remember the colour of each station.');
  })();
  const captionKey = `${phase}-${selected ?? 'none'}-${revealed.size}`;

  const showNames = phase === 'encoding' || (phase === 'retention' && !covered);
  /*
   * The yard is empty until it is handed over. Through encoding and the hold the task is
   * the four station colours, and four locomotives parked under them are four more
   * colours competing with the ones being held in mind. They fade in as dispatch opens -
   * the barrier lifts, then the trains come in, which is the first moment they mean
   * anything.
   */
  const trainsHidden = phase === 'encoding' || phase === 'retention';
  const card = phase === 'roundEnd' || phase === 'gameOver' ? phase : null;

  if (!imagesReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-h3 text-caption-text">{t('ty.loading', 'Loading...')}</p>
      </div>
    );
  }

  return (
    /*
     * Two divs, and the split matters. The outer one is the stage: `w-full h-full`, so its
     * size comes from the play box above and never from the board below. That is the
     * element the observer watches. The inner one carries the scale. Observing the scaled
     * element instead would close an observe-resize-observe loop.
     */
    <div
      ref={stageRef}
      className="w-full h-full overflow-hidden flex justify-center items-start relative"
      // Whatever the board cannot fill is painted with its own grass rather than left as
      // a slab of app grey: the gradient is the fallback, StageBackdrop is the fill. See
      // hooks/useStageFit.ts and components/chrome/StageBackdrop.tsx.
      style={{ background: stage.ground }}
    >
      <TrainYardStyles />
      <InstructionPanelStyles />
      <StageBackdrop src={BOARD_BACKGROUND.src} />
      {/*
        Whatever height the board still cannot cover, on a phone too tall for even the
        cropped board to fill - see geometry's SAFE_X.

        StageBackdrop's blurred plate is the general answer to a letterbox and it is the
        wrong one here, because neither edge of this board is plate. Above, the canvas
        begins with the near-white HUD, so anything green over it reads as a bar however
        well it is blurred; the band wears the HUD's own colour instead and the strip
        simply looks taller. Below, the board ends in grass that sits inside the train
        pool, where the mask is fully clear, so the band is the plate's own bottom edge
        colour at full brightness. Both are painted over the backdrop and under the board.
      */}
      {stage.offsetY > 0.5 && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute', left: 0, top: 0, width: '100%',
              height: Math.ceil(stage.offsetY),
              zIndex: 0, pointerEvents: 'none',
              background: KIT_COLOURS.panel,
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute', left: 0, bottom: 0, width: '100%',
              top: Math.floor(stage.offsetY + stage.height),
              zIndex: 0, pointerEvents: 'none',
              background: GROUND.bottom,
            }}
          />
        </>
      )}
      <div
        data-board
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          // Flex centring on the stage, not `margin: 0 auto` here: the canvas is 800
          // design px and the play box is routinely narrower, and auto margins collapse
          // to zero once the child overflows. The board then scales about a centre that
          // is not the box's centre and hangs off to the right, mostly clipped.
          flex: '0 0 auto',
          zIndex: 1,
          // Centres the board in the leftover height. 0 once the board fills the box.
          marginTop: stage.offsetY,
          transform: `scale(${stage.scale})`,
          transformOrigin: 'top center',
          position: 'relative',
          fontFamily: "'Baloo 2', sans-serif",
          userSelect: 'none',
        }}
      >
        {/* HUD */}
        {/*
          The Sep-9 review repaints this strip from deep navy to the kit's near-white
          and moves the hearts to its left end, with GameShell's level plate centred
          between them and the exit at the right.

          Left-aligned is safe now where it was not before: the shell's plate used to
          sit in the top-left corner, so anything parked at this end vanished under
          it. The plate is centred now, and the hearts have the corner to themselves.
        */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: HUD_H,
            background: KIT_COLOURS.panel,
            borderBottom: `4px solid ${KIT_COLOURS.navy}`,
            display: 'flex', alignItems: 'center', gap: 10,
            // Inside SAFE_X along with RESET, so a phone that crops the margins of the
            // board never takes a bite out of the first heart. See geometry.ts.
            padding: `0 ${RESET_BTN.left}px`,
          }}
        >
          {/*
            The count is spoken rather than printed. The "HEARTS" caption went with the
            navy bar - it was labelling a strip that no longer needs labelling - so this
            is what still tells a screen reader how many are left.
          */}
          <span className="sr-only" aria-live="polite">
            {t('ty.heartsLeft', '{{count}} hearts left', { count: Math.max(0, lives) })}
          </span>
          {[0, 1, 2].map((i) => (
            <img
              key={i}
              src={HEART.src}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{
                width: 44,
                height: 44 * (HEART.h / HEART.w),
                opacity: i < lives ? 1 : 0.22,
                filter: i < lives ? 'drop-shadow(0 2px 3px rgba(0,0,0,.28))' : 'grayscale(1)',
                transition: 'opacity 300ms linear, filter 300ms linear',
              }}
            />
          ))}
        </div>

        {/* Board */}
        <div
          style={{
            position: 'absolute', left: 0, top: HUD_H, width: BOARD_W, height: BOARD_H,
            // The fallback colour behind the plate while it decodes. The plate itself
            // moved onto the backdrop below, so that the mask can act on it.
            background: `url(${BOARD_BACKGROUND.src}) center / 100% 100% no-repeat, linear-gradient(180deg, #85BE55 0%, #7CB74E 40%, #74AF48 100%)`,
            overflow: 'hidden',
          }}
        >
          {/*
            The backdrop: the track and the trees, in their own stacking context so the
            mask below can cover them while staying under the stations and the trains.
          */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <TrackLayer />

            {/* Scenery: decorative, never over a control. */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
              {SCENERY.map((s, i) => {
                const sprite = SCENERY_SPRITES[s.kind];
                return (
                  <img
                    key={`${s.kind}-${i}`}
                    src={sprite.src}
                    alt=""
                    draggable={false}
                    style={{
                      position: 'absolute',
                      left: s.left,
                      top: s.top,
                      height: s.height,
                      width: s.height * (sprite.w / sprite.h),
                      filter: 'drop-shadow(0 5px 7px rgba(31,41,55,.22))',
                    }}
                  />
                );
              })}
            </div>

          </div>

          {/*
            The mask, in two pieces, each with a hole cut in it.

            The yard is masked; the station row and the train row are not. Those are the
            two places in this game a resident reads colour, which is the whole task, so
            masking them would be masking the thing the mask exists to make legible. The
            reference render is explicit about it - the grass under the stations and
            under the trains is the board's own #9EBA3F, untouched, while everything
            between them sits at #416070.

            A hole is a radial gradient that starts transparent, so one element can carry
            one hole and no more: a second gradient stacked on the same element paints
            its own opaque field straight over the first one's hole. Hence two elements,
            split at MASK_SPLIT - which is chosen to sit in the fully masked middle, so
            the seam falls where both pieces are already at full strength and cannot be
            seen. They are siblings of the backdrop at the same z-index, so DOM order
            alone puts them over the track and the trees and under the stations and the
            trains.

            The mask is a companion to the instruction panel rather than a property of a
            phase: it is up for exactly as long as the app is speaking to the resident,
            which in this game is the whole round. That is what both Sep-17 mockups
            show - the encoding board and the dispatch board are masked alike.
          */}
          <div
            aria-hidden
            style={{
              position: 'absolute', left: 0, top: 0, width: BOARD_W, height: MASK_SPLIT,
              zIndex: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse ${POOL_RX}px ${POOL_RY}px at ${BOARD_W / 2}px ${STATION_POOL_Y}px, ${INSTRUCTION_SCRIM_CLEAR} 0, ${INSTRUCTION_SCRIM_CLEAR} ${POOL_PLATEAU}, ${INSTRUCTION_SCRIM} 100%)`,
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute', left: 0, top: MASK_SPLIT, width: BOARD_W, height: BOARD_H - MASK_SPLIT,
              zIndex: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse ${POOL_RX}px ${POOL_RY}px at ${BOARD_W / 2}px ${TRAIN_POOL_Y - MASK_SPLIT}px, ${INSTRUCTION_SCRIM_CLEAR} 0, ${INSTRUCTION_SCRIM_CLEAR} ${POOL_PLATEAU}, ${INSTRUCTION_SCRIM} 100%)`,
            }}
          />

          {round.assign.map((paletteIndex, stIdx) => (
            <Station
              key={stIdx}
              column={stIdx}
              paletteIndex={paletteIndex}
              colour={palette[paletteIndex]}
              name={t(round.names[stIdx], STATION_NAME_FALLBACKS[round.names[stIdx]])}
              revealed={showNames || revealed.has(stIdx)}
              inviting={canAct && selected !== null && !revealed.has(stIdx)}
              interactive={canAct && selected !== null && !revealed.has(stIdx)}
              reduced={reduced}
              onPick={() => pickStation(stIdx)}
            />
          ))}

          {trains.map((tr) => (
            <Train
              key={tr.lane}
              lane={tr.lane}
              paletteIndex={tr.c}
              colour={palette[tr.c]}
              status={tr.status}
              target={tr.target}
              selected={selected === tr.lane}
              nudged={suggested === tr.lane}
              interactive={canAct && tr.status !== 'done'}
              hidden={trainsHidden}
              reduced={reduced}
              onPick={() => pickTrain(tr.lane)}
            />
          ))}

          {effects.map((fx) => <EffectView key={`fx-${fx.id}`} fx={fx} reduced={reduced} />)}
          {tick && <TickView key={`tick-${tick.id}`} tick={tick} reduced={reduced} />}

          {/*
            Instruction banner. The Sep-17 review replaced the pale kit plate with the
            shared blue panel and dropped the pink brain disc that used to sit at its
            left - the mockups show the sentence alone, and with the plate now carrying
            the board's strongest contrast the disc was one thing too many in it.
          */}
          <InstructionPanel
            style={{
              position: 'absolute', left: BANNER.left, top: BANNER.top, width: BANNER.width,
              zIndex: 7,
            }}
            textKey={captionKey}
            reduced={reduced}
            fontSize={28}
          >
            {caption}
          </InstructionPanel>

          {/* RESET */}
          <button
            type="button"
            onClick={reset}
            disabled={!canAct}
            style={{
              position: 'absolute',
              left: RESET_BTN.left, top: RESET_BTN.top,
              width: RESET_BTN.width, minHeight: RESET_BTN.height,
              zIndex: 7,
              background: COLOURS.cream,
              border: `3px solid ${COLOURS.creamBorder}`,
              borderBottomWidth: 6,
              borderRadius: 18,
              padding: '10px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              opacity: canAct ? 1 : 0.6,
              cursor: canAct ? 'pointer' : 'default',
            }}
          >
            <img
              src={RESET_GLYPH.src}
              alt=""
              draggable={false}
              style={{ width: 34, height: 34 * (RESET_GLYPH.h / RESET_GLYPH.w) }}
            />
            <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '.06em', color: COLOURS.brownMid }}>
              {t('ty.reset', 'RESET')}
            </span>
          </button>

          <Blind
            down={blindDown}
            progress={retentionPct}
            label={t('ty.blind.covered', 'SIGNS COVERED')}
            reduced={reduced}
          />

          {card && (
            <>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,48,79,.55)', zIndex: 11 }} />
              {/*
                The kit's plate, not the old cream-and-amber card. The Sep-10 review
                put this modal next to the instruction banner and asked them to match:
                they are the two things in this game that speak to the resident in
                sentences, and one of them was wearing a different game's skin.

                Same plate and same navy ink as the banner above; only the heading
                colour still varies, because "Round complete" and "Out of hearts" are
                the one place the card has to say which of the two it is before the
                resident reads a word.

                NOT the banner's pink brain disc. On the banner that disc is the voice
                giving the instruction, and a speaker with something to say. Repeated
                here it is a decoration with nothing to say, and at 64px it reads as a
                pink smudge rather than as a brain.
              */}
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 560, zIndex: 12,
                  background: KIT_COLOURS.panel,
                  border: '3px solid rgba(3, 62, 132, 0.16)',
                  borderRadius: 26,
                  boxShadow: '0 10px 26px rgba(0, 0, 0, 0.32)',
                  padding: '44px 46px',
                  textAlign: 'center',
                  animation: reduced
                    ? 'ty-fade 320ms ease-out both'
                    : `ty-cardin 360ms ${EASE_SETTLE} both`,
                }}
              >
                <h3
                  style={{
                    fontSize: 46, fontWeight: 800, marginBottom: 14,
                    color: card === 'roundEnd' ? COLOURS.success : COLOURS.error,
                  }}
                >
                  {card === 'roundEnd'
                    ? t('ty.roundComplete', 'Round complete')
                    : t('ty.outOfHearts', 'Out of hearts')}
                </h3>
                <p style={{ fontSize: 27, fontWeight: 600, color: KIT_COLOURS.navy, marginBottom: 30, textWrap: 'pretty' }}>
                  {card === 'roundEnd'
                    ? t('ty.roundComplete.body', 'All four trains are home with {{count}} hearts left.', { count: Math.max(0, lives) })
                    : t('ty.outOfHearts.body', 'Have another go at this yard - the stations will be shown again.')}
                </p>
                <button
                  type="button"
                  className="btn-brand btn-green-kit"
                  onClick={() => commit(card === 'roundEnd', Date.now())}
                  style={{
                    ...kitButton(76),
                    padding: '0 44px', cursor: 'pointer',
                    /*
                     * `.btn-brand` is display:flex, which makes the button block-level,
                     * and a block-level box ignores the card's text-align. Auto margins
                     * are what centres it - not the text-align that centred the
                     * inline-block button this replaced.
                     */
                    margin: '0 auto',
                  }}
                >
                  {card === 'roundEnd' ? t('ty.next', 'Next round') : t('ty.retry', 'Try again')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
