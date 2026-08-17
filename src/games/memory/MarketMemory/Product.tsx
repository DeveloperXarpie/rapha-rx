import type { CSSProperties, ReactNode } from 'react';
import type { Item } from './items';
import { COLOURS } from './palette';

interface ProductProps {
  item: Item;
  /** Stage height in design px. 78 on a crate, 62 in a cart slot, 60 in the list. */
  size: number;
}

/**
 * A product is drawn as CSS packaging with the item's emoji sitting on its label area.
 *
 * Twins share a shape and a colour family on purpose: the shelf must not be solvable by
 * silhouette. Eight of the twenty-one items have no distinct emoji, and those are exactly
 * the twins (Cream, Sugar, Flour, Jam...), so the glyph can never be the primary signal.
 * The name text rendered by the caller is what the player actually reads.
 */
export default function Product({ item, size }: ProductProps) {
  const u = size / 100;
  const { body, dark, accent, leaf } = item;

  // Shared shell: fill, darker bottom edge, no drop shadow (see the button shape language).
  const shell = (w: number, h: number, radius: string): CSSProperties => ({
    position: 'absolute',
    left: '50%',
    bottom: 0,
    transform: 'translateX(-50%)',
    width: w * u,
    height: h * u,
    background: body,
    borderRadius: radius,
    borderBottom: `${Math.max(2, 6 * u)}px solid ${dark}`,
    boxSizing: 'border-box',
  });

  const glyph = (fontSize: number, bottom: number): CSSProperties => ({
    position: 'absolute',
    left: '50%',
    bottom: bottom * u,
    transform: 'translateX(-50%)',
    fontSize: fontSize * u,
    lineHeight: 1,
    pointerEvents: 'none',
  });

  const band = (w: number, h: number, bottom: number): CSSProperties => ({
    position: 'absolute',
    left: '50%',
    bottom: bottom * u,
    transform: 'translateX(-50%)',
    width: w * u,
    height: h * u,
    background: accent ?? COLOURS.creamLight,
    borderRadius: 2 * u,
  });

  const layers: ReactNode[] = [];

  switch (item.shape) {
    case 'round':
      layers.push(<div key="b" style={{ ...shell(72, 72, '50%'), borderBottom: 'none', boxShadow: `inset 0 ${-8 * u}px 0 ${dark}` }} />);
      if (leaf) layers.push(<div key="l" style={{ position: 'absolute', left: '54%', bottom: 68 * u, width: 20 * u, height: 12 * u, background: leaf, borderRadius: `${10 * u}px ${2 * u}px` }} />);
      break;

    case 'cluster':
      [[-18, 0], [0, 6], [18, 0], [-9, 26], [9, 26]].forEach(([dx, dy], i) => {
        layers.push(<div key={`c${i}`} style={{ position: 'absolute', left: `calc(50% + ${dx * u}px)`, bottom: (8 + dy) * u, transform: 'translateX(-50%)', width: 26 * u, height: 26 * u, background: i % 2 ? dark : body, borderRadius: '50%' }} />);
      });
      if (leaf) layers.push(<div key="l" style={{ position: 'absolute', left: '50%', bottom: 62 * u, transform: 'translateX(-50%)', width: 18 * u, height: 11 * u, background: leaf, borderRadius: `${9 * u}px ${2 * u}px` }} />);
      break;

    case 'carton':
      layers.push(<div key="b" style={shell(52, 82, `${6 * u}px`)} />);
      // The gable that makes a carton read as a carton at 60px.
      layers.push(<div key="g" style={{ position: 'absolute', left: '50%', bottom: 76 * u, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: `${26 * u}px solid transparent`, borderRight: `${26 * u}px solid transparent`, borderBottom: `${16 * u}px solid ${body}` }} />);
      layers.push(<div key="a" style={band(52, 16, 34)} />);
      break;

    case 'cup':
      layers.push(<div key="b" style={{ ...shell(54, 58, `${4 * u}px ${4 * u}px ${14 * u}px ${14 * u}px`), clipPath: 'polygon(6% 0, 94% 0, 86% 100%, 14% 100%)' }} />);
      layers.push(<div key="a" style={{ ...band(58, 12, 52), borderRadius: 3 * u }} />);
      break;

    case 'box':
      layers.push(<div key="b" style={shell(60, 76, `${5 * u}px`)} />);
      layers.push(<div key="a" style={band(60, 18, 30)} />);
      break;

    case 'bag':
      layers.push(<div key="b" style={shell(58, 74, `${16 * u}px ${16 * u}px ${5 * u}px ${5 * u}px`)} />);
      layers.push(<div key="a" style={band(58, 16, 28)} />);
      break;

    case 'pouch':
      layers.push(<div key="b" style={shell(62, 70, `${5 * u}px ${5 * u}px ${18 * u}px ${18 * u}px`)} />);
      layers.push(<div key="a" style={band(62, 14, 32)} />);
      break;

    case 'jar':
      layers.push(<div key="b" style={shell(54, 62, `${8 * u}px`)} />);
      layers.push(<div key="k" style={{ position: 'absolute', left: '50%', bottom: 60 * u, transform: 'translateX(-50%)', width: 44 * u, height: 14 * u, background: dark, borderRadius: 4 * u }} />);
      layers.push(<div key="a" style={band(54, 18, 22)} />);
      break;

    case 'bottle':
      layers.push(<div key="b" style={shell(44, 60, `${6 * u}px`)} />);
      layers.push(<div key="n" style={{ position: 'absolute', left: '50%', bottom: 58 * u, transform: 'translateX(-50%)', width: 18 * u, height: 24 * u, background: body }} />);
      layers.push(<div key="k" style={{ position: 'absolute', left: '50%', bottom: 80 * u, transform: 'translateX(-50%)', width: 22 * u, height: 10 * u, background: dark, borderRadius: 3 * u }} />);
      layers.push(<div key="a" style={band(44, 16, 20)} />);
      break;

    case 'loaf':
      layers.push(<div key="b" style={shell(74, 52, `${26 * u}px ${26 * u}px ${6 * u}px ${6 * u}px`)} />);
      break;

    case 'buns':
      [[-20, 0], [20, 0], [0, 26]].forEach(([dx, dy], i) => {
        layers.push(<div key={`u${i}`} style={{ position: 'absolute', left: `calc(50% + ${dx * u}px)`, bottom: (6 + dy) * u, transform: 'translateX(-50%)', width: 34 * u, height: 26 * u, background: body, borderRadius: `${16 * u}px ${16 * u}px ${5 * u}px ${5 * u}px`, borderBottom: `${Math.max(2, 4 * u)}px solid ${dark}`, boxSizing: 'border-box' }} />);
      });
      break;
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }} aria-hidden="true">
      {layers}
      {item.emoji && <div style={glyph(item.shape === 'round' || item.shape === 'cluster' ? 34 : 26, item.shape === 'round' ? 20 : 40)}>{item.emoji}</div>}
    </div>
  );
}
