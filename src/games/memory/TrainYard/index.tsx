import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useImagesReady } from '../../../lib/useImagesReady';

import Blind from './Blind';
import Station from './Station';
import Train, { BACK_MS, RUN_MS, type TrainStatus } from './Train';
import TrackLayer from './TrackLayer';
import { EffectView, TickView } from './effects';
import { TICK_MS, lifetime, makeConfetti, nextFxId, type Effect, type Tick } from './effectModel';
import {
  BANNER, BOARD_H, BOARD_W, CANVAS_H, CANVAS_W, COL_X, HUD_H, MOUTH_Y, RESET_BTN, SCENERY,
} from './geometry';
import { STATION_NAME_FALLBACKS, STATION_NAME_KEYS, paletteFor, shuffled } from './palette';
import { ALL_SPRITE_URLS, BOARD_BACKGROUND, HEART, RESET_GLYPH, SCENERY_SPRITES } from './sprites';
import { COLOURS, EASE_SETTLE, TrainYardStyles } from './styles';

// ─── Timings ──────────────────────────────────────────────────────────────────

const BLIND_MS = 540;
/** The blind must land before the signs blank, or the player watches them pop to `?`. */
const ARM_MS = 40;
const ARRIVE_MS = RUN_MS + 60;
const SETTLE_MS = 700;
const RETURN_DELAY_MS = 380;
const DOT_TICK_MS = 120;

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

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    function measure() {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Width comes from the layout; height cannot, because this sits inside a flex column
      // that sizes to its content. Measuring against the viewport avoids that circularity.
      const availH = Math.max(360, window.innerHeight - rect.top - 16);
      setScale(Math.min(rect.width / CANVAS_W, availH / CANVAS_H));
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const selectedColour = selected !== null ? palette[trains[selected].c] : null;
  const caption = (() => {
    if (phase === 'encoding') return t('ty.caption.encoding', 'Learn the station names now - the signs go blank in a moment.');
    if (phase === 'retention') return t('ty.caption.retention', 'Hold them in mind...');
    if (phase === 'roundEnd') return t('ty.caption.roundEnd', 'Every train home. Well done.');
    if (phase === 'gameOver') return t('ty.caption.gameOver', 'Out of hearts - try that yard again.');
    if (selectedColour) {
      return t('ty.caption.selected', 'Where does the {{colour}} train go?', {
        colour: t(`ty.colour.${selectedColour.id}`, selectedColour.id),
      });
    }
    if (busy) return t('ty.caption.sending', 'On its way…');
    return t('ty.caption.dispatch', 'Tap the station this train belongs to.');
  })();
  const captionKey = `${phase}-${selected ?? 'none'}-${revealed.size}`;

  const showNames = phase === 'encoding' || (phase === 'retention' && !covered);
  const card = phase === 'roundEnd' || phase === 'gameOver' ? phase : null;

  if (!imagesReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-h3 text-caption-text">{t('ty.loading', 'Loading...')}</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ width: '100%', height: CANVAS_H * scale, overflow: 'hidden' }}>
      <TrainYardStyles />
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          margin: '0 auto',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          position: 'relative',
          fontFamily: "'Baloo 2', sans-serif",
          userSelect: 'none',
        }}
      >
        {/* HUD */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: HUD_H,
            background: 'linear-gradient(180deg, #2C5580 0%, #1E3E63 100%)',
            borderBottom: `4px solid ${COLOURS.navyDeep}`,
            display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <img
                key={i}
                src={HEART.src}
                alt=""
                draggable={false}
                style={{
                  width: 38,
                  height: 38 * (HEART.h / HEART.w),
                  opacity: i < lives ? 1 : 0.22,
                  filter: i < lives ? 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' : 'grayscale(1)',
                  transition: 'opacity 300ms linear, filter 300ms linear',
                }}
              />
            ))}
          </div>
          <span
            aria-live="polite"
            style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.12em', color: '#9FC0DE' }}
          >
            {t('ty.hearts', 'HEARTS')}
          </span>
        </div>

        {/* Board */}
        <div
          style={{
            position: 'absolute', left: 0, top: HUD_H, width: BOARD_W, height: BOARD_H,
            // The plate carries its own scenery; the gradient stays as the fallback colour
            // behind it while it decodes.
            background: `url(${BOARD_BACKGROUND.src}) center / 100% 100% no-repeat, linear-gradient(180deg, #85BE55 0%, #7CB74E 40%, #74AF48 100%)`,
            overflow: 'hidden',
          }}
        >
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
              reduced={reduced}
              onPick={() => pickTrain(tr.lane)}
            />
          ))}

          {effects.map((fx) => <EffectView key={`fx-${fx.id}`} fx={fx} reduced={reduced} />)}
          {tick && <TickView key={`tick-${tick.id}`} tick={tick} reduced={reduced} />}

          {/* Instruction banner */}
          <div
            style={{
              position: 'absolute', left: BANNER.left, top: BANNER.top, width: BANNER.width,
              zIndex: 7,
              background: COLOURS.cream,
              border: `3px solid ${COLOURS.creamBorder}`,
              borderBottomWidth: 6,
              borderRadius: 18,
              padding: '16px 20px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}
          >
            <div
              style={{
                width: 52, height: 52, flex: '0 0 52px', borderRadius: '50%',
                background: '#F0A8BE', border: '3px solid #D07C99',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}
              aria-hidden
            >
              🧠
            </div>
            <p
              key={captionKey}
              style={{
                fontSize: 25, fontWeight: 700, color: COLOURS.brownText, lineHeight: 1.28,
                textWrap: 'pretty',
                animation: reduced
                  ? 'ty-fade 300ms ease-out both'
                  : `ty-slidein 320ms ${EASE_SETTLE} both`,
              }}
            >
              {caption}
            </p>
          </div>

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
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 560, zIndex: 12,
                  background: COLOURS.cream,
                  border: `4px solid ${COLOURS.creamBorder}`,
                  borderBottomWidth: 9,
                  borderRadius: 26,
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
                <p style={{ fontSize: 27, fontWeight: 500, color: COLOURS.brownSoft, marginBottom: 28 }}>
                  {card === 'roundEnd'
                    ? t('ty.roundComplete.body', 'All four trains are home with {{count}} hearts left.', { count: Math.max(0, lives) })
                    : t('ty.outOfHearts.body', 'Have another go at this yard - the stations will be shown again.')}
                </p>
                <button
                  type="button"
                  onClick={() => commit(card === 'roundEnd', Date.now())}
                  style={{
                    minHeight: 72, padding: '0 40px', borderRadius: 18,
                    background: COLOURS.amber,
                    border: 'none', borderBottom: `6px solid ${COLOURS.amberEdge}`,
                    fontSize: 28, fontWeight: 700, color: '#4A3410', cursor: 'pointer',
                    fontFamily: "'Baloo 2', sans-serif",
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
