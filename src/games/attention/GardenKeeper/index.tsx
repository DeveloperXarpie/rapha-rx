import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { useImagesReady } from '../../../lib/useImagesReady';
import { getGardenKeeperParams, type GardenKeeperDynamicParams } from '../../../lib/dynamicDifficulty';
import {
  BOARD_H, CANVAS_H, CANVAS_W, HUD_H, buildBed, recedeFor, ringColour, ringSweepDeg,
  zIndexFor, type Plant,
} from './geometry';
import {
  buildMetrics, initialRoundState, pickSproutId, roundReducer,
  type Outcome, type RoundState, type Stage,
} from './model';
import { spriteUrl, spriteUrlsFor, SPROUT_URL, bloomUrl, wiltedUrl } from './sprites';
import { COLOURS } from './palette';
import { EASE, EASE_OUT, GardenKeeperStyles } from './styles';

// ─── Effects ──────────────────────────────────────────────────────────────────

type Effect =
  | { id: number; kind: 'drop'; x: number; y: number; dx: number; dy: number; delay: number }
  | { id: number; kind: 'toast'; x: number; y: number; text: string; colour: string };

let FX_SEQ = 0;
function nextFxId(): number {
  FX_SEQ += 1;
  return FX_SEQ;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface GardenKeeperProps {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  /** Test override for the OS media query. */
  reducedMotion?: boolean;
}

// ─── Backdrop ─────────────────────────────────────────────────────────────────

function Backdrop() {
  const layer = (style: React.CSSProperties) => <div style={{ position: 'absolute', ...style }} />;
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #9AD0EC 0%, #C4E3F4 132px, #86BE55 133px, #6BA641 240px)',
      }} />
      {layer({ left: -40, top: 96, width: 380, height: 96, borderRadius: '50%', background: '#6FA83F' })}
      {layer({ left: 250, top: 74, width: 340, height: 108, borderRadius: '50%', background: '#7CB447' })}
      {layer({ left: 520, top: 92, width: 360, height: 98, borderRadius: '50%', background: '#679C3A' })}
      {layer({ left: 0, top: 168, width: 800, height: 40, background: 'linear-gradient(180deg, #5E9C38, #4E8C3A)' })}
      {layer({ left: 0, top: 200, width: 800, height: 972, background: 'linear-gradient(180deg, #4E8C3A, #427E2F)' })}
      {layer({
        left: 18, top: 224, width: 764, height: 924, borderRadius: '210px / 130px',
        background: 'radial-gradient(ellipse at 50% 20%, #7E5632 0%, #67451F 55%, #533618 100%)',
      })}
      {layer({
        left: 18, top: 224, width: 764, height: 924, borderRadius: '210px / 130px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 42%, transparent 46%, rgba(28,16,4,.34) 100%)',
      })}
    </>
  );
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

/** A heart, drawn with the spec's clip-path rather than a glyph so it scales cleanly. */
const HEART_CLIP =
  'path("M19 34 C 6 24, 0 16, 0 10 C 0 4, 5 0, 10 0 C 14 0, 17 2, 19 5 C 21 2, 24 0, 28 0 C 33 0, 38 4, 38 10 C 38 16, 32 24, 19 34 Z")';

function Hud({ state, params, t }: { state: RoundState; params: GardenKeeperDynamicParams; t: TFunction }) {
  const secs = Math.ceil(state.timeLeft);
  const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const low = state.phase === 'playing' && state.timeLeft <= 15;
  const pct = Math.min(1, state.watered / Math.max(1, params.targetCount)) * 100;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 22, padding: '0 26px',
      width: CANVAS_W, height: HUD_H, boxSizing: 'border-box',
      background: `linear-gradient(180deg, ${COLOURS.hudTop}, ${COLOURS.hudBot})`,
      borderBottom: `4px solid ${COLOURS.hudEdge}`,
    }}>
      <span style={{
        fontSize: 42, fontWeight: 800, color: low ? COLOURS.clockLow : '#FFFFFF',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '.01em',
        transition: 'color 260ms ease',
      }}>
        {clock}
      </span>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {/* Authored uppercase in English only. Hindi and Kannada have no case, so no
            textTransform here - it would do nothing there and mangle nothing here. */}
        <span style={{ fontSize: 18, fontWeight: 700, color: COLOURS.hudLabel, letterSpacing: '.14em' }}>
          {t('gk.progress', 'WATERED {{watered}} / {{target}}', {
            watered: state.watered, target: params.targetCount,
          })}
        </span>
        <div style={{ height: 16, borderRadius: 8, background: COLOURS.barTrack, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: `linear-gradient(90deg, ${COLOURS.barFillA}, ${COLOURS.barFillB})`,
            transition: `width 320ms ${EASE}`,
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 9 }} aria-label={`${state.lives} lives`}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: 38, height: 35, clipPath: HEART_CLIP,
            backgroundColor: i < state.lives ? COLOURS.heartFilled : COLOURS.heartSpent,
            transition: 'background-color 260ms ease',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Bed ──────────────────────────────────────────────────────────────────────

/**
 * One plant: its tap square, the signifier ring while it is waterable, and the sprite.
 *
 * The sprite is a bitmap rather than CSS primitives - see the 2026-08-17 amendment - so
 * the whole plant is one <img> anchored at the soil line, and the growth and droop
 * animations pivot there via transformOrigin.
 */
function PlantView({ plant, stage, active, remain, fx, reduced, onTap, playing }: {
  plant: Plant;
  stage: Stage | null;
  active: boolean;
  /** Fraction of the thirst window still open, 1 down to 0. Drives the ring. */
  remain: number;
  /** Transient per-plant feedback: a shake for a wrong tap, a bounce for a good one. */
  fx: 'shake' | 'watered' | undefined;
  reduced: boolean;
  playing: boolean;
  onTap: (plant: Plant) => void;
}) {
  const recede = recedeFor(plant.depth);
  const ringSize = plant.hit * 1.24;

  // Green while there is time, amber past halfway, red in the last fifth. The colour is
  // the second channel after the arc length, so the state reads even in peripheral vision.
  const ringCol = ringColour(remain);
  const deg = ringSweepDeg(remain);

  // Figure and ground: the plant asking for water is the only thing at full saturation.
  const filter = active
    ? undefined
    : plant.kind === 'wilted'
      ? `saturate(0.62) brightness(${1 - recede})`
      : `saturate(0.9) brightness(${1 - recede * 0.4})`;

  return (
    <div
      onPointerUp={() => onTap(plant)}
      style={{
        position: 'absolute',
        left: plant.x, top: plant.y, width: plant.hit, height: plant.hit,
        margin: `${-plant.hit * 0.82}px 0 0 ${-plant.hit / 2}px`,
        zIndex: zIndexFor(plant, active),
        cursor: playing ? 'pointer' : 'default',
      }}
    >
      {/* Light pool. Always mounted so it can fade rather than pop. */}
      <div style={{
        position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%,-50%)',
        width: ringSize * 1.5, height: ringSize * 1.5, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,246,214,.5) 0%, rgba(255,236,180,.18) 46%, rgba(255,236,180,0) 70%)',
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
        ...(active && !reduced
          ? { animation: 'gk-halo 2200ms ease-in-out infinite' }
          : { transition: 'opacity 320ms ease' }),
      }} />

      {/*
        The countdown ring: a conic sweep masked into an annulus. The swept arc is the
        primary signal and the colour is the second, so it stays readable to someone who
        cannot separate green from amber.

        `remain` is computed from the same wall-clock deadline the reducer scores against,
        rather than from a CSS animation. An animation would drift whenever the tab is
        throttled, and the player would see a ring that disagrees with whether their tap
        counted.
      */}
      <div style={{
        position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%,-50%)',
        width: ringSize, height: ringSize, borderRadius: '50%',
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
        background: `conic-gradient(${ringCol} 0deg ${deg}deg, ${COLOURS.ringTrack} ${deg}deg 360deg)`,
        WebkitMask: 'radial-gradient(circle, transparent 0 60%, #000 61%)',
        mask: 'radial-gradient(circle, transparent 0 60%, #000 61%)',
        ...(active && !reduced
          ? { animation: `gk-ringin 260ms ${EASE} both` }
          : { transition: 'opacity 260ms ease' }),
      }} />

      <div style={{
        position: 'absolute', left: 0, bottom: 0, width: '100%', height: plant.hit,
        transformOrigin: '50% 100%', pointerEvents: 'none',
      }}>
        <img
          src={spriteUrl(plant.kind, plant.species, stage ?? 'seed')}
          alt=""
          draggable={false}
          style={{
            position: 'absolute', left: '50%', top: '100%',
            width: plant.size * 1.7, height: 'auto',
            transform: 'translate(-50%, -100%)',
            transformOrigin: '50% 100%',
            filter,
            // Transient tap feedback outranks the stage animation: a wrong tap must be
            // felt immediately, not queued behind a growth tween.
            animation: reduced
              ? undefined
              : fx === 'shake'
                ? 'gk-shake 460ms ease both'
                : fx === 'watered'
                  ? 'gk-watered 620ms cubic-bezier(.22,.61,.36,1) both'
                  : stage === 'sprouted'
                    ? 'gk-sprout 420ms cubic-bezier(.22,.61,.36,1) both'
                    : stage === 'dried'
                      ? 'gk-droop 500ms ease both'
                      : undefined,
          }}
        />
      </div>
    </div>
  );
}

// ─── Intro card ───────────────────────────────────────────────────────────────

function LegendRow({ src, ringed, text, colour }: {
  src: string; ringed?: boolean; text: string; colour: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 8px' }}>
      <div style={{
        position: 'relative', width: 72, height: 66, flex: '0 0 auto',
        borderRadius: ringed ? '50%' : undefined,
        boxShadow: ringed ? '0 0 0 4px #8FD65C, 0 0 0 12px rgba(143,214,92,.22)' : undefined,
      }}>
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            width: 66, height: 'auto',
          }}
        />
      </div>
      <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.28, textAlign: 'left', color: colour }}>
        {text}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GardenKeeper({ levelConfig, onLevelComplete, reducedMotion }: GardenKeeperProps) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const reduced = reducedMotion ?? prefersReduced;

  const params = useMemo<GardenKeeperDynamicParams>(
    () => ({ ...getGardenKeeperParams(0.35), ...(levelConfig.params as Partial<GardenKeeperDynamicParams>) }),
    [levelConfig.params],
  );

  // One round per mount: the bed is built once and never changes during play.
  const [plants] = useState<Plant[]>(() => buildBed(params));
  const [state, dispatch] = useReducer(roundReducer, params, initialRoundState);
  const [effects, setEffects] = useState<Effect[]>([]);
  /**
   * Wall-clock read, refreshed by the same 100ms ticker that advances the round.
   *
   * The rings need a live `now` to compute how much of each window is left. Reading
   * Date.now() during render would be impure and would not re-render on its own, so the
   * ticker pushes it into state instead.
   */
  const [now, setNow] = useState(0);
  /** Transient per-plant tap feedback, keyed by plant id. */
  const [plantFx, setPlantFx] = useState<Record<string, 'shake' | 'watered' | undefined>>({});

  const spriteUrls = useMemo(() => spriteUrlsFor(plants), [plants]);
  const imagesReady = useImagesReady(spriteUrls);

  /** Only real flowers cycle; wilted distractors are permanent scenery. */
  const flowerIds = useMemo(() => plants.filter((p) => p.kind === 'flower').map((p) => p.id), [plants]);

  const tickRef = useRef<number | null>(null);
  const spawnRef = useRef<number | null>(null);
  /** The one-shot that delays the first sprout before the steady interval takes over. */
  const kickRef = useRef<number | null>(null);
  const endRef = useRef<number | null>(null);
  const fxRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const reported = useRef(false);

  // Timer callbacks fire seconds later and would otherwise close over stale state.
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const stopAll = useCallback(() => {
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    if (spawnRef.current !== null) window.clearInterval(spawnRef.current);
    if (kickRef.current !== null) window.clearTimeout(kickRef.current);
    if (endRef.current !== null) window.clearTimeout(endRef.current);
    tickRef.current = spawnRef.current = kickRef.current = endRef.current = null;
    fxRef.current.forEach(window.clearTimeout);
    fxRef.current = [];
  }, []);

  useEffect(() => stopAll, [stopAll]);

  const pushEffect = useCallback((effect: Effect, lifeMs: number) => {
    setEffects((prev) => [...prev, effect]);
    const id = window.setTimeout(() => {
      // Reap by identity: filtering by id lets a stale reaper delete a live effect.
      setEffects((prev) => prev.filter((e) => e !== effect));
    }, lifeMs + 120);
    fxRef.current.push(id);
  }, []);

  const flashPlant = useCallback((id: string, kind: 'shake' | 'watered', ms: number) => {
    setPlantFx((prev) => ({ ...prev, [id]: kind }));
    const timer = window.setTimeout(() => {
      setPlantFx((prev) => (prev[id] === kind ? { ...prev, [id]: undefined } : prev));
    }, ms);
    fxRef.current.push(timer);
  }, []);

  const finish = useCallback((outcome: Outcome) => {
    if (stateRef.current.phase !== 'playing') return;
    stopAll();
    dispatch({ type: 'finish', now: Date.now(), outcome });
  }, [stopAll]);

  /**
   * Bring one dormant plant up, if the bed is below its concurrency ceiling.
   *
   * The plan had this reschedule itself with a fresh setTimeout on every fire. The
   * interval is fixed for the whole round, so a plain interval is equivalent, and it
   * avoids a callback that closes over its own identity - which React's lint rule
   * correctly rejects, because such a loop keeps calling whichever version it captured
   * first and stops seeing later values.
   */
  const spawnOnce = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== 'playing') return;
    const id = pickSproutId(s.cycles, params.maxConcurrentThirsty);
    if (id) dispatch({ type: 'sprout', now: Date.now(), id, thirstWindowMs: params.thirstWindowMs });
  }, [params.maxConcurrentThirsty, params.thirstWindowMs]);

  const handleStart = useCallback(() => {
    stopAll();
    const startedAt = Date.now();
    // Stamped here, not at mount, so time spent reading the intro card is not scored as play.
    startedAtRef.current = startedAt;
    dispatch({ type: 'start', now: startedAt, plantIds: flowerIds, params });
    // Round end runs on its own deadline timer, never on the display ticker.
    endRef.current = window.setTimeout(() => finish('time'), params.roundDurationMs);
    setNow(startedAt);
    tickRef.current = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: 'tick', now: t });
    }, 100);
    // First sprout after 900ms, then on a steady interval for the rest of the round.
    kickRef.current = window.setTimeout(() => {
      spawnOnce();
      spawnRef.current = window.setInterval(spawnOnce, params.spawnIntervalMs);
    }, 900);
  }, [flowerIds, params, stopAll, finish, spawnOnce]);

  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      // The ticker was throttled while hidden: re-sync the clock and forgive any window
      // that opened and closed offscreen. The player never saw it, so it must not be
      // scored against them.
      dispatch({ type: 'resume', now: Date.now() });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleTap = useCallback((plant: Plant) => {
    const s = stateRef.current;
    if (s.phase !== 'playing') return;
    const c = s.cycles[plant.id];

    // No cycle at all means a wilted distractor: it never sprouts and never may be watered.
    if (plant.kind === 'wilted' || !c) {
      flashPlant(plant.id, 'shake', 460);
      pushEffect({
        id: nextFxId(), kind: 'toast', x: plant.x, y: plant.y - plant.size * 0.5,
        text: t('gk.toast.notThis', 'Not this one'), colour: '#FFD9D2',
      }, 900);
      dispatch({ type: 'falseTap' });
      if (s.lives - 1 <= 0) window.setTimeout(() => finish('hearts'), 460);
      return;
    }

    if (c.stage === 'sprouted') {
      flashPlant(plant.id, 'watered', 620);
      const x = plant.x;
      const y = plant.y - plant.size * 0.4;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI * 2 * i) / 10 + rnd(-0.3, 0.3);
        pushEffect({
          id: nextFxId(), kind: 'drop', x, y,
          dx: Math.cos(a) * rnd(44, 78),
          dy: Math.sin(a) * rnd(32, 58) + 12,
          delay: Math.round(rnd(0, 90)),
        }, 760);
      }
      dispatch({ type: 'water', now: Date.now(), id: plant.id });
      if (s.watered + 1 >= params.targetCount) window.setTimeout(() => finish('complete'), 620);
      return;
    }

    // A real flower that is simply not asking for water. No heart, just a nudge.
    pushEffect({
      id: nextFxId(), kind: 'toast', x: plant.x, y: plant.y - plant.size * 0.5,
      text: c.stage === 'dried'
        ? t('gk.toast.tooLate', 'Too late for this one')
        : t('gk.toast.notReady', 'Not ready yet'),
      colour: '#DCEBF7',
    }, 900);
  }, [pushEffect, flashPlant, t, finish, params.targetCount]);

  const handleNext = useCallback(() => {
    if (reported.current || !state.outcome) return;
    reported.current = true;
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
      completed: state.outcome === 'complete',
      metrics: buildMetrics(state, params) as unknown as Record<string, unknown>,
    });
  }, [state, params, onLevelComplete, levelConfig.id]);

  if (!imagesReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-h3 text-caption-text">{t('gk.loading', 'Growing the garden...')}</p>
      </div>
    );
  }

  return (
    // The canvas is transformed, so it no longer contributes its scaled height to
    // layout. The spacer reserves it, or the game overlaps whatever GameShell renders
    // below it.
    <div style={{ containerType: 'inline-size', width: '100%' }}>
      <GardenKeeperStyles />
      <div style={{ position: 'relative', width: '100%', height: `calc(100cqw * ${CANVAS_H} / ${CANVAS_W})` }}>
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: CANVAS_W, height: CANVAS_H,
            transform: `scale(calc(100cqw / ${CANVAS_W}))`,
            transformOrigin: 'top left',
            fontFamily: "'Baloo 2', sans-serif",
            userSelect: 'none',
          }}
        >
          <Hud state={state} params={params} t={t} />

          <div style={{ position: 'relative', width: CANVAS_W, height: BOARD_H, overflow: 'hidden' }}>
            <Backdrop />

            {plants.map((plant) => {
              const c = state.cycles[plant.id];
              const active = c?.stage === 'sprouted';
              // Same wall-clock deadline the reducer scores against, so the ring can
              // never disagree with whether a tap landed in time.
              const remain = active && c.until !== null
                ? (c.until - now) / params.thirstWindowMs
                : 0;
              return (
                <PlantView
                  key={plant.id}
                  plant={plant}
                  stage={c?.stage ?? null}
                  active={active}
                  remain={remain}
                  fx={plantFx[plant.id]}
                  reduced={reduced}
                  playing={state.phase === 'playing'}
                  onTap={handleTap}
                />
              );
            })}

            {effects.map((e) => (e.kind === 'drop' ? (
              <div
                key={e.id}
                style={{
                  position: 'absolute', left: e.x, top: e.y, zIndex: 30, pointerEvents: 'none',
                  width: 13, height: 16, background: '#7FC7F0',
                  borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
                  // Units live on the values; the keyframe's calc() consumes them as-is.
                  ['--dx' as string]: `${e.dx}px`,
                  ['--dy' as string]: `${e.dy}px`,
                  animation: reduced
                    ? `gk-fade 420ms ease ${e.delay}ms both`
                    : `gk-splash 760ms ${EASE_OUT} ${e.delay}ms both`,
                }}
              />
            ) : (
              <div
                key={e.id}
                style={{
                  position: 'absolute', left: e.x, top: e.y, zIndex: 30, pointerEvents: 'none',
                  transform: 'translate(-50%, 0)',
                  padding: '8px 20px', borderRadius: 14, background: 'rgba(14,36,60,.92)',
                  fontSize: 24, fontWeight: 700, color: e.colour,
                  // No whiteSpace: nowrap. The prototype has it, and Hindi and Kannada
                  // would run straight off the board.
                  maxWidth: 520, textWrap: 'balance',
                  animation: reduced
                    ? `gk-rise-ro 900ms ease-out both`
                    : `gk-rise 900ms ease-out both`,
                }}
              >
                {e.text}
              </div>
            )))}

            {state.phase === 'done' && (
              <>
                <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(14,36,60,.62)' }} />
                <div style={{
                  position: 'absolute', left: '50%', top: '50%', zIndex: 10,
                  transform: 'translate(-50%,-50%)',
                  width: 620, padding: '44px 44px 40px', boxSizing: 'border-box',
                  borderRadius: 28, background: COLOURS.cardSurface,
                  boxShadow: '0 18px 0 rgba(20,48,79,.18)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
                  textAlign: 'center',
                  animation: reduced ? 'gk-fade 220ms ease both' : `gk-cardin 260ms ${EASE} both`,
                }}>
                  <h2 style={{
                    fontSize: 46, fontWeight: 800, margin: 0, lineHeight: 1.2,
                    color: state.outcome === 'complete' ? COLOURS.success : COLOURS.cardHeading,
                  }}>
                    {state.outcome === 'complete'
                      ? t('gk.roundComplete', 'Garden watered')
                      : state.outcome === 'hearts'
                        ? t('gk.outOfHearts', "Let's try again")
                        : t('gk.timeUp', "Time's up")}
                  </h2>

                  <p style={{ fontSize: 29, fontWeight: 600, color: COLOURS.ink, lineHeight: 1.35, margin: 0 }}>
                    {t('gk.summary', '{{watered}} of {{target}} flowers watered. {{dried}} wilted.', {
                      watered: state.watered, target: params.targetCount, dried: state.driedUp,
                    })}
                  </p>

                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      minHeight: 84, padding: '0 56px', borderRadius: 20,
                      background: COLOURS.buttonGreen,
                      border: 'none',
                      borderBottom: `7px solid ${COLOURS.buttonGreenEdge}`,
                      fontFamily: "'Baloo 2', sans-serif",
                      fontSize: 31, fontWeight: 800, color: '#FFFFFF', letterSpacing: '.03em',
                      cursor: 'pointer',
                    }}
                  >
                    {t('gk.next', 'Next round')}
                  </button>
                </div>
              </>
            )}

            {state.phase === 'intro' && (
              <>
                <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(14,36,60,.62)' }} />
                <div style={{
                  position: 'absolute', left: '50%', top: '50%', zIndex: 10,
                  transform: 'translate(-50%,-50%)',
                  width: 620, padding: '44px 44px 40px', boxSizing: 'border-box',
                  borderRadius: 28, background: COLOURS.cardSurface,
                  boxShadow: '0 18px 0 rgba(20,48,79,.18)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
                  textAlign: 'center',
                  animation: reduced ? 'gk-fade 220ms ease both' : `gk-cardin 260ms ${EASE} both`,
                }}>
                  <h2 style={{
                    fontSize: 40, fontWeight: 800, color: COLOURS.cardHeading, lineHeight: 1.2, margin: 0,
                  }}>
                    {t('gk.instruction', 'Water each flower once it blooms')}
                  </h2>

                  <div>
                    <LegendRow
                      src={SPROUT_URL}
                      text={t('gk.legend.seed', 'A sprout. Leave it be')}
                      colour={COLOURS.legendBrown}
                    />
                    <LegendRow
                      src={bloomUrl('daisy')}
                      ringed
                      text={t('gk.legend.sprouted', 'In bloom, ring closing. Water it now')}
                      colour={COLOURS.legendBlue}
                    />
                    <LegendRow
                      src={wiltedUrl('daisy')}
                      text={t('gk.legend.dried', 'Left too long, it wilts')}
                      colour={COLOURS.legendBrown}
                    />
                    <LegendRow
                      src={wiltedUrl('rose')}
                      text={t('gk.legend.avoid', 'Never water a flower that has already wilted')}
                      colour={COLOURS.warning}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleStart}
                    style={{
                      minHeight: 84, padding: '0 56px', borderRadius: 20,
                      background: COLOURS.buttonGreen,
                      border: 'none',
                      borderBottom: `7px solid ${COLOURS.buttonGreenEdge}`,
                      fontFamily: "'Baloo 2', sans-serif",
                      fontSize: 31, fontWeight: 800, color: '#FFFFFF', letterSpacing: '.03em',
                      cursor: 'pointer',
                    }}
                  >
                    {t('gk.start', 'Start')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
