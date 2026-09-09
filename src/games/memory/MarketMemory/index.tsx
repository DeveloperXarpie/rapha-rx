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
import ResultCard from './ResultCard';
import Scene from './Scene';
import { EffectView } from './effects';
import { lifetime, makeConfetti, makeToast, type Effect } from './effectModel';
import {
  BOARD_H, BOARD_W, CANVAS_H, CANVAS_W, CAPTION, GROUND, HUD_H, READY_BTN, SAFE_X,
} from './geometry';
import { BY_ID, type Item } from './items';
import { COLOURS } from './palette';
import { buildRound, resultRows, scoreRound, type RoundScore } from './round';
import { PRELOAD, UI_READY } from './sprites';
import { BLIND_MS, MarketMemoryStyles } from './styles';

// ─── Timings ──────────────────────────────────────────────────────────────────

/*
 * BLIND_MS lives in styles.tsx, because Blind.tsx has to animate for exactly as long as
 * this schedule waits for it.
 *
 * The walk to the shop used to cost about 1.5s of animation on top of the retention
 * hold - a cover falling for 540ms, lifting for 540ms, and a clipboard sliding away for
 * another 400ms - all of it time the resident spent watching furniture move. The cover
 * is opaque and covers the whole board now, so none of that is visible and none of it is
 * worth paying for. What is left is the hold itself, which is the actual memory task.
 */
/** The cover must land before the list blanks, or the player watches the rows vanish. */
const ARM_MS = 40;
const DOT_TICK_MS = 120;
const HINT_MS = 3000;

// ─── Params ───────────────────────────────────────────────────────────────────

interface MarketMemoryParams {
  listLength: number;
  retentionMs: number;
  similarPackaging: boolean;
  delayedRetrieval: boolean;
  listCategory: boolean;
  hints: number;
}

const DEFAULT_PARAMS: MarketMemoryParams = {
  listLength: 4,
  retentionMs: 1500,
  similarPackaging: true,
  delayedRetrieval: false,
  listCategory: false,
  hints: 2,
};

/**
 * `encoding` is at home and ends only when the player presses READY. `covering`,
 * `travel` and `revealing` are the walk to the shop: the cover falls, the background
 * changes underneath it, and it lifts again on a blank list. Everything from `shopping`
 * on happens in the store.
 *
 * There is no losing phase. Hearts are gone, so DONE is the only way a round ends and
 * `roundEnd` is the only place it can end - accuracy feeds the difficulty curve and the
 * effectiveness measure instead of cutting the round short.
 */
type Phase = 'encoding' | 'covering' | 'travel' | 'revealing' | 'shopping' | 'roundEnd';

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
  const [retentionPct, setRetentionPct] = useState(0);
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
    later(() => {
      shoppingAt.current = Date.now();
      setPhase('shopping');
    }, BLIND_MS);
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

    // Confetti only on a clean round. It used to fire on a single correct pick, which
    // celebrated a round the resident had mostly got wrong.
    if (score.perfect) pushEffects(makeConfetti(400, 1000));

    setPhase('roundEnd');
  }, [phase, picked, round.list, clearPhaseTimer, pushEffects]);

  /*
   * Always `completed: true`. Without hearts a round cannot be failed, only finished
   * more or less accurately, and that accuracy already reaches the difficulty curve
   * through the metrics below - computePerformanceRatio for market-memory reads
   * correct/wrong/listLength/hintsUsed and never looked at a life count.
   */
  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    const score = result ?? scoreRound(round.list, picked);
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.round((Date.now() - mountedAt.current) / 1000),
      completed: true,
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
  // The living room during the list, the shop aisle from the walk onwards - the fill
  // colours have to follow the background the board is actually showing.
  const ground = phase === 'encoding' || phase === 'covering' ? GROUND.home : GROUND.store;
  const [stageRef, stage] = useStageScale(CANVAS_W, CANVAS_H, { safe: SAFE_X, ground });

  const listItems: Item[] = round.list.map((id) => BY_ID[id]);
  const slots: (Item | null)[] = Array.from({ length: round.list.length }, (_, i) =>
    picked[i] ? BY_ID[picked[i]] : null);

  const caption =
    phase === 'encoding' ? t('mm.caption.encoding', 'Remember the items on the list.')
      : phase === 'covering' || phase === 'travel' ? t('mm.caption.travel', 'Off to the shop!')
        : phase === 'revealing' ? t('mm.caption.revealing', 'The list is gone now.')
          // Shortened for the single-line caption panel: the old copy needed two lines.
          : t('mm.caption.shopping', 'Remember & Collect Items');

  // The clipboard's exit animation runs inside `revealing`, so unmounting on `shopping`
  // lets it finish rather than cutting it short.
  const showList = phase === 'encoding' || phase === 'covering' || phase === 'travel' || phase === 'revealing';
  /*
   * Derived, not state. The clipboard used to slide away in the open after the cover
   * lifted, which is why it had its own 400ms and its own setState; under a full-board
   * cover there is nothing to watch, so it simply leaves for as long as `revealing`
   * lasts and the board is ready by the time the cover is off it. Storing this in state
   * meant setting it synchronously inside the phase effect, which is a cascading render.
   */
  const listLeaving = phase === 'revealing';
  // The tray would otherwise sit on top of the clipboard through the walk to the shop.
  const showCart = phase === 'shopping' || phase === 'roundEnd';
  const hintLive = phase === 'shopping' && hintsLeft > 0;

  return (
    <div
      ref={stageRef}
      className="w-full h-full overflow-hidden"
      style={{
        // Flex centring, not `margin: 0 auto`: the canvas is 800 design px and the
        // viewport is routinely narrower, and auto margins collapse to zero once the
        // child overflows, which parks the board off to the right. Flex still centres.
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        // Leftover height is painted with the board's own room or aisle, not app grey.
        background: stage.ground,
      }}
    >
      <MarketMemoryStyles />
      <div data-board style={{
        width: CANVAS_W, height: CANVAS_H, flex: '0 0 auto',
        // Centres the board in the leftover height. 0 once the board fills the box.
        marginTop: stage.offsetY,
        transform: `scale(${stage.scale})`, transformOrigin: 'top center',
        position: 'relative', fontFamily: "'Baloo 2', sans-serif", userSelect: 'none',
      }}>
        {/* Board */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: BOARD_W, height: BOARD_H, overflow: 'hidden' }}>
          <Scene inStore={inStore} reduced={reduced} />

          {/*
            The chrome strip, in the kit's near-white rather than the old deep navy.

            It stays, and stays full width, because GameShell floats the level plate
            over the board's top-centre and the exit over its top-right, and this is
            what both of them sit on. The Sep-9 mock repaints it; it does not remove
            it - the board art still begins below it.

            HINT no longer lives here. It moved to the cart's top-left corner, which
            is where the mock puts it. See CartStrip.
          */}
          <div style={{
            position: 'absolute', left: 0, top: 0, width: BOARD_W, height: HUD_H, zIndex: 7,
            background: COLOURS.panel,
            borderBottom: `4px solid ${COLOURS.panelInk}`,
          }} />

          {/*
            The caption, on the kit's pale plate.

            One line, not two: it sits between the chrome strip and the first row of
            crates, and a second line would cover the top row of goods once shopping
            starts.
          */}
          <div style={{
            position: 'absolute', left: CAPTION.left, top: CAPTION.top, width: CAPTION.width, zIndex: 6,
            background: COLOURS.panel, border: `3px solid ${COLOURS.panelEdge}`, borderRadius: 999,
            padding: '6px 16px', textAlign: 'center', boxSizing: 'border-box',
            fontSize: 24, fontWeight: 800, color: COLOURS.panelInk,
            whiteSpace: 'nowrap', overflow: 'hidden',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.22)',
            transition: 'opacity 260ms ease',
          }}>
            {caption}
          </div>

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
              interactive={phase === 'shopping'}
              submitEnabled={phase === 'shopping' && picked.length > 0}
              cartLabel={t('mm.myCart', 'MY CART')}
              submitLabel={t('mm.submit', 'DONE')}
              removeLabel={(name) => t('mm.removeItem', 'Remove {{name}}', { name })}
              reduced={reduced}
              onRemove={handleRemove}
              onSubmit={handleSubmit}
              hintsLeft={hintsLeft}
              hintEnabled={hintLive}
              hintLabel={t('mm.hint', 'HINT')}
              onHint={handleHint}
            />
          )}

          {effects.map((e) => <EffectView key={e.id} effect={e} reduced={reduced} />)}

          {phase === 'roundEnd' && result && (
            <ResultCard
              /*
               * Only what the resident actually put in the cart, marked right or wrong.
               * The items they never picked are left off: `resultRows` still accounts
               * for them, and the filter is here rather than in the card so the card
               * stays a plain renderer of whatever rows it is handed.
               */
              rows={resultRows(round.list, picked).filter((r) => r.status !== 'missed')}
              perfect={result.perfect}
              labels={{
                title: result.perfect
                  ? t('mm.perfect', 'Whole list, exactly right')
                  : t('mm.checked', 'Cart Checked'),
                action: t('mm.next', 'Next Round'),
                // Not rendered - these carry the verdict to a screen reader now that
                // the tiles show art and a badge rather than a printed name.
                status: {
                  correct: t('mm.status.correct', 'on the list'),
                  wrong:   t('mm.status.wrong', 'not on the list'),
                  missed:  t('mm.status.missed', 'missed'),
                },
              }}
              reduced={reduced}
              onContinue={commit}
            />
          )}

        </div>
      </div>
    </div>
  );
}
