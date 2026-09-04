import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { useStageScale } from '../../../hooks/useStageFit';

import Blind from './Blind';
import CartStrip from './CartStrip';
import Crate from './Crate';
import ListCard from './ListCard';
import Scene from './Scene';
import { EffectView } from './effects';
import { lifetime, makeConfetti, makeToast, type Effect } from './effectModel';
import {
  BOARD_H, BOARD_W, CANVAS_H, CANVAS_W, CAPTION, HINT_BTN, HUD_H, READY_BTN,
} from './geometry';
import { BY_ID, type Item } from './items';
import { COLOURS } from './palette';
import { buildRound, scoreRound, type RoundScore } from './round';
import { PRELOAD, UI_READY } from './sprites';
import { EASE_SETTLE, MarketMemoryStyles } from './styles';

// ─── Timings ──────────────────────────────────────────────────────────────────

const BLIND_MS = 540;
/** The cover must land before the list blanks, or the player watches the rows vanish. */
const ARM_MS = 40;
/** How long the clipboard takes to clear the board once the cover is up. */
const LEAVE_MS = 400;
const DOT_TICK_MS = 120;
const HINT_MS = 3000;

// ─── Params ───────────────────────────────────────────────────────────────────

interface MarketMemoryParams {
  listLength: number;
  retentionMs: number;
  similarPackaging: boolean;
  delayedRetrieval: boolean;
  listCategory: boolean;
  lives: number;
  hints: number;
}

const DEFAULT_PARAMS: MarketMemoryParams = {
  listLength: 4,
  retentionMs: 1500,
  similarPackaging: true,
  delayedRetrieval: false,
  listCategory: false,
  lives: 3,
  hints: 2,
};

/**
 * `encoding` is at home and ends only when the player presses READY. `covering`,
 * `travel` and `revealing` are the walk to the shop: the cover falls, the background
 * changes underneath it, and it lifts again on a blank list. Everything from `shopping`
 * on happens in the store.
 */
type Phase = 'encoding' | 'covering' | 'travel' | 'revealing' | 'shopping' | 'roundEnd' | 'outOfHearts';

interface MarketMemoryProps {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

export default function MarketMemory({ levelConfig, onLevelComplete }: MarketMemoryProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const params = useMemo<MarketMemoryParams>(
    () => ({ ...DEFAULT_PARAMS, ...(levelConfig.params as unknown as Partial<MarketMemoryParams>) }),
    [levelConfig.params],
  );

  /**
   * Frozen in a lazy initialiser. A re-render must never reshuffle the round underneath
   * the player.
   */
  const [round] = useState(() => buildRound({
    listLength: params.listLength,
    similarPackaging: params.similarPackaging,
    listCategory: params.listCategory,
  }));

  const [phase, setPhase] = useState<Phase>('encoding');
  const [picked, setPicked] = useState<string[]>([]);
  const [covered, setCovered] = useState(false);
  const [blindDown, setBlindDown] = useState(false);
  const [inStore, setInStore] = useState(false);
  const [listLeaving, setListLeaving] = useState(false);
  const [retentionPct, setRetentionPct] = useState(0);
  const [lives, setLives] = useState(params.lives);
  const [hintsLeft, setHintsLeft] = useState(params.hints);
  const [peek, setPeek] = useState<string | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [result, setResult] = useState<RoundScore | null>(null);

  // Refs, so a callback fired seconds later never reads a stale closure.
  const phaseTimer = useRef<number | null>(null);
  const dotTimer = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);
  const reapTimers = useRef<number[]>([]);
  const pickedRef = useRef<string[]>([]);
  const committedRef = useRef(false);
  const mountedAt = useRef(0);
  const shoppingAt = useRef(0);
  const firstPickAt = useRef(0);
  const studyMs = useRef(0);
  const hintsUsedRef = useRef(0);
  const pickOrderRef = useRef<string[]>([]);

  useEffect(() => { pickedRef.current = picked; }, [picked]);

  // Stamped in an effect rather than in the useRef initialiser: Date.now() during render
  // is impure and unstable across re-renders. Same pattern as Train Yard.
  useEffect(() => { mountedAt.current = Date.now(); }, []);

  // The store backdrop and the DONE button are needed the moment the cover comes down.
  // Warming them during encoding means the change of place is never a blank frame.
  useEffect(() => {
    PRELOAD.forEach((src) => { const img = new Image(); img.src = src; });
  }, []);

  /**
   * Kills both the pending phase timeout and the retention dot interval. Missing either
   * leaves an old timer to fire a stale transition mid-round.
   */
  const clearPhaseTimer = useCallback(() => {
    if (phaseTimer.current !== null) { window.clearTimeout(phaseTimer.current); phaseTimer.current = null; }
    if (dotTimer.current !== null) { window.clearInterval(dotTimer.current); dotTimer.current = null; }
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    clearPhaseTimer();
    phaseTimer.current = window.setTimeout(fn, ms);
  }, [clearPhaseTimer]);

  useEffect(() => () => {
    clearPhaseTimer();
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    reapTimers.current.forEach((id) => window.clearTimeout(id));
  }, [clearPhaseTimer]);

  const pushEffects = useCallback((fx: Effect[]) => {
    setEffects((prev) => [...prev, ...fx]);
    fx.forEach((f) => {
      const id = window.setTimeout(() => {
        // Reap by object identity. Filtering by id lets a stale reaper delete a live effect.
        setEffects((prev) => prev.filter((e) => e !== f));
      }, lifetime(f));
      reapTimers.current.push(id);
    });
  }, []);

  // ─── Phase schedule ─────────────────────────────────────────────────────────
  //
  // Every transition runs on a setTimeout against a deadline, never on a display ticker.
  // A ticker-driven machine deadlocks on a backgrounded tab.

  /** Leaves `encoding`. The only exit: there is no countdown on the list any more. */
  const handleReady = useCallback(() => {
    if (phase !== 'encoding') return;
    studyMs.current = Date.now() - mountedAt.current;
    setBlindDown(true);
    setPhase('covering');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'covering') return;
    // Blank the list and start the walk only once the cover has landed.
    later(() => {
      setCovered(true);
      setInStore(true);
      setPhase('travel');
    }, BLIND_MS + ARM_MS);
  }, [phase, later]);

  useEffect(() => {
    if (phase !== 'travel') return;

    const holdStart = Date.now();
    dotTimer.current = window.setInterval(() => {
      setRetentionPct(Math.max(0, Math.min(1, (Date.now() - holdStart) / params.retentionMs)));
    }, DOT_TICK_MS);

    phaseTimer.current = window.setTimeout(() => {
      if (dotTimer.current !== null) { window.clearInterval(dotTimer.current); dotTimer.current = null; }
      setRetentionPct(1);
      setBlindDown(false);
      setPhase('revealing');
    }, params.retentionMs);
  }, [phase, params.retentionMs]);

  useEffect(() => {
    if (phase !== 'revealing') return;
    // The cover lifts on the blank list, and only then does the clipboard clear the board.
    const leaveId = window.setTimeout(() => setListLeaving(true), BLIND_MS);
    reapTimers.current.push(leaveId);

    later(() => {
      shoppingAt.current = Date.now();
      setPhase('shopping');
    }, BLIND_MS + LEAVE_MS);
  }, [phase, later]);

  // ─── Interaction ────────────────────────────────────────────────────────────

  const handleCrateTap = useCallback((index: number, x: number, y: number) => {
    if (phase !== 'shopping') return;
    const id = round.crates[index];

    if (pickedRef.current.includes(id)) {
      setPicked((prev) => prev.filter((p) => p !== id));
      return;
    }
    if (pickedRef.current.length >= round.list.length) {
      pushEffects([makeToast(x, y, t('mm.basketFull', 'Cart full'))]);
      return;
    }
    if (firstPickAt.current === 0) firstPickAt.current = Date.now();
    pickOrderRef.current.push(id);
    setPicked((prev) => [...prev, id]);
  }, [phase, round, pushEffects, t]);

  const handleRemove = useCallback((slot: number) => {
    if (phase !== 'shopping') return;
    setPicked((prev) => prev.filter((_, i) => i !== slot));
  }, [phase]);

  const handleHint = useCallback(() => {
    if (phase !== 'shopping' || hintsLeft <= 0) return;
    const remaining = round.list.filter((id) => !pickedRef.current.includes(id));
    if (remaining.length === 0) return;

    hintsUsedRef.current += 1;
    setHintsLeft((h) => h - 1);
    setPeek(remaining[Math.floor(Math.random() * remaining.length)]);

    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setPeek(null), HINT_MS);
  }, [phase, hintsLeft, round.list]);

  const handleSubmit = useCallback(() => {
    if (phase !== 'shopping' || picked.length === 0) return;
    clearPhaseTimer();

    const score = scoreRound(round.list, picked);
    setResult(score);

    if (score.correct.length > 0) pushEffects(makeConfetti(400, 1000));

    const remaining = lives - score.livesLost;
    setLives(Math.max(0, remaining));
    setPhase(remaining <= 0 ? 'outOfHearts' : 'roundEnd');
  }, [phase, picked, round.list, lives, clearPhaseTimer, pushEffects]);

  const commit = useCallback((completed: boolean) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const score = result ?? scoreRound(round.list, picked);
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.round((Date.now() - mountedAt.current) / 1000),
      completed,
      metrics: {
        correct: score.correct.length,
        wrong: score.wrong.length,
        missed: score.missed.length,
        listLength: round.list.length,
        hintsUsed: hintsUsedRef.current,
        studyMs: studyMs.current,
        timeToFirstPickMs: firstPickAt.current ? firstPickAt.current - shoppingAt.current : null,
        timeToSubmitMs: Date.now() - shoppingAt.current,
        pickOrder: [...pickOrderRef.current],
      },
    });
  }, [result, round.list, picked, levelConfig.id, onLevelComplete]);

  // ─── Presentation ───────────────────────────────────────────────────────────

  // The board is measured against the play box GameShell hands us, not against the
  // viewport minus a guess at the chrome. See hooks/useStageFit.ts.
  const [stageRef, stage] = useStageScale(CANVAS_W, CANVAS_H);

  const listItems: Item[] = round.list.map((id) => BY_ID[id]);
  const slots: (Item | null)[] = Array.from({ length: round.list.length }, (_, i) =>
    picked[i] ? BY_ID[picked[i]] : null);

  const caption =
    phase === 'encoding' ? t('mm.caption.encoding', 'Remember the items on the list.')
      : phase === 'covering' || phase === 'travel' ? t('mm.caption.travel', 'Off to the shop!')
        : phase === 'revealing' ? t('mm.caption.revealing', 'The list is gone now.')
          : t('mm.caption.shopping', 'Find and collect only those items, then press DONE.');

  // The clipboard's exit animation runs inside `revealing`, so unmounting on `shopping`
  // lets it finish rather than cutting it short.
  const showList = phase === 'encoding' || phase === 'covering' || phase === 'travel' || phase === 'revealing';
  // The tray would otherwise sit on top of the clipboard through the walk to the shop.
  const showCart = phase === 'shopping' || phase === 'roundEnd' || phase === 'outOfHearts';
  const hintLive = phase === 'shopping' && hintsLeft > 0;
  const card = phase === 'roundEnd' || phase === 'outOfHearts' ? phase : null;

  return (
    <div
      ref={stageRef}
      className="w-full h-full overflow-hidden"
      style={{
        // Flex centring, not `margin: 0 auto`: the canvas is 800 design px and the
        // viewport is routinely narrower, and auto margins collapse to zero once the
        // child overflows, which parks the board off to the right. Flex still centres.
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      }}
    >
      <MarketMemoryStyles />
      <div data-board style={{
        width: CANVAS_W, height: CANVAS_H, flex: '0 0 auto',
        transform: `scale(${stage.scale})`, transformOrigin: 'top center',
        position: 'relative', fontFamily: "'Baloo 2', sans-serif", userSelect: 'none',
      }}>
        {/* Board */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: BOARD_W, height: BOARD_H, overflow: 'hidden' }}>
          <Scene inStore={inStore} reduced={reduced} />

          {/* HUD, painted over the backdrop rather than in a band above it. */}
          {/* Centred, not left-aligned: GameShell floats the level badge over the board's
              top-left corner and the exit over its top-right, and anything parked at
              either end of this bar sits under one of them. */}
          <div style={{
            position: 'absolute', left: 0, top: 0, width: BOARD_W, height: HUD_H, zIndex: 7,
            background: `linear-gradient(180deg, ${COLOURS.navyHudTop} 0%, ${COLOURS.navyHudBot} 100%)`,
            borderBottom: `4px solid ${COLOURS.navyDeep}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            padding: '0 18px',
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{
                  fontSize: 34, lineHeight: 1,
                  opacity: i < lives ? 1 : 0.22,
                  filter: i < lives ? 'none' : 'grayscale(1)',
                  transition: 'opacity 300ms linear',
                }}>❤️</span>
              ))}
            </div>
            <span aria-live="polite" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.12em', color: COLOURS.navyLabel }}>
              {t('mm.hearts', 'HEARTS')}
            </span>
          </div>

          <div style={{
            position: 'absolute', left: CAPTION.left, top: CAPTION.top, width: CAPTION.width, zIndex: 6,
            background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`, borderRadius: 16,
            padding: '10px 16px', textAlign: 'center',
            fontSize: 27, fontWeight: 700, color: COLOURS.ink,
            transition: 'opacity 260ms ease',
          }}>
            {caption}
          </div>

          <button
            type="button"
            onClick={handleHint}
            disabled={!hintLive}
            style={{
              position: 'absolute', right: HINT_BTN.right, top: HINT_BTN.top,
              width: HINT_BTN.width, height: HINT_BTN.height, zIndex: 7,
              background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`,
              borderRadius: 16, boxSizing: 'border-box',
              fontFamily: "'Baloo 2', sans-serif",
              fontSize: 24, fontWeight: 800, color: COLOURS.inkSign,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              opacity: hintLive ? 1 : 0.5,
              cursor: hintLive ? 'pointer' : 'default',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 32, lineHeight: 1 }}>💡</span>
            {t('mm.hint', 'HINT')}
            <span style={{
              position: 'absolute', right: -10, top: -10, width: 36, height: 36, borderRadius: '50%',
              background: COLOURS.greenBadge, border: '3px solid #FFFFFF', boxSizing: 'border-box',
              color: '#FFFFFF', fontSize: 20, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {hintsLeft}
            </span>
          </button>

          {/*
            The shelf is scenery as much as it is UI, so it appears with the store and
            stays. Interaction is gated separately: handleCrateTap returns early outside
            `shopping`.
          */}
          {inStore && round.crates.map((id, i) => (
            <Crate
              key={id}
              item={BY_ID[id]}
              index={i}
              picked={picked.includes(id)}
              hinted={peek === id}
              interactive={phase === 'shopping'}
              reduced={reduced}
              onTap={handleCrateTap}
            />
          ))}

          {showList && (
            <ListCard items={listItems} covered={covered} leaving={listLeaving} reduced={reduced} />
          )}

          <Blind
            down={blindDown}
            progress={retentionPct}
            label={t('mm.listCovered', 'ON THE WAY TO THE SHOP')}
            reduced={reduced}
          />

          {phase === 'encoding' && (
            <button
              type="button"
              onClick={handleReady}
              aria-label={t('mm.ready', 'READY')}
              style={{
                position: 'absolute',
                left: READY_BTN.left, top: READY_BTN.top,
                width: READY_BTN.width, height: READY_BTN.height,
                zIndex: 7, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
              }}
            >
              <img
                src={UI_READY}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </button>
          )}

          {showCart && (
            <CartStrip
              slots={slots}
              listLength={round.list.length}
              submitEnabled={phase === 'shopping' && picked.length > 0}
              cartLabel={t('mm.myCart', 'MY CART')}
              submitLabel={t('mm.submit', 'DONE')}
              reduced={reduced}
              onRemove={handleRemove}
              onSubmit={handleSubmit}
            />
          )}

          {effects.map((e) => <EffectView key={e.id} effect={e} reduced={reduced} />)}

          {card && result && (
            <>
              <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(11,44,56,.55)' }} />
              <div style={{
                position: 'absolute', left: '50%', top: '50%', zIndex: 10, width: 600,
                background: COLOURS.creamLight, border: `5px solid ${COLOURS.creamBorder}`, borderRadius: 22,
                padding: '32px 28px', textAlign: 'center',
                animation: `mm-cardin 260ms ${EASE_SETTLE} both`,
              }}>
                <div style={{
                  fontSize: 46, fontWeight: 800,
                  color: card === 'outOfHearts'
                    ? COLOURS.redDeep
                    : result.perfect ? COLOURS.greenResult : COLOURS.purple,
                }}>
                  {card === 'outOfHearts'
                    ? t('mm.gameOver', 'Market closed')
                    : result.perfect
                      ? t('mm.perfect', 'Whole list, exactly right')
                      : t('mm.checked', 'Cart checked')}
                </div>
                <p style={{ fontSize: 27, fontWeight: 500, color: COLOURS.inkSoft, margin: '16px 0 24px' }}>
                  {t('mm.summary', '{{correct}} of {{total}} right, {{wrong}} not on the list, {{missed}} missed.', {
                    correct: result.correct.length,
                    total: round.list.length,
                    wrong: result.wrong.length,
                    missed: result.missed.length,
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => commit(card === 'roundEnd')}
                  style={{
                    background: COLOURS.green, border: 'none', borderBottom: `7px solid ${COLOURS.greenEdge}`,
                    borderRadius: 16, padding: '14px 40px',
                    fontFamily: "'Baloo 2', sans-serif", fontSize: 34, fontWeight: 800, color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {card === 'roundEnd' ? t('mm.next', 'Next round') : t('mm.retry', 'Try again')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
