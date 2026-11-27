import type { DataStore } from '@x10/shared/data';
import { PermissionError, RuleError } from './errors';

import {
  limits,
  type Book,
  type Chapter,
  type Meeting,
  type Membership,
  type MembershipStatus,
  type Note,
  type NoteKind,
  type Progress,
  type Schema,
} from '../model';
import { validateProgressEntry } from './rules';

export interface CircleData {
  book: Book | null;
  chapters: Chapter[];
  meetings: Meeting[];
  memberships: Membership[];
  progress: Progress[];
  notes: Note[];
}

export async function loadCircleData(store: DataStore<Schema>): Promise<CircleData> {
  const [books, chapters, meetings, memberships, progress, notes] = await Promise.all([
    store.repo('Book').list(),
    store.repo('Chapter').list(),
    store.repo('Meeting').list(),
    store.repo('Membership').list(),
    store.repo('Progress').list(),
    store.repo('Note').list(),
  ]);

  const book = books.find((b) => b.status === 'reading') ?? books[0] ?? null;
  if (!book) {
    return { book: null, chapters: [], meetings: [], memberships: [], progress: [], notes: [] };
  }

  return {
    book,
    chapters: chapters.filter((c) => c.bookId === book.id).sort((a, b) => a.number - b.number),
    meetings: meetings.filter((m) => m.bookId === book.id).sort((a, b) => a.on.localeCompare(b.on)),
    memberships: memberships.filter((m) => m.bookId === book.id),
    progress: progress
      .filter((p) => p.bookId === book.id)
      .sort((a, b) => a.on.localeCompare(b.on) || a.page - b.page),
    notes: notes
      .filter((n) => n.bookId === book.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function logProgress(
  store: DataStore<Schema>,
  input: {
    book: Book;
    readerSub: string;
    on: string;
    page: number;
    minutes: number;
  },
): Promise<Progress> {
  if (!Number.isInteger(input.minutes) || input.minutes < limits.minutes.min || input.minutes > limits.minutes.max) {
    throw new RuleError(`Minutes must be between ${limits.minutes.min} and ${limits.minutes.max}.`);
  }

  const repo = store.repo('Progress');
  const all = await repo.list();
  const mine = all.filter((r) => r.bookId === input.book.id && r.readerSub === input.readerSub);

  validateProgressEntry(mine, input.on, input.page, input.book.totalPages);

  // Same-day correction updates the existing row for that day if present
  const day = input.on.slice(0, 10);
  const sameDay = mine.find((r) => r.on.slice(0, 10) === day);
  if (sameDay) {
    return repo.update(sameDay.id, {
      on: input.on,
      page: input.page,
      minutes: input.minutes,
    });
  }

  return repo.create({
    bookId: input.book.id,
    readerSub: input.readerSub,
    on: input.on,
    page: input.page,
    minutes: input.minutes,
  });
}

export async function addNote(
  store: DataStore<Schema>,
  input: {
    bookId: string;
    chapter: number;
    authorSub: string;
    authorName: string;
    kind: NoteKind;
    body: string;
    nowIso: string;
  },
): Promise<Note> {
  const body = input.body.trim();
  if (body.length < limits.noteBody.min || body.length > limits.noteBody.max) {
    throw new RuleError(`Note must be between ${limits.noteBody.min} and ${limits.noteBody.max} characters.`);
  }
  return store.repo('Note').create({
    bookId: input.bookId,
    chapter: input.chapter,
    authorSub: input.authorSub,
    authorName: input.authorName,
    kind: input.kind,
    body,
    createdAt: input.nowIso,
  });
}

export async function deleteNote(
  store: DataStore<Schema>,
  note: Note,
  actorSub: string,
): Promise<void> {
  if (note.authorSub !== actorSub) {
    throw new PermissionError('Only the author can delete their margin note.');
  }
  await store.repo('Note').remove(note.id);
}

export async function updateMembershipStatus(
  store: DataStore<Schema>,
  membership: Membership,
  actorSub: string,
  status: MembershipStatus,
): Promise<Membership> {
  if (membership.readerSub !== actorSub) {
    throw new PermissionError('Only the reader can change their own reading status.');
  }
  return store.repo('Membership').update(membership.id, { status });
}

export async function addMeeting(
  store: DataStore<Schema>,
  input: {
    bookId: string;
    on: string;
    endChapter: number;
    topic: string | null;
    isConvenor: boolean;
  },
): Promise<Meeting> {
  if (!input.isConvenor) {
    throw new PermissionError('Only the convenor can schedule meetings.');
  }
  return store.repo('Meeting').create({
    bookId: input.bookId,
    on: input.on,
    endChapter: input.endChapter,
    topic: input.topic?.trim() || null,
  });
}

export async function updateMeetingDate(
  store: DataStore<Schema>,
  input: {
    meetingId: string;
    on: string;
    endChapter: number;
    topic: string | null;
    isConvenor: boolean;
  },
): Promise<Meeting> {
  if (!input.isConvenor) {
    throw new PermissionError('Only the convenor can reschedule meetings.');
  }
  return store.repo('Meeting').update(input.meetingId, {
    on: input.on,
    endChapter: input.endChapter,
    topic: input.topic?.trim() || null,
  });
}
