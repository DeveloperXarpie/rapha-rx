export interface SlotVariants {
  colours: string[];           // >=3 alternate fills (excl. the base fill)
  alternate: string;           // same-category sprite id (class 5)
  scales: [number, number];    // [0.8, 1.25]
}

export interface ObjectSlot {
  id: string;
  category: string;            // i18n key suffix pp.category.<category>
  spriteId: string;
  baseFill: string;            // the sprite's authored colour for this slot
  bbox: { x: number; y: number; w: number; h: number }; // scene-normalised 0-1
  salience: 1 | 2 | 3;
  centrality: 1 | 2 | 3;
  variants: SlotVariants;
  altPositions: [{ x: number; y: number }, { x: number; y: number }];
  lures: [string, string, string]; // sprite ids ordered most->least similar (lureLevel 3->1)
}

export interface SceneDef {
  id: string;
  theme: string;               // i18n key suffix pp.theme.<theme>
  background: BackgroundLayer[];
  slots: ObjectSlot[];         // >= 20
}

export interface BackgroundLayer {
  kind: 'rect' | 'ellipse';
  x: number; y: number; w: number; h: number; // scene-normalised
  fill: string;
}
