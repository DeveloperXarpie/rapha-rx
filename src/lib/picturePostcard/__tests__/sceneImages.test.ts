import { describe, it, expect } from 'vitest';
import { sceneImageUrls } from '../../../games/memory/PicturePostcard/useSceneImages';
import { SCENES, getScene } from '../../../games/memory/PicturePostcard/scenes';

describe('sceneImageUrls', () => {
  it('returns the plate plus every item cutout for a raster scene', () => {
    const urls = sceneImageUrls(getScene('post-office'));
    expect(urls).toHaveLength(11);
    expect(urls[0]).toBe('/pp/scenes/post-office/background.webp');
    expect(urls).toContain('/pp/scenes/post-office/items/key.webp');
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('returns nothing for vector scenes, so they never wait on a decode', () => {
    for (const scene of SCENES.filter((s) => !s.backgroundImage)) {
      expect(sceneImageUrls(scene), scene.id).toHaveLength(0);
    }
  });
});
