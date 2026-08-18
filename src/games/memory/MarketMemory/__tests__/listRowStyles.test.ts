import { describe, it, expect } from 'vitest';
import { listRowStyles } from '../listRowStyles';

/**
 * These tests exist because of a real bug: the shopping list stayed fully visible under
 * the retention cover and was still there when the cover lifted, handing the player the
 * answer instead of testing them.
 *
 * The cause was a CSS cascade rule, not a logic error. The row's entrance animation ran
 * with `fill-mode: both`, animations outrank normal declarations, and so the animation's
 * final `opacity: 1` overrode the `opacity: 0` that blanking set. React was setting the
 * declaration correctly the whole time; the browser was ignoring it.
 *
 * A DOM test cannot catch this - jsdom does not run animations at all, so it would report
 * the bug as fixed. What can be checked, and what actually prevents a recurrence, is the
 * structural invariant: whatever element is animated must not be the element that gets
 * blanked.
 */
describe('listRowStyles', () => {
  it('never animates and blanks the same element', () => {
    // The regression itself. An element carrying `animation` with a filled end state can
    // never afterwards be hidden with `opacity`.
    for (const covered of [false, true]) {
      for (const reduced of [false, true]) {
        const s = listRowStyles(0, covered, reduced);
        for (const [name, style] of Object.entries(s)) {
          const animated = style.animation !== undefined;
          const blanked = style.opacity !== undefined;
          expect(animated && blanked, `${name} both animates and sets opacity`).toBe(false);
        }
      }
    }
  });

  it('blanks the row when the cover is down', () => {
    expect(listRowStyles(0, true, false).content.opacity).toBe(0);
  });

  it('shows the row while the list is being read', () => {
    expect(listRowStyles(0, false, false).content.opacity).toBe(1);
  });

  it('puts the entrance animation on the outer element', () => {
    expect(listRowStyles(0, false, false).entrance.animation).toContain('mm-slidein');
  });

  it('swaps the slide for a plain fade when motion is reduced', () => {
    const s = listRowStyles(0, false, true);
    expect(s.entrance.animation).toContain('mm-fade');
    expect(s.entrance.animation).not.toContain('mm-slidein');
  });

  it('staggers rows down the page', () => {
    expect(listRowStyles(0, false, false).entrance.animation).toContain('0ms both');
    expect(listRowStyles(2, false, false).entrance.animation).toContain('180ms both');
  });

  it('keeps blanking instant enough to be hidden by the cover landing', () => {
    // The cover lands 40ms before the list blanks. A transition longer than that gap
    // would let the player watch the rows dissolve through the edges of the cover.
    const s = listRowStyles(0, true, false);
    const ms = Number(/(\d+)ms/.exec(String(s.content.transition))?.[1]);
    expect(ms).toBeLessThanOrEqual(120);
  });
});
