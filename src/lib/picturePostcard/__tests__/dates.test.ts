import { describe, it, expect } from 'vitest';
import { todayISO, daysBetweenISO, isoDaysAgo } from '../../dates';

describe('dates', () => {
  it('todayISO returns UTC YYYY-MM-DD', () => {
    expect(todayISO()).toBe(new Date().toISOString().split('T')[0]);
  });
  it('daysBetweenISO computes calendar-day difference', () => {
    expect(daysBetweenISO('2026-07-24', '2026-07-31')).toBe(7);
    expect(daysBetweenISO('2026-07-31', '2026-07-24')).toBe(-7);
  });
  it('isoDaysAgo returns an earlier ISO date', () => {
    expect(daysBetweenISO(isoDaysAgo(30), todayISO())).toBe(30);
  });
});
