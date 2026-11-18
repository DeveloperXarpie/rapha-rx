import { describe, it, expect } from 'vitest';
import { countsForSession } from '../roundLog';

describe('countsForSession (D3, D5)', () => {
  it('counts a round in the open category', () =>
    expect(countsForSession({ gameCategory: 'memory', completed: [], debug: false })).toBe(true));
  it('ignores a completed category', () =>
    expect(countsForSession({ gameCategory: 'memory', completed: ['memory'], debug: false })).toBe(false));
  it('ignores a locked category reached through Free Play', () =>
    expect(countsForSession({ gameCategory: 'executive', completed: ['memory', 'attention', 'executive'], debug: false })).toBe(false));
  it('ignores a debug probe', () =>
    expect(countsForSession({ gameCategory: 'memory', completed: [], debug: true })).toBe(false));
});
