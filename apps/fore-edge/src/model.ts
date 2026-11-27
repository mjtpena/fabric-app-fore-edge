import type { EntityDefs } from '@x10/shared/data';
import { AppMarkerDef, PersonDef, type AppMarker, type Person } from '@x10/shared/identity';

export type BookStatus = 'planned' | 'reading' | 'finished';
export type MembershipStatus = 'reading' | 'paused' | 'finished' | 'dropped';
export type NoteKind = 'question' | 'insight' | 'disagreement';

export const limits = {
  bookTitle: { min: 3, max: 100 },
  author: { max: 80 },
  chapterTitle: { max: 100 },
  meetingTopic: { max: 100 },
  readerName: { max: 100 },
  noteBody: { min: 3, max: 500 },
  minutes: { min: 0, max: 600 },
} as const;

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  startsOn: string;
  status: BookStatus;
  convenorSub: string;
}

export interface Chapter {
  id: string;
  bookId: string;
  number: number;
  title: string;
  startPage: number;
  endPage: number;
}

export interface Meeting {
  id: string;
  bookId: string;
  on: string;
  endChapter: number;
  topic: string | null;
}

export interface Membership {
  id: string;
  bookId: string;
  readerSub: string;
  readerName: string;
  status: MembershipStatus;
  joinedOn: string;
}

export interface Progress {
  id: string;
  bookId: string;
  readerSub: string;
  on: string;
  page: number;
  minutes: number;
}

export interface Note {
  id: string;
  bookId: string;
  chapter: number;
  authorSub: string;
  authorName: string;
  kind: NoteKind;
  body: string;
  createdAt: string;
}

export type Schema = {
  Person: Person;
  AppMarker: AppMarker;
  Book: Book;
  Chapter: Chapter;
  Meeting: Meeting;
  Membership: Membership;
  Progress: Progress;
  Note: Note;
};

export const defs: EntityDefs<Schema> = {
  Person: PersonDef,
  AppMarker: AppMarkerDef,
  Book: {
    name: 'Book',
    fields: {
      id: 'uuid',
      title: 'text',
      author: 'text',
      totalPages: 'int',
      startsOn: 'date',
      status: 'text',
      convenorSub: 'text',
    },
  },
  Chapter: {
    name: 'Chapter',
    fields: {
      id: 'uuid',
      bookId: 'uuid',
      number: 'int',
      title: 'text',
      startPage: 'int',
      endPage: 'int',
    },
  },
  Meeting: {
    name: 'Meeting',
    fields: {
      id: 'uuid',
      bookId: 'uuid',
      on: 'date',
      endChapter: 'int',
      topic: 'text',
    },
  },
  Membership: {
    name: 'Membership',
    fields: {
      id: 'uuid',
      bookId: 'uuid',
      readerSub: 'text',
      readerName: 'text',
      status: 'text',
      joinedOn: 'date',
    },
  },
  Progress: {
    name: 'Progress',
    fields: {
      id: 'uuid',
      bookId: 'uuid',
      readerSub: 'text',
      on: 'date',
      page: 'int',
      minutes: 'int',
    },
  },
  Note: {
    name: 'Note',
    fields: {
      id: 'uuid',
      bookId: 'uuid',
      chapter: 'int',
      authorSub: 'text',
      authorName: 'text',
      kind: 'text',
      body: 'text',
      createdAt: 'date',
    },
  },
};
