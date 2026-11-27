import { RuleError } from './errors';

import type { Book, Chapter, Meeting, Membership, Note, Progress } from '../model';
import {
  FALLBACK_PAGES_PER_HOUR,
  INACTIVE_TODAY_DAYS,
  PACE_BAND_PAGES,
  PAUSE_PROMPT_DAYS,
  RECENT_PACE_DAYS,
  WEEKEND_WEIGHT,
} from './config';

export type ReaderPaceState = 'ahead' | 'on_pace' | 'behind';

export interface NoteVisibility {
  visible: boolean;
  isSpoiler: boolean;
  chapterStartPage: number;
}

export interface ReaderSummary {
  membership: Membership;
  latestPage: number;
  latestChapter: number;
  lastProgressOn: string | null;
  daysInactive: number;
  expectedPage: number;
  deltaPages: number;
  state: ReaderPaceState;
  pace7d: number;
  requiredPace: number;
  willMakeIt: boolean;
  pagesPerHour: number;
  catchUpMinutes: number;
  offerPause: boolean;
  progressRows: Progress[];
}

/** Parse YYYY-MM-DD (or ISO string) to UTC midnight Date. */
export function toUtcDay(iso: string): Date {
  const day = iso.slice(0, 10);
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function calendarDaysBetween(fromIso: string, toIso: string): number {
  const a = toUtcDay(fromIso).getTime();
  const b = toUtcDay(toIso).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Rule 1: Effective days between two dates (exclusive of start, inclusive of end).
 * Weekdays weigh 1, Saturday and Sunday weigh WEEKEND_WEIGHT (0.5).
 */
export function effectiveDaysBetween(fromIso: string, toIso: string): number {
  const start = toUtcDay(fromIso);
  const end = toUtcDay(toIso);
  if (end <= start) return 0;

  let total = 0;
  const cur = new Date(start.getTime());
  while (cur < end) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const dow = cur.getUTCDay(); // 0 = Sun, 6 = Sat
    total += dow === 0 || dow === 6 ? WEEKEND_WEIGHT : 1;
  }
  return total;
}

/** Rule 1: Required pace = pages left to meeting's last page / effective days left. */
export function requiredPace(pagesLeft: number, effectiveDaysLeft: number): number {
  if (pagesLeft <= 0) return 0;
  if (effectiveDaysLeft <= 0) return pagesLeft;
  return Number((pagesLeft / effectiveDaysLeft).toFixed(1));
}

/**
 * Rule 2: Expected page today = meetingStartPage + (endPage - startPage) * share of effective days elapsed.
 */
export function expectedPageToday(
  meetingStartPage: number,
  meetingEndPage: number,
  elapsedEffectiveDays: number,
  totalEffectiveDays: number,
): number {
  if (totalEffectiveDays <= 0) return meetingEndPage;
  const share = Math.max(0, Math.min(1, elapsedEffectiveDays / totalEffectiveDays));
  return Math.round(meetingStartPage + (meetingEndPage - meetingStartPage) * share);
}

/** Rule 2: Ahead if >= 10 pages past expected, behind if >= 10 short, on_pace otherwise. */
export function classifyReaderState(currentPage: number, expectedPage: number): ReaderPaceState {
  const delta = currentPage - expectedPage;
  if (delta >= PACE_BAND_PAGES) return 'ahead';
  if (delta <= -PACE_BAND_PAGES) return 'behind';
  return 'on_pace';
}

/** Rule 2: Reader's 7-day pace (pages per calendar day over last 7 days). */
export function sevenDayPace(progressRows: Progress[], nowIso: string): number {
  if (progressRows.length === 0) return 0;
  const sorted = [...progressRows].sort((a, b) => a.on.localeCompare(b.on));
  const latest = sorted[sorted.length - 1];
  const cutoffMs = toUtcDay(nowIso).getTime() - RECENT_PACE_DAYS * 86_400_000;

  // Find baseline page just before or at the 7-day window
  let baselinePage = 0;
  for (const row of sorted) {
    if (toUtcDay(row.on).getTime() <= cutoffMs) {
      baselinePage = row.page;
    }
  }
  const gained = Math.max(0, latest.page - baselinePage);
  return Number((gained / RECENT_PACE_DAYS).toFixed(1));
}

/** Rule 2: "Will make it" if 7-day pace * effective days left >= pages left. */
export function willMakeIt(
  currentPage: number,
  targetPage: number,
  pacePerDay: number,
  effectiveDaysLeft: number,
): boolean {
  const pagesLeft = Math.max(0, targetPage - currentPage);
  if (pagesLeft === 0) return true;
  if (effectiveDaysLeft <= 0) return false;
  return pacePerDay * effectiveDaysLeft >= pagesLeft;
}

/**
 * Rule 3: Spoiler lock.
 * A Note for chapter n is visible to a reader only when their latest page >= startPage of chapter n.
 * Author always sees their own; convenor sees all with a "spoiler" tag if beyond their own page.
 */
export function getNoteVisibility(
  note: Note,
  chapters: Chapter[],
  viewerSub: string,
  viewerLatestPage: number,
  isConvenor: boolean,
): NoteVisibility {
  const ch = chapters.find((c) => c.number === note.chapter);
  const chapterStartPage = ch ? ch.startPage : 1;
  const reached = viewerLatestPage >= chapterStartPage;

  if (note.authorSub === viewerSub) {
    return { visible: true, isSpoiler: false, chapterStartPage };
  }
  if (reached) {
    return { visible: true, isSpoiler: false, chapterStartPage };
  }
  if (isConvenor) {
    return { visible: true, isSpoiler: true, chapterStartPage };
  }
  return { visible: false, isSpoiler: true, chapterStartPage };
}

/**
 * Rule 4: Fog line = the page of the slowest reader whose status is 'reading'
 * (paused, dropped, and finished readers are excluded).
 */
export function computeFogLine(
  memberships: Membership[],
  latestPageBySub: Map<string, number>,
): number {
  const active = memberships.filter((m) => m.status === 'reading');
  if (active.length === 0) return 0;
  let minPage = Infinity;
  for (const m of active) {
    const p = latestPageBySub.get(m.readerSub) ?? 0;
    if (p < minPage) minPage = p;
  }
  return minPage === Infinity ? 0 : minPage;
}

/**
 * Rule 5: Personal median pages per hour from recent Progress rows with minutes > 0.
 * Computes delta pages per row (relative to previous row) divided by hours spent.
 */
export function medianPagesPerHour(progressRows: Progress[]): number {
  const sorted = [...progressRows].sort((a, b) => a.on.localeCompare(b.on) || a.page - b.page);
  const rates: number[] = [];
  let prevPage = 0;

  for (const row of sorted) {
    const delta = Math.max(0, row.page - prevPage);
    if (row.minutes > 0 && delta > 0) {
      rates.push(delta / (row.minutes / 60));
    }
    prevPage = row.page;
  }

  if (rates.length === 0) return FALLBACK_PAGES_PER_HOUR;
  rates.sort((a, b) => a - b);
  const mid = Math.floor(rates.length / 2);
  const median = rates.length % 2 === 1 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2;
  return Number(Math.max(1, median).toFixed(1));
}

/** Rule 5: Catch-up reading time in minutes = (pagesBehind / pph) * 60. */
export function catchUpMinutes(pagesBehind: number, pagesPerHour: number): number {
  if (pagesBehind <= 0) return 0;
  const rate = pagesPerHour > 0 ? pagesPerHour : FALLBACK_PAGES_PER_HOUR;
  return Math.round((pagesBehind / rate) * 60);
}

export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Rule 5: Offer a pause if no progress for PAUSE_PROMPT_DAYS (21) days. */
export function shouldOfferPause(lastProgressOn: string | null, nowIso: string): boolean {
  if (!lastProgressOn) return true;
  return calendarDaysBetween(lastProgressOn, nowIso) >= PAUSE_PROMPT_DAYS;
}

/**
 * Rule 5: Progress cannot go backwards except as a same-day correction.
 * Throws RuleError if invalid.
 */
export function validateProgressEntry(
  existingRows: Progress[],
  newOnIso: string,
  newPage: number,
  totalPages: number,
): void {
  if (!Number.isInteger(newPage) || newPage < 0 || newPage > totalPages) {
    throw new RuleError(`Page must be a whole number between 0 and ${totalPages}.`);
  }
  const newDay = newOnIso.slice(0, 10);
  const priorDays = existingRows.filter((r) => r.on.slice(0, 10) < newDay);
  if (priorDays.length === 0) return;

  const maxPriorPage = Math.max(...priorDays.map((r) => r.page));
  if (newPage < maxPriorPage) {
    throw new RuleError(
      `Page ${newPage} is behind your previous reading (${maxPriorPage}). Progress cannot go backwards except as a same-day correction.`,
    );
  }
}

export function chapterForPage(chapters: Chapter[], page: number): number {
  if (chapters.length === 0) return 1;
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  for (const ch of sorted) {
    if (page >= ch.startPage && page <= ch.endPage) return ch.number;
  }
  if (page < sorted[0].startPage) return 1;
  return sorted[sorted.length - 1].number;
}

export interface MeetingWindow {
  meeting: Meeting;
  startDateIso: string;
  startPage: number;
  endPage: number;
  totalEffectiveDays: number;
  elapsedEffectiveDays: number;
  remainingEffectiveDays: number;
  daysUntil: number;
}

export function resolveNextMeetingWindow(
  book: Book,
  chapters: Chapter[],
  meetings: Meeting[],
  nowIso: string,
): MeetingWindow | null {
  const sortedMeetings = [...meetings].sort((a, b) => a.on.localeCompare(b.on));
  if (sortedMeetings.length === 0) return null;

  const nowDay = nowIso.slice(0, 10);
  const nextIdx = sortedMeetings.findIndex((m) => m.on.slice(0, 10) >= nowDay);
  const idx = nextIdx === -1 ? sortedMeetings.length - 1 : nextIdx;
  const meeting = sortedMeetings[idx];
  const prev = idx > 0 ? sortedMeetings[idx - 1] : null;

  const endCh = chapters.find((c) => c.number === meeting.endChapter);
  const endPage = endCh ? endCh.endPage : book.totalPages;

  let startPage = 1;
  let startDateIso = book.startsOn;
  if (prev) {
    const prevCh = chapters.find((c) => c.number === prev.endChapter);
    startPage = prevCh ? prevCh.endPage : 1;
    startDateIso = prev.on;
  }

  const totalEffectiveDays = effectiveDaysBetween(startDateIso, meeting.on);
  const elapsedEffectiveDays = effectiveDaysBetween(startDateIso, nowIso);
  const remainingEffectiveDays = effectiveDaysBetween(nowIso, meeting.on);
  const daysUntil = calendarDaysBetween(nowIso, meeting.on);

  return {
    meeting,
    startDateIso,
    startPage,
    endPage,
    totalEffectiveDays,
    elapsedEffectiveDays,
    remainingEffectiveDays,
    daysUntil,
  };
}

export function buildReaderSummaries(
  book: Book,
  chapters: Chapter[],
  meetings: Meeting[],
  memberships: Membership[],
  progress: Progress[],
  nowIso: string,
): {
  window: MeetingWindow | null;
  expectedPage: number;
  fogLine: number;
  readers: ReaderSummary[];
  inactiveReaders: ReaderSummary[];
} {
  const window = resolveNextMeetingWindow(book, chapters, meetings, nowIso);
  const expectedPage = window
    ? expectedPageToday(
        window.startPage,
        window.endPage,
        window.elapsedEffectiveDays,
        window.totalEffectiveDays,
      )
    : 1;

  const targetPage = window ? window.endPage : book.totalPages;
  const effLeft = window ? window.remainingEffectiveDays : 0;

  const bySub = new Map<string, Progress[]>();
  for (const row of progress) {
    const list = bySub.get(row.readerSub) ?? [];
    list.push(row);
    bySub.set(row.readerSub, list);
  }

  const latestPageBySub = new Map<string, number>();
  const readers: ReaderSummary[] = memberships.map((m) => {
    const rows = (bySub.get(m.readerSub) ?? []).sort(
      (a, b) => a.on.localeCompare(b.on) || a.page - b.page,
    );
    const latest = rows.length > 0 ? rows[rows.length - 1] : null;
    const latestPage = latest ? latest.page : 0;
    latestPageBySub.set(m.readerSub, latestPage);

    const lastProgressOn = latest ? latest.on : null;
    const daysInactive = lastProgressOn
      ? Math.max(0, calendarDaysBetween(lastProgressOn, nowIso))
      : Math.max(0, calendarDaysBetween(m.joinedOn, nowIso));

    const deltaPages = latestPage - expectedPage;
    const state = classifyReaderState(latestPage, expectedPage);
    const pace7d = sevenDayPace(rows, nowIso);
    const pagesLeft = Math.max(0, targetPage - latestPage);
    const reqPace = requiredPace(pagesLeft, effLeft);
    const makeIt = willMakeIt(latestPage, targetPage, pace7d, effLeft);
    const pph = medianPagesPerHour(rows);
    const behindPages = Math.max(0, expectedPage - latestPage);
    const catchUp = catchUpMinutes(behindPages, pph);
    const offerPause = m.status === 'reading' && shouldOfferPause(lastProgressOn, nowIso);

    return {
      membership: m,
      latestPage,
      latestChapter: chapterForPage(chapters, latestPage),
      lastProgressOn,
      daysInactive,
      expectedPage,
      deltaPages,
      state,
      pace7d,
      requiredPace: reqPace,
      willMakeIt: makeIt,
      pagesPerHour: pph,
      catchUpMinutes: catchUp,
      offerPause,
      progressRows: rows,
    };
  });

  const fogLine = computeFogLine(memberships, latestPageBySub);
  const inactiveReaders = readers.filter(
    (r) => r.membership.status === 'reading' && r.daysInactive >= INACTIVE_TODAY_DAYS,
  );

  return { window, expectedPage, fogLine, readers, inactiveReaders };
}
