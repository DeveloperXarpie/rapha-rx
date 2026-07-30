import { useEffect, useState } from 'react';
import type { SceneDef } from './scenes';

/**
 * Decoded-image cache, module-level so it outlives the retention phase's unmount of
 * SceneView. Without it the probe would re-decode every cutout.
 */
const CACHE = new Map<string, HTMLImageElement>();

/** Every image URL a scene paints: the background plate first, then each cutout. */
export function sceneImageUrls(scene: SceneDef): string[] {
  if (!scene.backgroundImage) return [];
  const urls = [scene.backgroundImage];
  for (const slot of scene.slots) if (slot.imageSrc) urls.push(slot.imageSrc);
  return urls;
}

function load(url: string): Promise<void> {
  const cached = CACHE.get(url);
  if (cached?.complete) return Promise.resolve();
  const img = cached ?? new Image();
  img.decoding = 'async';
  CACHE.set(url, img);
  if (img.src !== new URL(url, window.location.href).href) img.src = url;
  // decode() rejects on a broken image; a missing asset must not wedge the trial, so
  // resolve either way and let the browser render whatever it has.
  return img.decode().catch(() => undefined);
}

/**
 * True once every image the scene needs has a paintable bitmap.
 *
 * Raster scenes must not enter the encoding phase before this flips: encodeMs is a
 * measured experimental parameter, and a decode running inside the encode window
 * silently shortens it. Vector scenes are inline SVG and return true immediately.
 */
export function useSceneImages(scene: SceneDef | null): boolean {
  const urls = scene ? sceneImageUrls(scene) : [];
  const key = urls.join('|');
  const [readyKey, setReadyKey] = useState<string | null>(null);

  useEffect(() => {
    if (key === '') return;
    let cancelled = false;
    void Promise.all(key.split('|').map(load)).then(() => {
      if (!cancelled) setReadyKey(key);
    });
    return () => { cancelled = true; };
  }, [key]);

  return urls.length === 0 ? true : readyKey === key;
}
