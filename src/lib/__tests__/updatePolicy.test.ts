import { describe, expect, it } from 'vitest';
import { isSafeToUpdate } from '../updatePolicy';

describe('isSafeToUpdate', () => {
  it.each(['/', '/app/home', '/app/summary', '/app/free-play', '/app/home/'])(
    'lets an update take over on %s',
    (path) => expect(isSafeToUpdate(path)).toBe(true),
  );

  it.each([
    '/app/game/spot-focus',
    '/app/game/spot-focus/title',
    '/app/intro/memory',
    '/app/education',
    '/app/settings',
    '/signup',
    '/signin',
    '/app/home-extra',
  ])('holds an update back on %s', (path) => expect(isSafeToUpdate(path)).toBe(false));
});
