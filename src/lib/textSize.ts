import type { TextSize } from '../styles/tokens';

/**
 * The `<html>` class that carries each text size.
 *
 * An explicit lookup rather than `` `text-size-${size}` ``, because Tailwind's content
 * scanner matches literal strings: a class name assembled at runtime appears in no source
 * file, so its rule is dropped from the production build.
 *
 * That is not hypothetical. It is what happened here. `text-size-large` and
 * `text-size-xlarge` were absent from the compiled CSS entirely, so a resident who chose
 * Large or Extra Large in Settings saw no change at all - the toggle moved, the setting
 * persisted, and nothing resized. `text-size-normal` survived by luck alone, because
 * `main.tsx` happened to contain that one literal in its fallback path.
 *
 * These must stay whole literals. Do not rebuild them from a variable, and do not reach
 * for a Tailwind `safelist` instead: the safelist fixes the symptom in config while
 * leaving the source looking correct, and it rots silently the day a fourth size is added.
 * With this map, a new `TextSize` fails to compile until its class is declared here.
 */
export const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  normal: 'text-size-normal',
  large: 'text-size-large',
  xlarge: 'text-size-xlarge',
};

/** Every `text-size-*` class, for clearing the previous one off `<html>`. */
export const ALL_TEXT_SIZE_CLASSES = Object.values(TEXT_SIZE_CLASS);

/**
 * The class for a stored text size, falling back to normal.
 *
 * The argument is deliberately loose: `main.tsx` reads it straight out of a localStorage
 * blob before the store has validated anything, so it can be any shape at all.
 */
export function textSizeClass(size: unknown): string {
  // `hasOwnProperty`, not `in`: `'toString' in TEXT_SIZE_CLASS` is true via the prototype
  // chain, which would put a stringified function onto <html>.
  return typeof size === 'string' && Object.prototype.hasOwnProperty.call(TEXT_SIZE_CLASS, size)
    ? TEXT_SIZE_CLASS[size as TextSize]
    : TEXT_SIZE_CLASS.normal;
}

/** Swap `<html>`'s text-size class for the one matching `size`. */
export function applyTextSizeClass(size: unknown): void {
  const html = document.documentElement;
  html.classList.remove(...ALL_TEXT_SIZE_CLASSES);
  html.classList.add(textSizeClass(size));
}
