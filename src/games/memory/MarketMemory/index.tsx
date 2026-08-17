import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useReducedMotion } from '../../../lib/useReducedMotion';

import Backdrop from './Backdrop';
import Blind from './Blind';
import CartStrip from './CartStrip';
import Crate from './Crate';
import ListCard from './ListCard';
import { EffectView } from './effects';
import { lifetime, makeConfetti, makeToast, type Effect } from './effectModel';
import {
  BASKET, BOARD_H, BOARD_W, CANVAS_H, CANVAS_W, CAPTION, HINT_BTN, HUD_H,
} from './geometry';
import { BY_ID, type Item } from './items';
import { COLOURS } from './palette';
import { buildRound, scoreRound, type RoundScore } from './round';
import { EASE_SETTLE, MarketMemoryStyles } from './styles';

// ─── Timings ──────────────────────────────────────────────────────────────────

const BLIND_MS = 540;
/** The blind must land before the list blanks, or the player watches the rows vanish. */
const ARM_MS = 40;
const DOT_TICK_MS = 120;
const HINT_MS = 3000;

// ─── Params ───────────────────────────────────────────────────────────────────

interface MarketMemoryParams {
  listLength: number;
  listSeconds: number;
  retentionMs: number;
  similarPackaging: boolean;
  delayedRetrieval: boolean;
  listCategory: boolean;
  lives: number;
  hints: number;
}

const DEFAULT_PARAMS: MarketMemoryParams = {
  listLength: 4,
  listSeconds: 6000,
  retentionMs: 1500,
  similarPackaging: true,
  delayedRetrieval: false,
  listCategory: false,
  lives: 3,
  hints: 2,
};

type Phase = 'encoding' | 'retention' | 'shopping' | 'roundEnd' | 'outOfHearts';

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
  const hintsUsedRef = useRef(0);
  const pickOrderRef = useRef<string[]>([]);

  useEffect(() => { pickedRef.current = picked; }, [picked]);

  // Stamped in an effect rather than in the useRef initialiser: Date.now() during render
  // is impure and unstable across re-renders. Same pattern as Train Yard.
  useEffect(() => { mountedAt.current = Date.now(); }, []);

  /**
   * Warning 2 from the spec: kills both the pending phase timeout and the retention dot
   * interval. Missing either leaves an old timer to fire a stale transition mid-round.
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
  // Warning 1 from the spec: every transition runs on a setTimeout against a deadline,
  // never on a display ticker. A ticker-driven machine deadlocks on a backgrounded tab.

  useEffect(() => {
    if (phase !== 'encoding') return;
    // The blind starts falling as part of the transition, not as a reaction to being in
    // `retention`: dropping it from the retention effect would be a synchronous setState
    // inside an effect, which costs an extra render pass before the animation starts.
    later(() => { setBlindDown(true); setPhase('retention'); }, params.listSeconds);
  }, [phase, params.listSeconds, later]);

  useEffect(() => {
    if (phase !== 'retention') return;

    // Warning 3: blank the list only once the blind has landed.
    const armId = window.setTimeout(() => setCovered(true), BLIND_MS + ARM_MS);
    reapTimers.current.push(armId);

    const holdStart = Date.now() + BLIND_MS;
    dotTimer.current = window.setInterval(() => {
      const pct = (Date.now() - holdStart) / params.retentionMs;
      setRetentionPct(Math.max(0, Math.min(1, pct)));
    }, DOT_TICK_MS);

    phaseTimer.current = window.setTimeout(() => {
      if (dotTimer.current !== null) { window.clearInterval(dotTimer.current); dotTimer.current = null; }
      setRetentionPct(1);
      setBlindDown(false);
      phaseTimer.current = window.setTimeout(() => {
        shoppingAt.current = Date.now();
        setPhase('shopping');
      }, BLIND_MS);
    }, BLIND_MS + params.retentionMs);
  }, [phase, params.retentionMs]);

  // ─── Interaction ────────────────────────────────────────────────────────────

  const handleCrateTap = useCallback((index: number, x: number, y: number) => {
    if (phase !== 'shopping') return;
    const id = round.crates[index];

    if (pickedRef.current.includes(id)) {
      setPicked((prev) => prev.filter((p) => p !== id));
      return;
    }
    if (pickedRef.current.length >= round.list.length) {
      pushEffects([makeToast(x, y, t('mm.basketFull', 'Basket full'))]);
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
        timeToFirstPickMs: firstPickAt.current ? firstPickAt.current - shoppingAt.current : null,
        timeToSubmitMs: Date.now() - shoppingAt.current,
        pickOrder: [...pickOrderRef.current],
      },
    });
  }, [result, round.list, picked, levelConfig.id, onLevelComplete]);

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

  const listItems: Item[] = round.list.map((id) => BY_ID[id]);
  const slots: (Item | null)[] = Array.from({ length: round.list.length }, (_, i) =>
    picked[i] ? BY_ID[picked[i]] : null);

  const caption = phase === 'encoding'
    ? t('mm.caption.encoding', 'Remember the items from the list.')
    : phase === 'retention'
      ? t('mm.caption.retention', 'The list is covered now.')
      : t('mm.caption.shopping', 'Find and collect only those items, then press SUBMIT.');

  const card = phase === 'roundEnd' || phase === 'outOfHearts' ? phase : null;

  return (
    <div ref={wrapRef} style={{ width: '100%', height: CANVAS_H * scale, overflow: 'hidden' }}>
      <MarketMemoryStyles />
      <div style={{
        width: CANVAS_W, height: CANVAS_H, margin: '0 auto',
        transform: `scale(${scale})`, transformOrigin: 'top center',
        position: 'relative', fontFamily: "'Baloo 2', sans-serif", userSelect: 'none',
      }}>
        {/* HUD */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: HUD_H,
          background: `linear-gradient(180deg, ${COLOURS.navyHudTop} 0%, ${COLOURS.navyHudBot} 100%)`,
          borderBottom: `4px solid ${COLOURS.navyDeep}`,
          display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
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

        {/* Board */}
        <div style={{ position: 'absolute', left: 0, top: HUD_H, width: BOARD_W, height: BOARD_H, overflow: 'hidden' }}>
          <Backdrop />

          <div style={{
            position: 'absolute', left: CAPTION.left, top: CAPTION.top, width: CAPTION.width, zIndex: 6,
            background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`, borderRadius: 16,
            padding: '10px 16px', textAlign: 'center',
            fontSize: 27, fontWeight: 700, color: COLOURS.ink,
            transition: 'opacity 260ms ease',
          }}>
            {caption}
          </div>

          <div style={{
            position: 'absolute', left: BASKET.left, top: BASKET.top, zIndex: 7,
            background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`, borderRadius: 14,
            padding: '8px 14px', fontSize: 22, fontWeight: 700, color: COLOURS.ink,
          }}>
            {t('mm.basket', 'Basket')} {picked.length}/{round.list.length}
          </div>

          <button
            type="button"
            onClick={handleHint}
            disabled={phase !== 'shopping' || hintsLeft <= 0}
            style={{
              position: 'absolute', right: HINT_BTN.right, top: HINT_BTN.top,
              width: HINT_BTN.width, height: HINT_BTN.height, zIndex: 7,
              background: COLOURS.amber, border: 'none', borderBottom: `7px solid ${COLOURS.amberEdge}`,
              borderRadius: 16, fontFamily: "'Baloo 2', sans-serif",
              fontSize: 26, fontWeight: 800, color: '#FFFFFF',
              opacity: phase !== 'shopping' || hintsLeft <= 0 ? 0.55 : 1,
              cursor: phase === 'shopping' && hintsLeft > 0 ? 'pointer' : 'default',
            }}
          >
            {t('mm.hint', 'HINT')} {hintsLeft}
          </button>

          {(phase === 'encoding' || phase === 'retention') && (
            <ListCard items={listItems} covered={covered} reduced={reduced} />
          )}

          <Blind
            down={blindDown}
            progress={retentionPct}
            label={t('mm.listCovered', 'LIST COVERED')}
            reduced={reduced}
          />

          {/*
            The shelf is scenery as much as it is UI, so it is present from the first
            frame - as in the prototype, which maps the crates unconditionally and gates
            only the cursor. Rendering it solely during `shopping` left two thirds of the
            board as bare ground through encoding and retention. Interaction is still
            gated: handleCrateTap returns early outside `shopping`.
          */}
          {round.crates.map((id, i) => (
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

          <CartStrip
            slots={slots}
            listLength={round.list.length}
            submitEnabled={phase === 'shopping' && picked.length > 0}
            cartLabel={t('mm.myCart', 'MY CART')}
            submitLabel={t('mm.submit', 'SUBMIT')}
            reduced={reduced}
            onRemove={handleRemove}
            onSubmit={handleSubmit}
          />

          {effects.map((e) => <EffectView key={e.id} effect={e} reduced={reduced} />)}

          {card && result && (
            <>
              <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(20,48,79,.55)' }} />
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
                      : t('mm.checked', 'Basket checked')}
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
