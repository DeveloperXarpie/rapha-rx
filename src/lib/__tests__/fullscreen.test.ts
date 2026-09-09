import { describe, it, expect, beforeEach } from 'vitest';
import {
  arm, disarm, isArmed, isFullscreen, isSupported, enter, exit,
  type FullscreenDoc,
} from '../fullscreen';

/**
 * The fullscreen wrapper is the one place that touches the browser API, so these
 * tests are the only guard it gets - the suite runs in node with no DOM, and
 * React components are not tested in this repo at all.
 *
 * Every case here is a real browser state we have to survive: a browser with no
 * Fullscreen API, a request the browser refuses (a stale gesture, a permissions
 * policy), and the double-call that the re-entry listener would otherwise make on
 * every single tap.
 */

type Calls = { request: number; exit: number };

function fakeDoc(opts: {
  supported?: boolean;
  fullscreen?: boolean;
  reject?: boolean;
} = {}): { doc: FullscreenDoc; calls: Calls } {
  const { supported = true, fullscreen = false, reject = false } = opts;
  const calls: Calls = { request: 0, exit: 0 };

  const element = supported
    ? {
        requestFullscreen: () => {
          calls.request += 1;
          return reject ? Promise.reject(new Error('refused')) : Promise.resolve();
        },
      }
    : {};

  const doc = {
    documentElement: element,
    fullscreenElement: fullscreen ? element : null,
    exitFullscreen: supported
      ? () => {
          calls.exit += 1;
          return Promise.resolve();
        }
      : undefined,
  } as unknown as FullscreenDoc;

  return { doc, calls };
}

beforeEach(() => {
  disarm();
});

describe('support detection', () => {
  it('reports support when the element carries requestFullscreen', () => {
    expect(isSupported(fakeDoc().doc)).toBe(true);
  });

  it('reports no support when it does not', () => {
    expect(isSupported(fakeDoc({ supported: false }).doc)).toBe(false);
  });
});

describe('entering', () => {
  it('requests fullscreen when the page is not already fullscreen', async () => {
    const { doc, calls } = fakeDoc();
    await enter(doc);
    expect(calls.request).toBe(1);
  });

  it('does nothing when already fullscreen', async () => {
    const { doc, calls } = fakeDoc({ fullscreen: true });
    await enter(doc);
    expect(calls.request).toBe(0);
  });

  it('does nothing on a browser without the API', async () => {
    const { doc, calls } = fakeDoc({ supported: false });
    await enter(doc);
    expect(calls.request).toBe(0);
  });

  it('swallows a refused request rather than throwing', async () => {
    const { doc } = fakeDoc({ reject: true });
    await expect(enter(doc)).resolves.toBeUndefined();
  });
});

describe('exiting', () => {
  it('exits when the page is fullscreen', async () => {
    const { doc, calls } = fakeDoc({ fullscreen: true });
    await exit(doc);
    expect(calls.exit).toBe(1);
  });

  it('does nothing when the page is not fullscreen', async () => {
    const { doc, calls } = fakeDoc();
    await exit(doc);
    expect(calls.exit).toBe(0);
  });

  it('does nothing on a browser without the API', async () => {
    const { doc, calls } = fakeDoc({ supported: false, fullscreen: true });
    await exit(doc);
    expect(calls.exit).toBe(0);
  });
});

describe('the armed flag', () => {
  it('starts disarmed', () => {
    expect(isArmed()).toBe(false);
  });

  it('is armed by arm() and cleared by disarm()', () => {
    arm();
    expect(isArmed()).toBe(true);
    disarm();
    expect(isArmed()).toBe(false);
  });
});

describe('fullscreen state', () => {
  it('reads the current state off the document', () => {
    expect(isFullscreen(fakeDoc({ fullscreen: true }).doc)).toBe(true);
    expect(isFullscreen(fakeDoc().doc)).toBe(false);
  });
});
