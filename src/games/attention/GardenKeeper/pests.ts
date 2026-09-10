import type { CSSProperties } from 'react';
import type { PestKind, PestSpecies } from './palette';

/**
 * The bed's non-flower hazards - weeds, insects and toadstools - drawn from CSS
 * primitives.
 *
 * This is the whole of the art. The flowers are raster, sliced from the delivered plant
 * sheet, but that sheet holds no bug, weed or toadstool (see the 2026-08-17 amendment),
 * so these eight species are ported from the original prototype's drawing code, at
 * `garden-keeper-src.dc.html:210-256` in the Garden Keeper design handoff. That bundle is
 * deliberately untracked - .gitignore excludes the design_handoff folders as scratch - so
 * the values below are the only copy of it that ships.
 *
 * They will read flatter than the painted flowers beside them. That is the known cost of
 * having them at all, and it is contained: when raster pests arrive, `pestLayers` becomes
 * a URL lookup and no other file changes.
 *
 * Every layer is expressed in **hundredths of the stage size**, which is what lets one
 * species render identically at 82px on the bed and at 58px in the intro legend. Preserve
 * that property in whatever replaces this.
 */

export interface PestLayer {
  key: string;
  style: CSSProperties;
}

/** Absolutely positioned, anchored at the sprite box's base, as the prototype's `L()` was. */
function layer(style: CSSProperties): CSSProperties {
  return { position: 'absolute', ...style };
}

export function pestLayers(kind: PestKind, species: PestSpecies, size: number): PestLayer[] {
  /** Hundredths of the stage size, so the species scales with its box. */
  const u = (n: number) => (n * size) / 100;
  /** Horizontal offset from the box's centre line, in the same hundredths. */
  const offset = (dx: number) => `translateX(calc(-50% + ${u(dx)}px))`;
  const out: CSSProperties[] = [];

  const stem = (h: number, col = '#3F7A2E') => out.push(layer({
    left: '50%', bottom: u(2), width: u(6), height: u(h),
    borderRadius: 3, background: col, transform: 'translateX(-50%)',
  }));

  const leaf = (dx: number, bottom: number, deg: number, col = '#4E8C3A') => out.push(layer({
    left: '50%', bottom: u(bottom), width: u(30), height: u(15),
    borderRadius: '60% 12% 60% 12%', background: col,
    transform: `${offset(dx)} rotate(${deg}deg)`,
  }));

  if (kind === 'weed') {
    // Five blades fanning off a short stem, each pivoting at the soil line.
    const greens = ['#3F7A2E', '#4E8C3A', '#5C9E42'];
    stem(30, '#3A6E29');
    ([[-30, -34], [-16, -18], [0, 0], [16, 18], [30, 34]] as const).forEach(([spread, deg], i) => {
      out.push(layer({
        left: '50%', bottom: u(20 + Math.abs(spread) * 0.28), width: u(20), height: u(46),
        borderRadius: '50% 50% 20% 20%', background: greens[i % 3],
        transformOrigin: '50% 100%', transform: `translateX(-50%) rotate(${deg}deg)`,
      }));
    });
    // weedB carries a seed head, which is the only thing separating it from weedA.
    if (species === 'weedB') {
      out.push(layer({
        left: '50%', bottom: u(62), width: u(16), height: u(16),
        borderRadius: '50%', background: '#D9CFB6', transform: 'translateX(-50%)',
      }));
    }
  } else if (kind === 'poison') {
    if (species === 'mushroom') {
      out.push(layer({
        left: '50%', bottom: u(4), width: u(26), height: u(34),
        borderRadius: '8px 8px 12px 12px',
        background: 'linear-gradient(90deg, #EDE0C6 0%, #C9B894 100%)',
        transform: 'translateX(-50%)',
      }));
      out.push(layer({
        left: '50%', bottom: u(30), width: u(74), height: u(44),
        borderRadius: '50% 50% 18% 18%',
        background: 'radial-gradient(circle at 40% 30%, #9B57C4 0%, #6E3894 100%)',
        transform: 'translateX(-50%)',
      }));
      out.push(layer({
        left: '50%', bottom: u(50), width: u(14), height: u(14),
        borderRadius: '50%', background: '#F3E7D0', transform: offset(-16),
      }));
      out.push(layer({
        left: '50%', bottom: u(56), width: u(11), height: u(11),
        borderRadius: '50%', background: '#F3E7D0', transform: offset(14),
      }));
    } else {
      // The carnivore: a pod with a red mouth and five teeth.
      stem(26, '#3A6E29');
      leaf(-22, 12, 26);
      leaf(22, 16, -26);
      out.push(layer({
        left: '50%', bottom: u(26), width: u(64), height: u(40),
        borderRadius: '34px 34px 20px 20px',
        background: 'linear-gradient(180deg, #6FA83F 0%, #47762A 100%)',
        transform: 'translateX(-50%)',
      }));
      out.push(layer({
        left: '50%', bottom: u(40), width: u(52), height: u(26),
        borderRadius: '26px 26px 4px 4px', background: '#B33B2E',
        transform: 'translateX(-50%)',
      }));
      for (let i = 0; i < 5; i++) {
        out.push(layer({
          left: '50%', bottom: u(40), width: u(8), height: u(12),
          background: '#FBF6E8', clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
          transform: offset(-18 + i * 9),
        }));
      }
    }
  } else if (kind === 'insect') {
    if (species === 'bee') {
      out.push(layer({
        left: '50%', bottom: u(22), width: u(48), height: u(34), borderRadius: '50%',
        background: 'repeating-linear-gradient(100deg, #EFC13C 0 10px, #3A2A18 10px 18px)',
        transform: 'translateX(-50%)',
      }));
      out.push(layer({
        left: '50%', bottom: u(28), width: u(20), height: u(20),
        borderRadius: '50%', background: '#3A2A18', transform: offset(-28),
      }));
      out.push(layer({
        left: '50%', bottom: u(48), width: u(30), height: u(18), borderRadius: '50%',
        background: 'rgba(255,255,255,.72)', transform: `${offset(4)} rotate(-16deg)`,
      }));
    } else if (species === 'ladybird') {
      out.push(layer({
        left: '50%', bottom: u(18), width: u(56), height: u(48),
        borderRadius: '50% 50% 46% 46%',
        background: 'radial-gradient(circle at 38% 28%, #E05A4A 0%, #B33B2E 100%)',
        transform: 'translateX(-50%)',
      }));
      // The wing seam, which is what makes the shell read as two wing cases.
      out.push(layer({
        left: '50%', bottom: u(18), width: u(5), height: u(48),
        background: '#3A2A18', transform: 'translateX(-50%)',
      }));
      out.push(layer({
        left: '50%', bottom: u(56), width: u(28), height: u(20),
        borderRadius: '50% 50% 20% 20%', background: '#3A2A18',
        transform: 'translateX(-50%)',
      }));
      ([[-15, 34], [15, 30], [-11, 48], [12, 46]] as const).forEach(([dx, bottom]) => {
        out.push(layer({
          left: '50%', bottom: u(bottom), width: u(10), height: u(10),
          borderRadius: '50%', background: '#3A2A18', transform: offset(dx),
        }));
      });
    } else if (species === 'snail') {
      out.push(layer({
        left: '50%', bottom: u(8), width: u(66), height: u(22),
        borderRadius: '12px 22px 12px 12px', background: '#D9C08A',
        transform: 'translateX(-50%)',
      }));
      out.push(layer({
        left: '50%', bottom: u(20), width: u(46), height: u(46), borderRadius: '50%',
        background: 'conic-gradient(from 210deg, #C9873C 0deg, #8C5A18 160deg, #C9873C 300deg, #8C5A18 360deg)',
        transform: offset(-8),
      }));
      out.push(layer({
        left: '50%', bottom: u(28), width: u(6), height: u(20), borderRadius: 4,
        background: '#D9C08A', transform: `${offset(26)} rotate(16deg)`,
      }));
    } else {
      // The caterpillar: five alternating segments and a head, walking left to right.
      for (let i = 0; i < 5; i++) {
        out.push(layer({
          left: '50%', bottom: u(10 + (i % 2) * 7), width: u(24), height: u(24),
          borderRadius: '50%', background: i % 2 ? '#6FA83F' : '#8CC24E',
          transform: offset(-30 + i * 15),
        }));
      }
      out.push(layer({
        left: '50%', bottom: u(20), width: u(26), height: u(26),
        borderRadius: '50%', background: '#A8D46A', transform: offset(38),
      }));
    }
  }

  return out.map((style, i) => ({ key: `l${i}`, style }));
}
