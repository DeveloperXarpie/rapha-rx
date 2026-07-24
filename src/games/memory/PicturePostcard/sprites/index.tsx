import React from 'react';

export interface SpriteProps {
  fill?: string;
  mirrored?: boolean;
  scale?: number;
  className?: string;
}

export interface SpriteEntry {
  Component: React.FC<SpriteProps>;
  mirrorable: boolean;
  label: string; // i18n key suffix: pp.sprite.<label>
}

function wrap(children: (fill: string) => React.ReactNode, defaultFill: string): React.FC<SpriteProps> {
  return function Sprite({ fill, mirrored, scale = 1, className }: SpriteProps) {
    return (
      <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%' }}>
        <g transform={`translate(50 50) scale(${mirrored ? -scale : scale} ${scale}) translate(-50 -50)`}>
          {children(fill ?? defaultFill)}
        </g>
      </svg>
    );
  };
}

// ---- asymmetric (mirrorable: true) ----

const Bicycle = wrap((fill) => (
  <>
    <circle cx="25" cy="70" r="18" fill="none" stroke="#333" strokeWidth="3" />
    <circle cx="75" cy="70" r="18" fill="none" stroke="#333" strokeWidth="3" />
    <path d="M25 70 L45 40 L68 40 L75 70 M45 40 L55 70 L25 70" fill="none" stroke={fill} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 32 L52 32 M68 40 L64 28 L74 26" fill="none" stroke={fill} strokeWidth="7" strokeLinecap="round" />
    <path d="M44 40 L68 40 L58 54 Z" fill={fill} />
    <circle cx="25" cy="70" r="5" fill={fill} />
    <circle cx="75" cy="70" r="5" fill={fill} />
  </>
), '#C0392B');

const Teapot = wrap((fill) => (
  <>
    <ellipse cx="45" cy="60" rx="30" ry="22" fill={fill} />
    <path d="M75 52 C92 48 96 62 80 68 L72 62 Z" fill={fill} />
    <path d="M20 45 C10 42 8 30 22 28" fill="none" stroke={fill} strokeWidth="6" />
    <rect x="38" y="34" width="14" height="8" rx="2" fill={fill} />
    <circle cx="45" cy="30" r="4" fill={fill} />
  </>
), '#8E44AD');

const Dog = wrap((fill) => (
  <>
    <ellipse cx="45" cy="62" rx="28" ry="16" fill={fill} />
    <circle cx="78" cy="48" r="15" fill={fill} />
    <ellipse cx="90" cy="38" rx="6" ry="10" fill={fill} transform="rotate(25 90 38)" />
    <path d="M18 60 C6 55 6 72 20 70" fill={fill} />
    <rect x="28" y="74" width="8" height="16" fill={fill} />
    <rect x="58" y="74" width="8" height="16" fill={fill} />
    <circle cx="84" cy="45" r="2" fill="#333" />
  </>
), '#A0522D');

const Cat = wrap((fill) => (
  <>
    <ellipse cx="48" cy="65" rx="26" ry="15" fill={fill} />
    <circle cx="78" cy="50" r="13" fill={fill} />
    <path d="M70 40 L72 28 L80 40 M84 40 L88 27 L92 41" fill={fill} />
    <path d="M20 62 C4 62 2 40 16 42 C22 44 22 56 20 62 Z" fill={fill} />
    <rect x="30" y="76" width="7" height="14" fill={fill} />
    <rect x="55" y="76" width="7" height="14" fill={fill} />
  </>
), '#F39C12');

const Boat = wrap((fill) => (
  <>
    <path d="M12 68 L88 68 L76 86 L26 86 Z" fill={fill} />
    <rect x="48" y="20" width="4" height="48" fill="#333" />
    <path d="M52 24 L52 58 L82 58 Z" fill={fill} />
    <path d="M48 30 L48 58 L26 58 Z" fill="none" stroke="#333" strokeWidth="2" />
  </>
), '#2980B9');

const WateringCan = wrap((fill) => (
  <>
    <ellipse cx="42" cy="66" rx="26" ry="20" fill={fill} />
    <path d="M64 52 L90 38 M86 32 L94 36 L90 44" fill="none" stroke={fill} strokeWidth="6" strokeLinecap="round" />
    <path d="M28 46 C24 34 36 30 40 40" fill="none" stroke={fill} strokeWidth="7" />
    <rect x="36" y="30" width="10" height="10" fill={fill} />
  </>
), '#27AE60');

const Broom = wrap((fill) => (
  <>
    <rect x="46" y="10" width="7" height="48" fill="#8B5A2B" transform="rotate(15 50 10)" />
    <path d="M30 55 L70 50 L78 90 L22 90 Z" fill={fill} />
    <path d="M28 58 L72 53 M26 66 L74 61 M24 74 L76 69" stroke="#333" strokeWidth="1.5" fill="none" />
  </>
), '#D4AC0D');

const Flag = wrap((fill) => (
  <>
    <rect x="30" y="10" width="6" height="82" fill="#5D4037" />
    <path d="M36 16 L86 26 L36 40 Z" fill={fill} />
  </>
), '#E74C3C');

const Bird = wrap((fill) => (
  <>
    <ellipse cx="45" cy="55" rx="26" ry="18" fill={fill} />
    <circle cx="78" cy="42" r="12" fill={fill} />
    <path d="M90 42 L102 38 L90 48 Z" fill="#E67E22" />
    <path d="M30 50 C14 46 12 62 28 62" fill={fill} />
    <circle cx="82" cy="38" r="2" fill="#333" />
    <path d="M40 72 L36 88 M52 72 L50 88" stroke="#333" strokeWidth="3" />
  </>
), '#3498DB');

const Kite = wrap((fill) => (
  <>
    <path d="M58 6 L88 42 L44 94 L12 40 Z" fill={fill} />
    <path d="M12 40 L88 42 M58 6 L44 94" stroke="#333" strokeWidth="1.5" />
    <path d="M44 94 L72 86 L68 96 L46 99 Z" fill={fill} />
  </>
), '#E91E8C');

// ---- symmetric (mirrorable: false) ----

const Bench = wrap((fill) => (
  <>
    <rect x="12" y="42" width="76" height="8" fill={fill} />
    <rect x="12" y="58" width="76" height="8" fill={fill} />
    <rect x="18" y="50" width="6" height="34" fill="#333" />
    <rect x="76" y="50" width="6" height="34" fill="#333" />
    <rect x="18" y="20" width="6" height="24" fill="#333" />
    <rect x="76" y="20" width="6" height="24" fill="#333" />
    <rect x="16" y="16" width="68" height="7" fill={fill} />
  </>
), '#795548');

const Lamp = wrap((fill) => (
  <>
    <rect x="47" y="40" width="6" height="50" fill="#333" />
    <ellipse cx="50" cy="90" rx="20" ry="6" fill="#333" />
    <path d="M30 40 L70 40 L60 12 L40 12 Z" fill={fill} />
    <ellipse cx="50" cy="12" rx="6" ry="4" fill={fill} />
  </>
), '#F1C40F');

const Fountain = wrap((fill) => (
  <>
    <ellipse cx="50" cy="82" rx="38" ry="12" fill={fill} />
    <rect x="42" y="45" width="16" height="38" fill={fill} />
    <ellipse cx="50" cy="45" rx="22" ry="7" fill={fill} />
    <path d="M50 42 C40 25 60 25 50 10" fill="none" stroke="#5DADE2" strokeWidth="4" />
    <path d="M44 42 C36 30 40 22 38 16 M56 42 C64 30 60 22 62 16" fill="none" stroke="#5DADE2" strokeWidth="3" />
  </>
), '#95A5A6');

const Tree = wrap((fill) => (
  <>
    <rect x="44" y="55" width="12" height="35" fill="#6D4C41" />
    <circle cx="50" cy="40" r="30" fill={fill} />
  </>
), '#2E7D32');

const Flowerpot = wrap((fill) => (
  <>
    <path d="M28 55 L72 55 L64 90 L36 90 Z" fill={fill} />
    <rect x="24" y="46" width="52" height="10" fill={fill} />
    <circle cx="50" cy="28" r="9" fill="#E74C3C" />
    <circle cx="34" cy="36" r="8" fill="#E67E22" />
    <circle cx="66" cy="36" r="8" fill="#E67E22" />
    <rect x="47" y="36" width="6" height="14" fill="#2E7D32" />
  </>
), '#B8621B');

const Cup = wrap((fill) => (
  <>
    <path d="M32 30 L68 30 L62 70 L38 70 Z" fill={fill} />
    <ellipse cx="50" cy="70" rx="12" ry="5" fill={fill} />
    <ellipse cx="50" cy="28" rx="18" ry="5" fill={fill} />
  </>
), '#16A085');

const Basket = wrap((fill) => (
  <>
    <path d="M22 45 L78 45 L70 88 L30 88 Z" fill={fill} />
    <path d="M25 52 L75 52 M27 62 L73 62 M29 72 L71 72" stroke="#333" strokeWidth="1.5" fill="none" />
    <path d="M32 45 C32 25 68 25 68 45" fill="none" stroke="#333" strokeWidth="5" />
  </>
), '#C68642');

const Umbrella = wrap((fill) => (
  <>
    <rect x="47" y="45" width="6" height="45" fill="#333" />
    <path d="M50 88 C50 92 44 92 44 88" fill="none" stroke="#333" strokeWidth="3" />
    <path d="M10 45 C10 15 90 15 90 45 C78 38 66 45 54 45 C46 45 40 38 28 45 C20 38 16 45 10 45 Z" fill={fill} />
  </>
), '#8E44AD');

const Bucket = wrap((fill) => (
  <>
    <path d="M26 40 L74 40 L66 88 L34 88 Z" fill={fill} />
    <ellipse cx="50" cy="40" rx="24" ry="6" fill={fill} />
    <path d="M32 40 C32 24 68 24 68 40" fill="none" stroke="#333" strokeWidth="4" />
  </>
), '#607D8B');

const Pot = wrap((fill) => (
  <>
    <ellipse cx="50" cy="82" rx="34" ry="8" fill={fill} />
    <path d="M18 40 C18 70 82 70 82 40 L74 34 L26 34 Z" fill={fill} />
    <rect x="10" y="30" width="14" height="8" rx="3" fill={fill} />
    <rect x="76" y="30" width="14" height="8" rx="3" fill={fill} />
  </>
), '#455A64');

const Stool = wrap((fill) => (
  <>
    <ellipse cx="50" cy="38" rx="30" ry="10" fill={fill} />
    <rect x="22" y="42" width="7" height="42" fill="#333" />
    <rect x="71" y="42" width="7" height="42" fill="#333" />
    <rect x="46" y="42" width="8" height="42" fill="#333" />
  </>
), '#A1887F');

const Drum = wrap((fill) => (
  <>
    <rect x="24" y="35" width="52" height="42" rx="4" fill={fill} />
    <ellipse cx="50" cy="35" rx="26" ry="9" fill="#EFEBE9" />
    <ellipse cx="50" cy="77" rx="26" ry="9" fill="#3E2723" />
    <path d="M24 45 L76 45 M24 60 L76 60" stroke="#333" strokeWidth="1.5" />
  </>
), '#C0392B');

const Garland = wrap((fill) => (
  <>
    <path d="M8 30 C30 55 70 55 92 30" fill="none" stroke="#333" strokeWidth="3" />
    <circle cx="20" cy="40" r="8" fill={fill} />
    <circle cx="38" cy="52" r="8" fill={fill} />
    <circle cx="56" cy="55" r="8" fill={fill} />
    <circle cx="74" cy="48" r="8" fill={fill} />
    <circle cx="88" cy="34" r="8" fill={fill} />
  </>
), '#E91E63');

const Radio = wrap((fill) => (
  <>
    <rect x="14" y="30" width="72" height="48" rx="6" fill={fill} />
    <circle cx="50" cy="54" r="16" fill="#333" />
    <circle cx="50" cy="54" r="10" fill="#EFEBE9" />
    <circle cx="26" cy="42" r="5" fill="#333" />
    <circle cx="74" cy="42" r="5" fill="#333" />
  </>
), '#34495E');

export const SPRITES: Record<string, SpriteEntry> = {
  bench: { Component: Bench, mirrorable: false, label: 'bench' },
  bicycle: { Component: Bicycle, mirrorable: true, label: 'bicycle' },
  dog: { Component: Dog, mirrorable: true, label: 'dog' },
  cat: { Component: Cat, mirrorable: true, label: 'cat' },
  kite: { Component: Kite, mirrorable: true, label: 'kite' },
  lamp: { Component: Lamp, mirrorable: false, label: 'lamp' },
  fountain: { Component: Fountain, mirrorable: false, label: 'fountain' },
  tree: { Component: Tree, mirrorable: false, label: 'tree' },
  flowerpot: { Component: Flowerpot, mirrorable: false, label: 'flowerpot' },
  teapot: { Component: Teapot, mirrorable: true, label: 'teapot' },
  cup: { Component: Cup, mirrorable: false, label: 'cup' },
  basket: { Component: Basket, mirrorable: false, label: 'basket' },
  umbrella: { Component: Umbrella, mirrorable: false, label: 'umbrella' },
  boat: { Component: Boat, mirrorable: true, label: 'boat' },
  bucket: { Component: Bucket, mirrorable: false, label: 'bucket' },
  wateringcan: { Component: WateringCan, mirrorable: true, label: 'wateringcan' },
  broom: { Component: Broom, mirrorable: true, label: 'broom' },
  pot: { Component: Pot, mirrorable: false, label: 'pot' },
  stool: { Component: Stool, mirrorable: false, label: 'stool' },
  flag: { Component: Flag, mirrorable: true, label: 'flag' },
  drum: { Component: Drum, mirrorable: false, label: 'drum' },
  garland: { Component: Garland, mirrorable: false, label: 'garland' },
  radio: { Component: Radio, mirrorable: false, label: 'radio' },
  bird: { Component: Bird, mirrorable: true, label: 'bird' },
};

export function getSprite(id: string): SpriteEntry {
  const s = SPRITES[id];
  if (!s) throw new Error(`Unknown sprite: ${id}`);
  return s;
}
