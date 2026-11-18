import { describe, it, expect } from 'vitest';
import {
  activeCategory, categoryStatus, shouldCompleteCategory, completeCategory,
  tileAction, pendingUnlock, afterScoreCard, normalizeSession, freshSession,
  CATEGORY_SESSION_SECONDS, tapOutcome,
} from '../sessionLedger';

describe('activeCategory / categoryStatus', () => {
  it('starts on memory', () => expect(activeCategory([])).toBe('memory'));
  it('moves in fixed order', () => expect(activeCategory(['memory'])).toBe('attention'));
  it('is null once all three are done', () =>
    expect(activeCategory(['memory', 'attention', 'executive'])).toBeNull());
  it('locks everything after the active one', () => {
    expect(categoryStatus('memory', ['memory'])).toBe('completed');
    expect(categoryStatus('attention', ['memory'])).toBe('active');
    expect(categoryStatus('executive', ['memory'])).toBe('locked');
  });
});

describe('shouldCompleteCategory', () => {
  it('is ten minutes (D1)', () => expect(CATEGORY_SESSION_SECONDS).toBe(600));
  it('fires at exactly 600 s in the active category', () =>
    expect(shouldCompleteCategory({ gameCategory: 'memory', completed: [], seconds: 600 })).toBe(true));
  it('does not fire at 599 s', () =>
    expect(shouldCompleteCategory({ gameCategory: 'memory', completed: [], seconds: 599 })).toBe(false));
  it('never fires for a completed category (D3)', () =>
    expect(shouldCompleteCategory({ gameCategory: 'memory', completed: ['memory'], seconds: 900 })).toBe(false));
  it('never fires once the day is done', () =>
    expect(shouldCompleteCategory({
      gameCategory: 'executive', completed: ['memory', 'attention', 'executive'], seconds: 900,
    })).toBe(false));
});

describe('completeCategory', () => {
  it('appends the active category', () =>
    expect(completeCategory(['memory'], 'attention')).toEqual(['memory', 'attention']));
  it('ignores a category that is not active', () => {
    const done = ['memory'];
    expect(completeCategory(done, 'memory')).toBe(done);
    expect(completeCategory(done, 'executive')).toBe(done);
  });
});

describe('tileAction', () => {
  it('maps status to the tap result', () => {
    expect(tileAction('memory', [])).toBe('play');
    expect(tileAction('attention', [])).toBe('locked');
    expect(tileAction('memory', ['memory'])).toBe('completed');
  });
});

describe('pendingUnlock', () => {
  it('reports a newly active category once', () => {
    expect(pendingUnlock(['memory'], ['memory'])).toBe('attention');
    expect(pendingUnlock(['memory'], ['memory', 'attention'])).toBeNull();
  });
  it('never reports memory on a fresh day', () => expect(pendingUnlock([], ['memory'])).toBeNull());
  it('is null when the day is done', () =>
    expect(pendingUnlock(['memory', 'attention', 'executive'], ['memory'])).toBeNull());
});

describe('afterScoreCard (C4: scorecard, summary, Home)', () => {
  it('goes to the summary of the category just completed', () => {
    expect(afterScoreCard(['memory'])).toBe('/app/category-summary/memory');
    expect(afterScoreCard(['memory', 'attention', 'executive'])).toBe('/app/category-summary/executive');
  });
  it('goes home when nothing is complete', () => expect(afterScoreCard([])).toBe('/app/home'));
});

describe('normalizeSession', () => {
  const TODAY = '2026-11-18';

  it('starts a fresh day for a missing or stale session', () => {
    expect(normalizeSession(undefined, TODAY)).toEqual(freshSession(TODAY));
    expect(normalizeSession({ ...freshSession('2026-11-17'), categoriesCompleted: ['memory'] }, TODAY))
      .toEqual(freshSession(TODAY));
  });

  it('keeps same-day progress', () => {
    const s = normalizeSession({ ...freshSession(TODAY), secondsInCurrentCategory: 420 }, TODAY);
    expect(s.secondsInCurrentCategory).toBe(420);
  });

  it('reads a v1.35 session without losing progress', () => {
    const old = {
      date: TODAY, sessionStarted: true, plannedGames: ['market-memory', 'spot-focus', 'serve-guests'],
      focusCategory: null, categoriesCompleted: ['memory'], currentCategory: 'attention',
      currentGameId: 'spot-focus', secondsInCurrentCategory: 75, sessionStartedAt: 1,
    };
    const s = normalizeSession(old, TODAY);
    expect(s.categoriesCompleted).toEqual(['memory']);
    expect(s.currentCategory).toBe('attention');
    expect(s.secondsInCurrentCategory).toBe(75);
    expect(s.gamesPlayed).toEqual([]);
    expect(s.unlocksSeen).toEqual(['memory', 'attention']);
    expect(s.educationSeen).toBe(true);
    expect('plannedGames' in s).toBe(false);
  });
});

describe('tapOutcome (review I1: Home left open overnight)', () => {
  it("decides from today's ledger, not a stale one still on screen", () => {
    const yesterday = { ...freshSession('2026-11-17'), categoriesCompleted: ['memory'] };
    expect(tapOutcome(yesterday, '2026-11-18', 'attention')).toBe('locked');
    expect(tapOutcome(yesterday, '2026-11-18', 'memory')).toBe('play');
  });
  it('matches tileAction on a same-day ledger', () => {
    const today = { ...freshSession('2026-11-18'), categoriesCompleted: ['memory'] };
    expect(tapOutcome(today, '2026-11-18', 'memory')).toBe('completed');
    expect(tapOutcome(today, '2026-11-18', 'attention')).toBe('play');
  });
});
