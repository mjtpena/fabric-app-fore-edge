import { describe, expect, it } from 'vitest';

import type { Chapter, Membership, Note, Progress } from '../model';
import {
  catchUpMinutes,
  classifyReaderState,
  computeFogLine,
  effectiveDaysBetween,
  expectedPageToday,
  formatDuration,
  getNoteVisibility,
  medianPagesPerHour,
  requiredPace,
  shouldOfferPause,
  validateProgressEntry,
  willMakeIt,
} from './rules';

const CHAPTERS: Chapter[] = [
  { id: 'c1', bookId: 'b1', number: 1, title: 'Foundations', startPage: 1, endPage: 30 },
  { id: 'c4', bookId: 'b1', number: 4, title: 'Consensus', startPage: 91, endPage: 120 },
  { id: 'c7', bookId: 'b1', number: 7, title: 'Replication', startPage: 181, endPage: 210 },
];

describe('Rule 1: effectiveDaysBetween & requiredPace', () => {
  it('counts weekend days at half weight across a Friday to Monday span (AC #2)', () => {
    // 2026-11-27 is Friday; Sat (0.5) + Sun (0.5) + Mon (1.0) = 2.0 effective days
    expect(effectiveDaysBetween('2026-11-27', '2026-11-30')).toBe(2);
    // 60 pages left over 2 effective days = 30 pages / effective day
    expect(requiredPace(60, effectiveDaysBetween('2026-11-27', '2026-11-30'))).toBe(30);
  });

  it('returns 0 when target date is today or in the past', () => {
    expect(effectiveDaysBetween('2026-11-27', '2026-11-27')).toBe(0);
    expect(effectiveDaysBetween('2026-11-28', '2026-11-27')).toBe(0);
  });

  it('counts a full 7-day week as 6 effective days (5 weekdays + 2 * 0.5)', () => {
    expect(effectiveDaysBetween('2026-11-23', '2026-11-30')).toBe(6);
  });
});

describe('Rule 2: expectedPageToday, classifyReaderState & willMakeIt', () => {
  it('interpolates expected page and classifies ahead / on_pace / behind', () => {
    expect(expectedPageToday(150, 300, 5, 10)).toBe(225);
    expect(classifyReaderState(235, 225)).toBe('ahead');
    expect(classifyReaderState(234, 225)).toBe('on_pace');
    expect(classifyReaderState(216, 225)).toBe('on_pace');
    expect(classifyReaderState(215, 225)).toBe('behind');
  });

  it('computes willMakeIt from 7-day pace and effective days left', () => {
    expect(willMakeIt(200, 260, 20, 3)).toBe(true);
    expect(willMakeIt(200, 260, 15, 3)).toBe(false);
    expect(willMakeIt(260, 260, 0, 0)).toBe(true);
  });
});

describe('Rule 3: spoiler lock (AC #1)', () => {
  const ch7Note: Note = {
    id: 'n1',
    bookId: 'b1',
    chapter: 7,
    authorSub: 'reader-a',
    authorName: 'Reader A',
    kind: 'insight',
    body: 'Chapter 7 reveals the split-brain trade-off.',
    createdAt: '2026-11-25T10:00:00Z',
  };

  it('hides chapter 7 note from a reader on chapter 4, and unlocks once they pass startPage', () => {
    const locked = getNoteVisibility(ch7Note, CHAPTERS, 'reader-b', 110, false);
    expect(locked.visible).toBe(false);
    expect(locked.isSpoiler).toBe(true);

    const unlocked = getNoteVisibility(ch7Note, CHAPTERS, 'reader-b', 181, false);
    expect(unlocked.visible).toBe(true);
    expect(unlocked.isSpoiler).toBe(false);
  });

  it('always shows own notes to the author and shows all notes to convenor with spoiler tag', () => {
    const authorView = getNoteVisibility(ch7Note, CHAPTERS, 'reader-a', 100, false);
    expect(authorView.visible).toBe(true);
    expect(authorView.isSpoiler).toBe(false);

    const convenorView = getNoteVisibility(ch7Note, CHAPTERS, 'convenor', 120, true);
    expect(convenorView.visible).toBe(true);
    expect(convenorView.isSpoiler).toBe(true);
  });
});

describe('Rule 4: fog line (AC #3)', () => {
  it('ignores paused and dropped readers when computing the fog line', () => {
    const memberships: Membership[] = [
      { id: 'm1', bookId: 'b1', readerSub: 'r1', readerName: 'R1', status: 'reading', joinedOn: '2026-11-01' },
      { id: 'm2', bookId: 'b1', readerSub: 'r2', readerName: 'R2', status: 'reading', joinedOn: '2026-11-01' },
      { id: 'm3', bookId: 'b1', readerSub: 'r3', readerName: 'R3', status: 'paused', joinedOn: '2026-11-01' },
      { id: 'm4', bookId: 'b1', readerSub: 'r4', readerName: 'R4', status: 'dropped', joinedOn: '2026-11-01' },
    ];
    const pages = new Map([
      ['r1', 210],
      ['r2', 145],
      ['r3', 40],
      ['r4', 12],
    ]);
    expect(computeFogLine(memberships, pages)).toBe(145);
  });
});

describe('Rule 5: catch-up time, pause prompt & backwards progress (AC #4 & #5)', () => {
  it('calculates catch-up time from the reader median pages per hour (AC #4)', () => {
    const rows: Progress[] = [
      // +30 pages in 60m => 30 pph
      { id: 'p1', bookId: 'b1', readerSub: 'r1', on: '2026-11-10', page: 30, minutes: 60 },
      // +20 pages in 60m => 20 pph
      { id: 'p2', bookId: 'b1', readerSub: 'r1', on: '2026-11-12', page: 50, minutes: 60 },
      // +60 pages in 60m => 60 pph
      { id: 'p3', bookId: 'b1', readerSub: 'r1', on: '2026-11-14', page: 110, minutes: 60 },
    ];
    // Median of [20, 30, 60] = 30 pph
    const pph = medianPagesPerHour(rows);
    expect(pph).toBe(30);
    // 45 pages behind at 30 pph = 90 minutes = 1h 30m
    expect(catchUpMinutes(45, pph)).toBe(90);
    expect(formatDuration(90)).toBe('1h 30m');
  });

  it('offers pause after 21 days of inactivity', () => {
    expect(shouldOfferPause('2026-11-01', '2026-11-22')).toBe(true);
    expect(shouldOfferPause('2026-11-05', '2026-11-22')).toBe(false);
  });

  it('refuses a lower page than previous day, but allows a same-day correction (AC #5)', () => {
    const existing: Progress[] = [
      { id: 'p1', bookId: 'b1', readerSub: 'r1', on: '2026-11-24', page: 150, minutes: 45 },
      { id: 'p2', bookId: 'b1', readerSub: 'r1', on: '2026-11-26', page: 195, minutes: 60 },
    ];
    // Lower than prior day (150) on 2026-11-26 -> refused
    expect(() => validateProgressEntry(existing, '2026-11-26', 140, 420)).toThrow(/cannot go backwards/i);
    // Same-day correction from 195 down to 180 (>= prior day 150) -> allowed
    expect(() => validateProgressEntry(existing, '2026-11-26', 180, 420)).not.toThrow();
    // Next day lower than 195 -> refused
    expect(() => validateProgressEntry(existing, '2026-11-27', 190, 420)).toThrow(/cannot go backwards/i);
  });
});
