export interface SlotVariants {
  colours: string[];           // >=3 alternate fills (excl. the base fill)
  alternate: string;           // same-category sprite id (class 5)
  scales: [number, number];    // [0.8, 1.25]
}

export interface ObjectSlot {
  id: string;
  category: string;            // i18n key suffix pp.category.<category>
  bbox: { x: number; y: number; w: number; h: number }; // scene-normalised 0-1
  salience: 1 | 2 | 3;
  centrality: 1 | 2 | 3;

  // Render payload - vector scenes set spriteId + baseFill, raster scenes set imageSrc.
  spriteId?: string;
  baseFill?: string;           // the sprite's authored colour for this slot
  imageSrc?: string;           // public path to a transparent cutout

  // Vector-only. A slot without these cannot take change classes 2 and 4-7; the
  // generator's supportsClass() enforces that rather than the renderer guessing.
  variants?: SlotVariants;
  altPositions?: [{ x: number; y: number }, { x: number; y: number }];
  lures?: [string, string, string]; // sprite ids ordered most->least similar (lureLevel 3->1)
}

export interface SceneDef {
  id: string;
  theme: string;               // i18n key suffix pp.theme.<theme>
  background: BackgroundLayer[];
  backgroundImage?: string;    // raster scenes; when set, `background` is []
  /** Painted-size multiplier. Vector sprites are authored small (SPRITE_RENDER_SCALE);
   *  raster cutouts are authored at true size and use 1. */
  renderScale?: number;
  /** Pinned scenes are bound to specific levels and never enter the random pool. */
  pinned?: boolean;
  slots: ObjectSlot[];         // >= 20 for vector scenes
}

export interface BackgroundLayer {
  kind: 'rect' | 'ellipse';
  x: number; y: number; w: number; h: number; // scene-normalised
  fill: string;
}
