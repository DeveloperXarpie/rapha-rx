import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tileArt, type GameCatalogEntry } from '../../lib/gameCatalog';
import type { CategoryStatus } from '../../lib/sessionLedger';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { staggerDelay } from './transitions';
import { BRAND, type GameCategory } from '../../styles/tokens';

const HEADING: Record<GameCategory, { key: string; fallback: string }> = {
  memory:    { key: 'home.panel.memory',    fallback: 'Boost Your MEMORY' },
  attention: { key: 'home.panel.attention', fallback: 'Build Your FOCUS' },
  executive: { key: 'home.panel.executive', fallback: 'Strengthen Your PLANNING' },
};

const SLOT_LABEL: Record<GameCategory, { key: string; fallback: string }> = {
  memory:    { key: 'home.slot.memory',    fallback: 'Memory' },
  attention: { key: 'home.slot.attention', fallback: 'Attention' },
  executive: { key: 'home.slot.executive', fallback: 'Planning' },
};

/** Mock 1's row: four slots, the games from the second slot on, empty slots around them. */
const SLOTS = 4;
const TILE_MAX = 96;
/** Slot captions, small capitals as in Mock 1. */
const LABEL = { fontSize: 13, fontWeight: 600, lineHeight: 1.2, marginTop: 6, letterSpacing: '0.02em' } as const;

const LOCK_MS = 400;
const BOUNCE_MS = 520;

interface Props {
  category: GameCategory;
  status: CategoryStatus;
  games: GameCatalogEntry[];
  /** Play the unlock animation now (FINAL_SPEC 5.3). */
  unlocking: boolean;
  onTileTap: (gameId: string) => void;
  onUnlockAnimationEnd: () => void;
}

/**
 * One category on Home, per Mock 1: a heading bar over the category's games.
 *
 * A locked panel greys its tiles but keeps them tappable, so Home can explain why
 * they are locked (6.2). The empty slots either side are drawn as in Mock 1, which
 * the amends of 2026-11-23 repeat (C7): placeholders labelled with the category,
 * not buttons.
 */
export default function CategoryPanel({
  category, status, games, unlocking, onTileTap, onUnlockAnimationEnd,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const animate = unlocking && !reduced;
  const showLock = status === 'locked' || animate;

  // The animation's end is a timer rather than animationend events: the panel
  // must report completion even when a tile's image never loads.
  useEffect(() => {
    if (!unlocking) return;
    if (reduced) { onUnlockAnimationEnd(); return; }
    const total = LOCK_MS + staggerDelay(Math.max(0, games.length - 1)) + BOUNCE_MS;
    const id = setTimeout(onUnlockAnimationEnd, total);
    return () => clearTimeout(id);
  }, [unlocking, reduced, games.length, onUnlockAnimationEnd]);

  const heading = HEADING[category];
  const locked = status === 'locked';

  return (
    <section
      aria-label={t(heading.key, heading.fallback)}
      style={{
        position: 'relative', borderRadius: 18, background: BRAND.surfaceStrong,
        padding: '0 0 14px', overflow: 'hidden',
      }}
    >
      {/*
       * The lock sits inline before the title rather than pinned to the corner: with
       * Mock 1's wide letter spacing, "Strengthen Your PLANNING" reaches the panel's
       * edge on a 360 px phone and a corner lock would sit on top of it.
       */}
      <h2
        className="font-baloo"
        style={{
          background: 'rgba(4,14,80,0.45)', color: '#FFFFFF', textAlign: 'center',
          fontSize: 19, fontWeight: 700, letterSpacing: '0.1em', padding: '8px 12px',
        }}
      >
        {showLock && (
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block', marginRight: 6, fontSize: 18, lineHeight: 1, letterSpacing: 0,
              animation: animate ? `home-lock-off ${LOCK_MS}ms ease forwards` : undefined,
            }}
          >
            &#128274;
          </span>
        )}
        {t(heading.key, heading.fallback)}
      </h2>

      <div
        style={{
          display: 'grid', gridTemplateColumns: `repeat(${Math.max(SLOTS, games.length + 1)}, minmax(0, 1fr))`,
          gap: 10, padding: '12px 12px 0', alignItems: 'start',
        }}
      >
        {Array.from({ length: Math.max(SLOTS, games.length + 1) }, (_, slot) => {
          const i = slot - 1;
          const game = i >= 0 ? games[i] : undefined;
          if (!game) {
            return (
              <div key={`empty-${slot}`} aria-hidden="true" style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '100%', maxWidth: TILE_MAX, aspectRatio: '1', margin: '0 auto',
                    borderRadius: 16, background: 'rgba(255,255,255,0.13)',
                  }}
                />
                <p style={{ ...LABEL, color: 'rgba(170,196,255,0.75)' }}>
                  {t(SLOT_LABEL[category].key, SLOT_LABEL[category].fallback).toUpperCase()}
                </p>
              </div>
            );
          }
          return (
            <button
              key={game.id}
              onClick={() => onTileTap(game.id)}
              aria-disabled={locked || undefined}
              style={{ width: '100%', minHeight: 80, textAlign: 'center' }}
            >
              <img
                src={tileArt(game)}
                alt=""
                aria-hidden="true"
                width={TILE_MAX}
                height={TILE_MAX}
                style={{
                  display: 'block', width: '100%', maxWidth: TILE_MAX, height: 'auto',
                  aspectRatio: '1', margin: '0 auto', borderRadius: 16,
                  boxShadow: locked ? 'none' : '0 8px 16px rgba(4,14,80,0.3)',
                  filter: locked ? 'grayscale(0.9)' : undefined,
                  opacity: locked ? 0.5 : 1,
                  animation: animate
                    ? `home-tile-bounce ${BOUNCE_MS}ms ease ${LOCK_MS + staggerDelay(i)}ms both`
                    : undefined,
                }}
              />
              <p style={{ ...LABEL, color: locked ? BRAND.muted : '#FFFFFF' }}>
                {t(game.nameKey, game.id).toUpperCase()}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
