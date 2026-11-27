import { AppMarker } from './AppMarker.js';
import { Book } from './Book.js';
import { Chapter } from './Chapter.js';
import { Meeting } from './Meeting.js';
import { Membership } from './Membership.js';
import { Note } from './Note.js';
import { Person } from './Person.js';
import { Progress } from './Progress.js';

export type AppSchema = {
  Person: Person;
  AppMarker: AppMarker;
  Book: Book;
  Chapter: Chapter;
  Meeting: Meeting;
  Membership: Membership;
  Progress: Progress;
  Note: Note;
};

export const schema = [Person, AppMarker, Book, Chapter, Meeting, Membership, Progress, Note];
