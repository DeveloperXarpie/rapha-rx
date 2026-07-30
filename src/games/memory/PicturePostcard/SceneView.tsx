import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppliedChange, TrialSpec } from '../../../lib/contentGenerators/picturePostcard';
import { SPRITES } from './sprites';
import type { ObjectSlot, SceneDef } from './scenes';
import { inflateBBox, SPRITE_RENDER_SCALE } from './geometry';

// ─── Types ────────────────────────────────────────────────────────────────────

type BBox = { x: number; y: number; w: number; h: number };

export interface SceneViewProps {
  scene: SceneDef;
  modifications?: AppliedChange[];
  lures?: TrialSpec['lurePlacements'];
  visibleSlotIds: string[];
  onSlotTap?: (slotId: string | null, pos: { xNorm: number; yNorm: number }) => void;
  /** Scaffold tier 1: lightly desaturate every slot except the scaffold target. */
  dimNonTargets?: boolean;
  /** Slot exempted from tier-1 dimming. Defaults to the vignette/pulse/annotate target when omitted. */
  dimExemptSlotId?: string;
  /** Scaffold tier 2: warm radial-gradient highlight over the target slot's quadrant. */
  vignetteSlotId?: string;
  /** Scaffold tier 3: pulsing opacity animation over the target slot. */
  pulseSlotId?: string;
  /** Feedback: dashed circle + label over the named slot. */
  annotateSlotId?: string;
  className?: string;
}

interface RenderTarget {
  id: string;
  bbox: BBox;
  /** Vector slots carry spriteId + fill; raster slots carry imageSrc (see Task 7). */
  spriteId?: string;
  imageSrc?: string;
  fill?: string;
  mirrored?: boolean;
  scale?: number;
  /** false = removed by a class-1 change: not painted, but still hit-testable. */
  visible: boolean;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function boxStyle(b: BBox): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${b.x * 100}%`,
    top: `${b.y * 100}%`,
    width: `${b.w * 100}%`,
    height: `${b.h * 100}%`,
  };
}

/** The 4:3-box quadrant (of 4) containing the bbox's centre — used to place the vignette hint. */
function quadrantBox(b: BBox): BBox {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return { x: cx < 0.5 ? 0 : 0.5, y: cy < 0.5 ? 0 : 0.5, w: 0.5, h: 0.5 };
}

const PULSE_CSS = `
@keyframes pp-scene-pulse {
  0% { opacity: 1; }
  50% { opacity: 0.25; }
  100% { opacity: 1; }
}
.pp-scene-pulse-overlay {
  animation: pp-scene-pulse 0.4s ease-in-out 2;
}
`;

/** Soft warm glow centred on the target within its quadrant (GDD tier 2). */
function vignetteGradient(target: BBox, quadrant: BBox): string {
  const cx = ((target.x + target.w / 2 - quadrant.x) / quadrant.w) * 100;
  const cy = ((target.y + target.h / 2 - quadrant.y) / quadrant.h) * 100;
  return `radial-gradient(ellipse 55% 55% at ${cx.toFixed(1)}% ${cy.toFixed(1)}%, rgba(255,179,71,0.30) 0%, rgba(255,179,71,0) 70%)`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SceneView({
  scene,
  modifications = [],
  lures = [],
  visibleSlotIds,
  onSlotTap,
  dimNonTargets,
  dimExemptSlotId,
  vignetteSlotId,
  pulseSlotId,
  annotateSlotId,
  className,
}: SceneViewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  const renderTargets = useMemo<RenderTarget[]>(() => {
    const modBySlot = new Map(modifications.map((m) => [m.slotId, m]));
    const out: RenderTarget[] = [];

    // The render payload every class starts from. Vector slots contribute spriteId and
    // fill; raster slots contribute imageSrc. Classes that rewrite one of those override
    // it below.
    const base = (slot: ObjectSlot): RenderTarget => ({
      id: slot.id,
      bbox: slot.bbox,
      spriteId: slot.spriteId,
      imageSrc: slot.imageSrc,
      fill: slot.baseFill,
      visible: true,
    });

    for (const slot of scene.slots) {
      if (!visibleSlotIds.includes(slot.id)) continue;
      const mod = modBySlot.get(slot.id);

      if (!mod) {
        out.push(base(slot));
        continue;
      }

      switch (mod.changeClass) {
        case 1: // removed — no paint, still hit-testable at its original bbox
          out.push({ ...base(slot), visible: false });
          break;
        case 3: // translocated
          out.push({
            ...base(slot),
            bbox: { ...slot.bbox, x: mod.newPosition?.x ?? slot.bbox.x, y: mod.newPosition?.y ?? slot.bbox.y },
          });
          break;
        case 4: // recoloured
          out.push({ ...base(slot), fill: mod.newFill ?? slot.baseFill });
          break;
        case 5: // sprite substituted
          out.push({ ...base(slot), spriteId: mod.newSpriteId ?? slot.spriteId });
          break;
        case 6: // rescaled
          out.push({ ...base(slot), scale: mod.newScale });
          break;
        case 7: // mirrored
          out.push({ ...base(slot), mirrored: mod.mirrored });
          break;
        default:
          out.push(base(slot));
      }
    }

    // Class 2: an object added at a new position — the slot it targets was never visible.
    for (const mod of modifications) {
      if (mod.changeClass !== 2) continue;
      const originSlot = scene.slots.find((s) => s.id === mod.slotId);
      if (!originSlot || !mod.addedSpriteId || !mod.newPosition) continue;
      out.push({
        ...base(originSlot),
        id: mod.slotId,
        bbox: { x: mod.newPosition.x, y: mod.newPosition.y, w: originSlot.bbox.w, h: originSlot.bbox.h },
        spriteId: mod.addedSpriteId,
      });
    }

    // Paint (and therefore hit-test, pulse, dim) at the inflated render size so
    // sprites read clearly at postcard scale; centres are unchanged. Raster scenes set
    // renderScale 1 - their cutouts are already authored at true size.
    const k = scene.renderScale ?? SPRITE_RENDER_SCALE;
    return out.map((rt) => ({ ...rt, bbox: inflateBBox(rt.bbox, k) }));
  }, [scene, modifications, visibleSlotIds]);

  const targetsById = useMemo(() => new Map(renderTargets.map((r) => [r.id, r])), [renderTargets]);

  const scaffoldTargetId = vignetteSlotId ?? pulseSlotId ?? annotateSlotId;
  const dimExemptId = dimExemptSlotId ?? scaffoldTargetId;

  function handleTap(e: React.PointerEvent<HTMLDivElement>) {
    if (!onSlotTap) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const xNorm = (e.clientX - rect.left) / rect.width;
    const yNorm = (e.clientY - rect.top) / rect.height;

    let best: { id: string; distSq: number } | null = null;
    for (const rt of renderTargets) {
      const cx = rt.bbox.x + rt.bbox.w / 2;
      const cy = rt.bbox.y + rt.bbox.h / 2;
      const halfW = (rt.bbox.w * 1.5) / 2;
      const halfH = (rt.bbox.h * 1.5) / 2;
      if (xNorm < cx - halfW || xNorm > cx + halfW || yNorm < cy - halfH || yNorm > cy + halfH) continue;
      const distSq = (xNorm - cx) ** 2 + (yNorm - cy) ** 2;
      if (!best || distSq < best.distSq) best = { id: rt.id, distSq };
    }

    onSlotTap(best?.id ?? null, { xNorm, yNorm });
  }

  const vignetteTarget = vignetteSlotId ? targetsById.get(vignetteSlotId) : undefined;
  const annotateTarget = annotateSlotId ? targetsById.get(annotateSlotId) : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative w-full select-none overflow-hidden rounded-2xl ${className ?? ''}`}
      style={{ aspectRatio: '4 / 3' }}
      onPointerUp={handleTap}
    >
      <style>{PULSE_CSS}</style>

      {scene.backgroundImage && (
        <img
          src={scene.backgroundImage}
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 w-full h-full pointer-events-none"
          // `fill`, not `cover`: the plate is authored at exactly 4:3, so there is
          // nothing to crop, and `cover` would silently shift every authored bbox.
          // Absolute positioning is required because .scene-board has p-3 padding and a
          // normal-flow child would be inset 12px away from the items.
          style={{ objectFit: 'fill' }}
        />
      )}

      {scene.background.map((b, i) => (
        <div
          key={`bg-${i}`}
          className="absolute"
          style={{
            left: `${b.x * 100}%`,
            top: `${b.y * 100}%`,
            width: `${b.w * 100}%`,
            height: `${b.h * 100}%`,
            background: b.fill,
            borderRadius: b.kind === 'ellipse' ? '50%' : 0,
          }}
        />
      ))}

      {lures.map((lure, i) => {
        const entry = SPRITES[lure.spriteId];
        if (!entry) return null;
        const Sprite = entry.Component;
        return (
          <div key={`lure-${i}`} className="absolute pointer-events-none" style={boxStyle(inflateBBox(lure))}>
            <Sprite />
          </div>
        );
      })}

      {renderTargets.map((rt) => {
        const entry = rt.spriteId ? SPRITES[rt.spriteId] : undefined;
        return (
          <div
            key={rt.id}
            className="absolute"
            style={{
              ...boxStyle(rt.bbox),
              filter: dimNonTargets && rt.id !== dimExemptId ? 'saturate(0.92)' : undefined,
            }}
          >
            {/* Raster items stay MOUNTED when hidden and go invisible instead. Removing
                the element would drop its decoded bitmap, risking a decode stall when
                feedback reveals it - and SceneView relies on removed slots staying in
                renderTargets so handleTap can still resolve a tap on the empty spot. */}
            {rt.imageSrc && (
              <img
                src={rt.imageSrc}
                alt=""
                aria-hidden
                draggable={false}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  objectFit: 'fill',
                  visibility: rt.visible ? 'visible' : 'hidden',
                  transform: rt.mirrored ? 'scaleX(-1)' : undefined,
                }}
              />
            )}
            {!rt.imageSrc && rt.visible && entry && (
              <entry.Component fill={rt.fill} mirrored={rt.mirrored} scale={rt.scale} />
            )}
            {pulseSlotId === rt.id && (
              <div className="absolute inset-0 pp-scene-pulse-overlay pointer-events-none rounded-full bg-white/40" />
            )}
          </div>
        );
      })}

      {vignetteTarget && (
        <div className="absolute pointer-events-none" style={boxStyle(quadrantBox(vignetteTarget.bbox))}>
          <div
            className="w-full h-full"
            style={{ background: vignetteGradient(vignetteTarget.bbox, quadrantBox(vignetteTarget.bbox)) }}
          />
        </div>
      )}

      {annotateTarget && (
        <div
          className="absolute pointer-events-none flex flex-col items-center"
          style={boxStyle({
            x: annotateTarget.bbox.x - annotateTarget.bbox.w * 0.15,
            y: annotateTarget.bbox.y - annotateTarget.bbox.h * 0.15,
            w: annotateTarget.bbox.w * 1.3,
            h: annotateTarget.bbox.h * 1.3,
          })}
        >
          <div className="w-full h-full rounded-full border-4 border-dashed border-accent-purple" />
          <span className="text-h3 font-semibold text-accent-purple bg-white/90 rounded-xl px-3 py-1 -mt-4 shadow-sm">
            {t('pp.annotate.here', 'Here')}
          </span>
        </div>
      )}
    </div>
  );
}
