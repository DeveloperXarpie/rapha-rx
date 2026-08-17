import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useImagesReady } from '../../../lib/useImagesReady';
import { useReducedMotion } from '../../../lib/useReducedMotion';

import {
  BUBBLE_BOTTOM_Y, BUBBLE_ITEM_GAP, BUBBLE_ITEM_H, BUBBLE_ITEM_W, bubbleCentreX, bubbleWidth,
  CANVAS_H, CANVAS_W, CARD_BTN_H, CARD_BTN_Y, CARD_IMG_H, CARD_IMG_Y, CARD_NAME_H,
  CARD_NAME_Y, CARD_W, cardX, COOK_BAR_H, COOK_BAR_W, FACE_BOTTOM_Y, FACE_H, FACE_TOP_Y,
  faceCentreX, GUEST_CAPSULE_W, GUEST_DIAL, HUD_LEFT_X, HUD_RIGHT_X, HUD_Y, PATIENCE_BAR_H,
  patienceBarWidth, SCORE_CAPSULE_H, SCORE_CAPSULE_W,
} from './geometry';
import {
  cookProgress, createInitialState, guestsHandled, spoilProgress, tapDish, tick, TOTAL_GUESTS,
  type GameState, type Guest,
} from './model';
import {
  ALL_SPRITE_URLS, BACKGROUND_SRC, BUBBLE_TAIL, CLEAR_BTN_SRC, COIN_SRC, DISH_BY_ID, DISH_DEFS,
  faceCrop, FRAMES, frameStyle,
} from './sprites';
import { Bar, type BarTint } from './Bar';
import { BUTTON_SKIN, COLOURS } from './palette';
import { ServeTheGuestsStyles } from './styles';

// ─── Params ───────────────────────────────────────────────────────────────────

export interface ServeGuestsParams {
  maxItemsPerGuest: number;
}

const DEFAULT_PARAMS: ServeGuestsParams = { maxItemsPerGuest: 2 };

/** The loop runs at 10Hz: fast enough for the bars to read as smooth, cheap enough to idle. */
const TICK_MS = 100;
/** A backgrounded tab can hand back a huge delta; clamp so nothing skips a whole state. */
const MAX_DT = 0.5;

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  /** Test/config override for the OS media query. */
  reducedMotion?: boolean;
}

export default function ServeTheGuests({ levelConfig, onLevelComplete, reducedMotion }: Props) {
  const { t } = useTranslation();

  const params: ServeGuestsParams = useMemo(
    () => ({ ...DEFAULT_PARAMS, ...(levelConfig.params as Partial<ServeGuestsParams>) }),
    [levelConfig.params],
  );

  const imagesReady = useImagesReady(ALL_SPRITE_URLS);
  const [state, setState] = useState<GameState>(createInitialState);

  const osReducedMotion = useReducedMotion();
  const reduced = reducedMotion ?? osReducedMotion;

  // ── Fit the fixed-size board into whatever space the shell gives us ─────────

  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const measure = () => {
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Width comes from the layout, but height cannot: GameShell's column is `min-h-full`,
      // so it sizes to its content, and our content is sized by `scale`. Measuring the
      // frame's own height would make scale depend on itself and collapse the board.
      // Measuring against the viewport breaks that circularity, as TrainYard does.
      const availH = Math.max(360, window.innerHeight - rect.top - 16);
      if (rect.width > 0) setScale(Math.min(rect.width / CANVAS_W, availH / CANVAS_H));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (frameRef.current) ro.observe(frameRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
    // Re-runs when the board mounts, since the frame does not exist during the preload.
  }, [imagesReady]);

  // ── Game loop ───────────────────────────────────────────────────────────────

  const lastTick = useRef(0);

  useEffect(() => {
    // The patience clock must not start behind an image decode, so the loop waits for the
    // sprites in the same way TrainYard's measured encoding window does.
    if (!imagesReady || state.done) return;
    lastTick.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(MAX_DT, (now - lastTick.current) / 1000);
      lastTick.current = now;
      setState((prev) => tick(prev, dt, params.maxItemsPerGuest));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [imagesReady, state.done, params.maxItemsPerGuest]);

  const handleDishTap = useCallback((index: number) => {
    setState((prev) => tapDish(prev, index));
  }, []);

  // Only ever called from the completion overlay's button, so the `state` it closes over is
  // the finished round's.
  const finish = useCallback(() => {
    onLevelComplete({
      levelId: levelConfig.id,
      // The model's own clock, which excludes the sprite preload the loop waits on.
      durationSeconds: Math.round(state.t),
      completed: true,
      metrics: {
        itemsServed: state.itemsServed,
        itemsRequested: state.itemsRequested,
        guestsFullyServed: state.guestsFullyServed,
        dishesBurnt: state.dishesBurnt,
        walkouts: state.walkouts,
        score: state.score,
      },
    });
  }, [levelConfig.id, onLevelComplete, state]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const handled = guestsHandled(state);
  const guestsLeft = TOTAL_GUESTS - handled;

  if (!imagesReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <ServeTheGuestsStyles reduced={reduced} />
        <p className="text-h3 text-caption-text">
          {t('serveGuests.loading', 'Getting the counter ready…')}
        </p>
      </div>
    );
  }

  return (
    <div ref={frameRef} style={{ width: '100%', height: CANVAS_H * scale, overflow: 'hidden' }}>
      <ServeTheGuestsStyles reduced={reduced} />

      <div
        style={{
          position: 'relative',
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
          margin: '0 auto',
          overflow: 'hidden',
          borderRadius: 24,
        }}
      >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              backgroundImage: `url(${BACKGROUND_SRC})`,
              backgroundSize: `${CANVAS_W}px ${CANVAS_H}px`,
              fontFamily: "'Baloo 2', Inter, system-ui, sans-serif",
            }}
          >
            {state.seats.map((guest, seat) => (
              <SeatView key={seat} seat={seat} guest={guest} t={t} />
            ))}

            {state.dishes.map((dish, i) => (
              <DishCard
                key={dish.id}
                index={i}
                state={state}
                onTap={handleDishTap}
                reduced={reduced}
                t={t}
              />
            ))}

            {/* HUD: guests remaining on the left, score on the right */}
            <div
              style={{
                position: 'absolute', left: HUD_LEFT_X, top: HUD_Y,
                display: 'flex', alignItems: 'center',
              }}
            >
              <div
                style={{
                  position: 'relative', zIndex: 2, width: GUEST_DIAL, height: GUEST_DIAL,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%,#ffe9a8,#f4c23c)',
                  border: `7px solid ${COLOURS.goldBorder}`,
                  boxShadow: '0 5px 0 rgba(120,80,10,.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 74, height: 74, borderRadius: '50%', background: '#fffdf5',
                    border: '3px solid #c99a2f', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 42, fontWeight: 800,
                    color: COLOURS.woodDark, lineHeight: 1,
                  }}
                >
                  {guestsLeft}
                </div>
              </div>
              <div
                style={{
                  marginLeft: -22, width: GUEST_CAPSULE_W, height: 74, borderRadius: 37,
                  background: COLOURS.gold, border: `7px solid ${COLOURS.goldBorder}`,
                  boxSizing: 'border-box', padding: '8px 22px 8px 34px',
                  boxShadow: '0 5px 0 rgba(120,80,10,.3)', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', gap: 14,
                }}
              >
                <span
                  style={{
                    fontSize: 30, fontWeight: 800, color: COLOURS.woodMid,
                    letterSpacing: 1, whiteSpace: 'nowrap',
                  }}
                >
                  {t('serveGuests.guestsLeft', 'GUESTS LEFT')}
                </span>
                <span style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  {Array.from({ length: TOTAL_GUESTS }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        border: '3px solid #b07f14', boxSizing: 'border-box',
                        transition: 'background .3s',
                        background: i < handled
                          ? COLOURS.woodMid
                          : 'linear-gradient(180deg,#fff6dd,#ffe6a6)',
                      }}
                    />
                  ))}
                </span>
              </div>
            </div>

            <div
              style={{
                position: 'absolute', right: HUD_RIGHT_X, top: HUD_Y,
                display: 'flex', alignItems: 'center', gap: 18,
                minWidth: SCORE_CAPSULE_W, height: SCORE_CAPSULE_H, boxSizing: 'border-box',
                ...frameStyle(FRAMES.capsule),
              }}
            >
              <img src={COIN_SRC} alt="" style={{ width: 74, height: 74, flex: '0 0 auto' }} />
              <span
                style={{
                  flex: '1 1 auto', textAlign: 'center',
                  fontSize: 62, fontWeight: 800, color: COLOURS.woodDark,
                  lineHeight: 1, letterSpacing: 2,
                }}
              >
                {String(Math.min(999, state.score)).padStart(3, '0')}
              </span>
            </div>

            {state.done && (
              <div
                style={{
                  position: 'absolute', inset: 0, background: 'rgba(38,26,14,.72)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
                }}
              >
                <div
                  style={{
                    width: 860, background: 'linear-gradient(180deg,#fbf1de,#f0e0c6)',
                    border: `8px solid ${COLOURS.creamBorder}`, borderRadius: 40,
                    padding: '48px 56px', textAlign: 'center',
                    boxShadow: '0 18px 50px rgba(0,0,0,.4)',
                  }}
                >
                  <div style={{ fontSize: 72, fontWeight: 800, color: COLOURS.woodDark, lineHeight: 1.1 }}>
                    {t('serveGuests.complete.title', 'Well served!')}
                  </div>
                  <div style={{ fontSize: 34, color: '#6b5334', marginTop: 14, lineHeight: 1.3 }}>
                    {t('serveGuests.complete.sub', 'You looked after {{served}} of {{total}} guests.', {
                      served: state.guestsFullyServed,
                      total: TOTAL_GUESTS,
                    })}
                  </div>
                  <div style={{ fontSize: 34, color: '#6b5334', marginTop: 6, lineHeight: 1.3 }}>
                    {t('serveGuests.complete.score', 'Score: {{score}}', { score: state.score })}
                  </div>
                  <button
                    onClick={finish}
                    style={{
                      margin: '36px auto 0', width: 380, padding: '20px 0', borderRadius: 999,
                      background: 'linear-gradient(180deg,#7ed957,#4caf27)',
                      border: '4px solid #2f7d32', boxShadow: '0 6px 0 #2f7d32',
                      color: '#fff', fontSize: 38, fontWeight: 800, cursor: 'pointer',
                      textShadow: '0 2px 2px rgba(0,0,0,.25)', display: 'block',
                    }}
                  >
                    {t('btn.continue', 'Continue')}
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ─── Seat ─────────────────────────────────────────────────────────────────────

type Translate = ReturnType<typeof useTranslation>['t'];

function SeatView({ seat, guest, t }: { seat: number; guest: Guest | null; t: Translate }) {
  if (!guest) return null;

  const pct = Math.max(0, Math.min(1, guest.left / guest.patience));
  const patienceTint: BarTint = pct > 0.55 ? 'green' : pct > 0.28 ? 'amber' : 'red';

  const enter = guest.phase === 'in';
  const leaving = guest.phase === 'out';
  const happy = guest.phase === 'happy';

  const transform = enter
    ? 'translateY(30px)'
    : leaving
      ? 'translateY(26px) rotate(-4deg)'
      : happy
        ? 'translateY(-8px)'
        : 'none';

  const orderLabel = guest.items.map((it) => t(DISH_BY_ID[it.dishId].nameKey, DISH_BY_ID[it.dishId].nameEn)).join(', ');

  const face = faceCrop(guest.faceIndex, FACE_H);
  const bubbleW = bubbleWidth(guest.items.length);

  return (
    <div
      style={{
        position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H,
        pointerEvents: 'none',
        opacity: enter || leaving ? 0 : 1,
        transform,
        transition: 'opacity .5s, transform .5s',
      }}
    >
      {/* Guest */}
      <div
        role="img"
        aria-label={t('serveGuests.guestOrder', 'Guest waiting for {{order}}', { order: orderLabel })}
        style={{
          position: 'absolute',
          left: faceCentreX(seat) - face.width / 2,
          top: FACE_BOTTOM_Y - FACE_H,
          filter: 'drop-shadow(0 6px 10px rgba(60,40,10,.18))',
          ...face,
        }}
      />

      {/* Order bubble. The wrapper carries no border, so the tail can hang off its bottom
          edge without having to account for the frame's border width. */}
      <div
        style={{
          position: 'absolute',
          left: bubbleCentreX(seat) - bubbleW / 2,
          bottom: CANVAS_H - BUBBLE_BOTTOM_Y,
          width: bubbleW,
          zIndex: 5,
          filter: 'drop-shadow(0 6px 12px rgba(70,45,15,.22))',
        }}
      >
        <img
          src={BUBBLE_TAIL.src}
          alt=""
          style={{
            position: 'absolute', left: (bubbleW - BUBBLE_TAIL.w) / 2, top: '100%',
            width: BUBBLE_TAIL.w, height: BUBBLE_TAIL.h,
          }}
        />
        <div style={{ width: '100%', boxSizing: 'border-box', ...frameStyle(FRAMES.orderBubble) }}>
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: BUBBLE_ITEM_GAP,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          {guest.items.map((item, k) => {
            const def = DISH_BY_ID[item.dishId];
            return (
              <div
                key={k}
                style={{
                  position: 'relative', width: BUBBLE_ITEM_W, height: BUBBLE_ITEM_H,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <img
                  src={def.src}
                  alt=""
                  style={{
                    maxWidth: BUBBLE_ITEM_W, maxHeight: BUBBLE_ITEM_H, objectFit: 'contain',
                    transition: 'filter .2s',
                    filter: item.served ? 'grayscale(.75) opacity(.45)' : 'none',
                  }}
                />
                {item.served && (
                  <span
                    className="sg-pop"
                    style={{
                      position: 'absolute', width: 44, height: 44, borderRadius: '50%',
                      background: '#4caf27', border: '3px solid #fff',
                      boxShadow: '0 3px 6px rgba(0,0,0,.3)', color: '#fff', fontSize: 26,
                      fontWeight: 800, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Patience */}
        <div style={{ marginTop: 10 }}>
          <Bar value={pct} width={patienceBarWidth(guest.items.length)} height={PATIENCE_BAR_H} tint={patienceTint} />
        </div>
        </div>
      </div>

      {guest.float !== null && (
        <span
          className="sg-float"
          style={{
            position: 'absolute',
            // Over the guest's chest, not above their head - the bubble is up there now.
            left: faceCentreX(seat),
            top: FACE_TOP_Y + 110,
            fontSize: 48, fontWeight: 800, color: '#2f7d32',
            textShadow: '0 2px 0 #fff, 0 4px 8px rgba(0,0,0,.25)',
            zIndex: 9,
          }}
        >
          {guest.float}
        </span>
      )}
    </div>
  );
}

// ─── Dish card ────────────────────────────────────────────────────────────────

function DishCard({
  index, state, onTap, reduced, t,
}: {
  index: number;
  state: GameState;
  onTap: (index: number) => void;
  reduced: boolean;
  t: Translate;
}) {
  const dish = state.dishes[index];
  const def = DISH_DEFS[index];
  const name = t(def.nameKey, def.nameEn);
  const progress = cookProgress(state, dish);
  const nudging = dish.nudgeUntil > state.t;

  // Spoiling is carried by the art, not a filter: the mouldy plate fades in over the last
  // seconds of the ready window. Reduced motion snaps rather than fades.
  const spoil = reduced ? Math.round(spoilProgress(state, dish)) : spoilProgress(state, dish);

  // Idle and cooking are still read by colour as well as by label - washed out, saturating
  // as they go - because those are one dish progressing, not a different dish.
  const filter = dish.state === 'idle'
    ? 'saturate(.2) brightness(1.14) opacity(.5)'
    : dish.state === 'cooking'
      ? `saturate(${(0.2 + progress * 0.85).toFixed(3)}) brightness(${(1.14 - progress * 0.14).toFixed(3)}) opacity(${(0.5 + progress * 0.5).toFixed(3)})`
      : 'saturate(1.05)';

  const dishImg = {
    // Near the full card width: the widest plate is the combo at 215x142, and holding it
    // back to leave a generous margin was costing the narrow dishes nothing and this one a lot.
    maxWidth: CARD_W - 8,
    maxHeight: CARD_IMG_H,
    objectFit: 'contain' as const,
    transition: reduced ? 'filter .2s linear' : 'filter .2s linear, opacity .4s linear',
  };

  const label = dish.state === 'idle'
    ? t('serveGuests.prepare', 'PREPARE')
    : dish.state === 'cooking'
      ? t('serveGuests.cooking', 'COOKING')
      : dish.state === 'ready'
        ? t('serveGuests.ready', 'READY')
        : '✕';

  const ariaLabel = dish.state === 'idle'
    ? t('serveGuests.a11y.prepare', 'Prepare {{dish}}', { dish: name })
    : dish.state === 'cooking'
      ? t('serveGuests.a11y.cooking', '{{dish}} is cooking', { dish: name })
      : dish.state === 'ready'
        ? t('serveGuests.a11y.serve', 'Serve {{dish}}', { dish: name })
        : t('serveGuests.a11y.clear', 'Throw away the burnt {{dish}}', { dish: name });

  // Burnt has no capsule button - it gets the round ✕ below - so it has no skin entry.
  const skin = BUTTON_SKIN[dish.state] ?? BUTTON_SKIN.idle;

  return (
    <button
      type="button"
      onClick={() => onTap(index)}
      disabled={dish.state === 'cooking'}
      aria-label={ariaLabel}
      className={nudging ? 'sg-nudge' : undefined}
      style={{
        position: 'absolute',
        left: cardX(index),
        top: CARD_IMG_Y,
        width: CARD_W,
        height: CARD_BTN_Y + CARD_BTN_H - CARD_IMG_Y,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: dish.state === 'cooking' ? 'default' : 'pointer',
        userSelect: 'none',
        fontFamily: 'inherit',
      }}
    >
      {/* Dish */}
      <span
        style={{
          position: 'absolute', left: 0, top: 0, width: CARD_W, height: CARD_IMG_H,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Fresh and mouldy are stacked and cross-faded, so the dish visibly spoils while
            there is still time to serve it rather than only once it has burned. */}
        <img src={def.src} alt="" style={{ ...dishImg, filter, opacity: 1 - spoil }} />
        <img
          src={def.spoiledSrc}
          alt=""
          style={{ ...dishImg, position: 'absolute', filter, opacity: spoil }}
        />
        {dish.state === 'cooking' && (
          <span style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)' }}>
            <Bar value={progress} width={COOK_BAR_W} height={COOK_BAR_H} />
          </span>
        )}
      </span>

      {/* Name, or the WASTED marker once it has burned */}
      <span
        style={{
          position: 'absolute', left: 0, top: CARD_NAME_Y - CARD_IMG_Y,
          width: CARD_W, height: CARD_NAME_H,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, lineHeight: 1.05, textAlign: 'center',
          color: dish.state === 'burnt' ? COLOURS.wasted : COLOURS.woodDark,
        }}
      >
        {dish.state === 'burnt' ? t('serveGuests.wasted', 'WASTED') : name}
      </span>

      {/* Action */}
      <span
        style={dish.state === 'burnt'
          ? {
            position: 'absolute', left: '50%', top: CARD_BTN_Y - CARD_IMG_Y,
            transform: 'translateX(-50%)', width: 60, height: 60,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }
          : {
            position: 'absolute', left: '50%', top: CARD_BTN_Y - CARD_IMG_Y,
            transform: 'translateX(-50%)', minWidth: CARD_W - 46, padding: '7px 14px',
            borderRadius: 999, background: skin[0],
            border: '3px solid rgba(255,255,255,.75)', boxShadow: `0 4px 0 ${skin[1]}`,
            color: skin[2], fontSize: 22, fontWeight: 800, letterSpacing: 1,
            textAlign: 'center', boxSizing: 'border-box',
          }}
        className={dish.state === 'ready' ? 'sg-glow' : undefined}
      >
        {dish.state === 'burnt'
          ? <img src={CLEAR_BTN_SRC} alt="" style={{ width: '100%', height: '100%' }} />
          : label}
      </span>
    </button>
  );
}
