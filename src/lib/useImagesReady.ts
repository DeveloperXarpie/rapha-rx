import { useEffect, useState } from 'react';

/**
 * Decoded-image cache, module-level so it outlives any one component's mount.
 */
const CACHE = new Map<string, HTMLImageElement>();

function load(url: string): Promise<void> {
  const cached = CACHE.get(url);
  if (cached?.complete) return Promise.resolve();
  const img = cached ?? new Image();
  img.decoding = 'async';
  CACHE.set(url, img);
  if (img.src !== new URL(url, window.location.href).href) img.src = url;
  // decode() rejects on a broken image; a missing asset must not wedge a game, so resolve
  // either way and let the browser render whatever it has.
  return img.decode().catch(() => undefined);
}

/**
 * True once every URL has a paintable bitmap.
 *
 * A game whose encoding window is a measured parameter must not start that window before
 * this flips: a decode running inside the window silently shortens it.
 *
 * Picture Postcard has an equivalent hook bound to its own SceneDef
 * (`PicturePostcard/useSceneImages.ts`); consolidating the two is a separate tidy-up.
 */
export function useImagesReady(urls: string[]): boolean {
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

  return key === '' ? true : readyKey === key;
}
