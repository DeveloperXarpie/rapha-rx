import { describe, it, expect } from 'vitest';
import { TEXT_SIZE_CLASS, ALL_TEXT_SIZE_CLASSES, textSizeClass } from '../textSize';

describe('textSizeClass', () => {
  it('maps every text size to its own class', () => {
    expect(textSizeClass('normal')).toBe('text-size-normal');
    expect(textSizeClass('large')).toBe('text-size-large');
    expect(textSizeClass('xlarge')).toBe('text-size-xlarge');
  });

  it('falls back to normal for anything unrecognised', () => {
    // main.tsx reads this out of a raw localStorage blob, so it can be any shape.
    expect(textSizeClass(undefined)).toBe('text-size-normal');
    expect(textSizeClass(null)).toBe('text-size-normal');
    expect(textSizeClass('enormous')).toBe('text-size-normal');
    expect(textSizeClass(42)).toBe('text-size-normal');
    expect(textSizeClass({})).toBe('text-size-normal');
  });

  it('does not treat inherited Object properties as sizes', () => {
    // `'toString' in TEXT_SIZE_CLASS` is true via the prototype chain, so a naive
    // `in` check would return undefined here and put "undefined" on <html>.
    expect(textSizeClass('toString')).toBe('text-size-normal');
    expect(textSizeClass('constructor')).toBe('text-size-normal');
  });

  it('exposes every class for clearing the previous one', () => {
    expect(ALL_TEXT_SIZE_CLASSES).toHaveLength(3);
    expect(new Set(ALL_TEXT_SIZE_CLASSES).size).toBe(3);
    expect(ALL_TEXT_SIZE_CLASSES).toEqual(Object.values(TEXT_SIZE_CLASS));
  });

  it('holds whole literals, never assembled fragments', () => {
    // The point of this module. If a value is ever built as `text-size-${x}`, Tailwind
    // drops the rule from the build and the setting silently stops working.
    for (const cls of ALL_TEXT_SIZE_CLASSES) {
      expect(cls).toMatch(/^text-size-(normal|large|xlarge)$/);
    }
  });
});
