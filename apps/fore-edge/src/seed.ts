import type { DataStore } from '@x10/shared/data';
import { addDays } from '@x10/shared/lib';
import type { SeedContext } from '@x10/shared/runtime';

import type { NoteKind, Schema } from './model';

const CHAPTER_TITLES = [
  'The Weight of Shared State',
  'Clocks Without a Master',
  'Logs, Streams and Append-Only Memory',
  'Quorums and the Cost of Agreement',
  'Partitions in Winter',
  'Linearisability in Practice',
  'Replication Without Tears',
  'Compaction and Tombstones',
  'Snapshot Isolation and Skew',
  'Backpressure at the Edge',
  'Idempotency Keys and Retries',
  'Schema Evolution Across Eras',
  'Observing Silent Corruption',
  'Retiring a Living System',
];

const NOTE_SEEDS: Array<{ chapter: number; readerIdx: number; kind: NoteKind; body: string; daysAgo: number }> = [
  { chapter: 1, readerIdx: 0, kind: 'insight', body: 'Framing state as a ledger of facts rather than mutable rows clarifies the rest of the book.', daysAgo: 20 },
  { chapter: 1, readerIdx: 1, kind: 'question', body: 'Where does the author draw the line between operational state and analytical snapshots?', daysAgo: 19 },
  { chapter: 2, readerIdx: 2, kind: 'insight', body: 'Hybrid logical clocks feel much less intimidating once you see them as bounded drift.', daysAgo: 18 },
  { chapter: 2, readerIdx: 3, kind: 'disagreement', body: 'TrueTime is treated as a curiosity here, yet cloud-native teams rely on bounded clock skew daily.', daysAgo: 17 },
  { chapter: 3, readerIdx: 0, kind: 'question', body: 'For our meeting: how many of us have actually replayed a production log from offset zero?', daysAgo: 16 },
  { chapter: 3, readerIdx: 4, kind: 'insight', body: 'The distinction between retention by time and retention by key compaction saved me two rereads.', daysAgo: 16 },
  { chapter: 3, readerIdx: 1, kind: 'insight', body: 'Diagram 3.4 on page 78 is worth printing for the meeting pack.', daysAgo: 15 },
  { chapter: 4, readerIdx: 2, kind: 'question', body: 'Does flexible Paxos really reduce latency in our two-region setup, or just move the bottleneck?', daysAgo: 14 },
  { chapter: 4, readerIdx: 5, kind: 'insight', body: 'Reading the quorum intersection proof slowly made strict serialisability click.', daysAgo: 14 },
  { chapter: 4, readerIdx: 1, kind: 'disagreement', body: 'The chapter glosses over operator error during membership changes.', daysAgo: 13 },
  { chapter: 5, readerIdx: 0, kind: 'insight', body: 'Fencing tokens are the single clearest pattern in the first half of the book.', daysAgo: 12 },
  { chapter: 5, readerIdx: 3, kind: 'question', body: 'How do you test asymmetric network partitions without building a whole simulator?', daysAgo: 11 },
  { chapter: 5, readerIdx: 2, kind: 'insight', body: 'The winter-storm postmortem in section 5.3 is a textbook example of retry storms.', daysAgo: 10 },
  { chapter: 6, readerIdx: 1, kind: 'insight', body: 'Seeing linearisability drawn as a single point between invoke and return beats every formal definition.', daysAgo: 9 },
  { chapter: 6, readerIdx: 0, kind: 'question', body: 'When is read-your-writes enough, and when do we genuinely pay for linearisable reads?', daysAgo: 8 },
  { chapter: 6, readerIdx: 2, kind: 'disagreement', body: 'The benchmark on page 172 compares apples and oranges on tail latency.', daysAgo: 7 },
  { chapter: 7, readerIdx: 1, kind: 'insight', body: 'The split-brain trade-off in chapter 7 explains why automatic failover is never free.', daysAgo: 6 },
  { chapter: 7, readerIdx: 0, kind: 'question', body: 'Should we spend half of Meeting 2 on leaderless replication or keep it for chapter 8?', daysAgo: 6 },
  { chapter: 7, readerIdx: 3, kind: 'insight', body: 'Read repair plus anti-entropy is surprisingly elegant once you accept bounded staleness.', daysAgo: 5 },
  { chapter: 7, readerIdx: 2, kind: 'disagreement', body: 'Conflict-free replicated data types are oversold for business workflows with invariants.', daysAgo: 5 },
  { chapter: 8, readerIdx: 1, kind: 'insight', body: 'Tombstone retention windows are a hidden clock dependency nobody warns you about.', daysAgo: 4 },
  { chapter: 8, readerIdx: 0, kind: 'question', body: 'What happens to our backup restores when compaction runs mid-snapshot?', daysAgo: 4 },
  { chapter: 9, readerIdx: 1, kind: 'insight', body: 'Write skew on on-call schedules is the cleanest example of snapshot isolation failing.', daysAgo: 3 },
  { chapter: 9, readerIdx: 1, kind: 'question', body: 'Would materialising conflicts have prevented the double-booking bug we saw last autumn?', daysAgo: 3 },
  { chapter: 10, readerIdx: 1, kind: 'insight', body: 'Adaptive concurrency limits using Little’s Law belong in every gateway we run.', daysAgo: 2 },
  { chapter: 10, readerIdx: 1, kind: 'disagreement', body: 'Load shedding at the client assumes callers are well-behaved; edge queues still need hard caps.', daysAgo: 2 },
  { chapter: 11, readerIdx: 1, kind: 'insight', body: 'Idempotency keys with response caching turn retries from a hazard into a non-event.', daysAgo: 1 },
  { chapter: 11, readerIdx: 1, kind: 'question', body: 'How long should an idempotency ledger retain completed keys before pruning?', daysAgo: 1 },
];

/** Deterministic seed from ctx.now: 420-page book, 14 chapters, 3 meetings, 6 readers, 28 notes. */
export async function seed(store: DataStore<Schema>, ctx: SeedContext): Promise<void> {
  const [convenor, ahead, onPace, behind, paused, farBehind] = ctx.people;
  const now = ctx.now;

  const book = await store.repo('Book').create({
    title: 'The Craft of Distributed Ledgers',
    author: 'M. V. Lindholm',
    totalPages: 420,
    startsOn: addDays(now, -24),
    status: 'reading',
    convenorSub: convenor.sub,
  });

  // 14 chapters of 30 pages each = 420 pages
  const chRepo = store.repo('Chapter');
  for (let i = 0; i < CHAPTER_TITLES.length; i++) {
    await chRepo.create({
      bookId: book.id,
      number: i + 1,
      title: CHAPTER_TITLES[i],
      startPage: i * 30 + 1,
      endPage: (i + 1) * 30,
    });
  }

  // 3 meetings: one past (Ch 1–5, 9 days ago), one in 5 days (Ch 6–10), one in 19 days (Ch 11–14)
  const meetRepo = store.repo('Meeting');
  await meetRepo.create({
    bookId: book.id,
    on: addDays(now, -9),
    endChapter: 5,
    topic: 'State, clocks, and quorums',
  });
  await meetRepo.create({
    bookId: book.id,
    on: addDays(now, 5),
    endChapter: 10,
    topic: 'Replication, compaction, and backpressure',
  });
  await meetRepo.create({
    bookId: book.id,
    on: addDays(now, 19),
    endChapter: 14,
    topic: 'Evolution, corruption, and retirement',
  });

  // 6 readers: convenor (on pace), ahead, onPace, behind (on ch 4!), paused, farBehind (inactive > 14d)
  const memRepo = store.repo('Membership');
  const members = [
    { person: convenor, status: 'reading' as const },
    { person: ahead, status: 'reading' as const },
    { person: onPace, status: 'reading' as const },
    { person: behind, status: 'reading' as const },
    { person: paused, status: 'paused' as const },
    { person: farBehind, status: 'reading' as const },
  ];
  for (const m of members) {
    await memRepo.create({
      bookId: book.id,
      readerSub: m.person.sub,
      readerName: m.person.displayName,
      status: m.status,
      joinedOn: addDays(now, -24),
    });
  }

  // Progress rows with minutes (deterministic)
  const progRepo = store.repo('Progress');
  const progressPlan: Array<{ sub: string; entries: Array<{ daysAgo: number; page: number; minutes: number }> }> = [
    {
      sub: convenor.sub,
      entries: [
        { daysAgo: 20, page: 60, minutes: 120 },
        { daysAgo: 12, page: 150, minutes: 180 },
        { daysAgo: 5, page: 210, minutes: 120 },
        { daysAgo: 1, page: 242, minutes: 65 },
      ],
    },
    {
      sub: ahead.sub,
      entries: [
        { daysAgo: 21, page: 90, minutes: 150 },
        { daysAgo: 14, page: 190, minutes: 165 },
        { daysAgo: 6, page: 280, minutes: 145 },
        { daysAgo: 1, page: 330, minutes: 85 },
      ],
    },
    {
      sub: onPace.sub,
      entries: [
        { daysAgo: 19, page: 75, minutes: 150 },
        { daysAgo: 10, page: 165, minutes: 190 },
        { daysAgo: 4, page: 225, minutes: 130 },
        { daysAgo: 1, page: 252, minutes: 60 },
      ],
    },
    {
      // Behind reader on chapter 4 (page 112) — great for testing AC #1 (spoiler lock on Ch 7)
      sub: behind.sub,
      entries: [
        { daysAgo: 18, page: 48, minutes: 120 },
        { daysAgo: 11, page: 84, minutes: 90 },
        { daysAgo: 3, page: 112, minutes: 70 },
      ],
    },
    {
      // Paused reader at page 62 — must be ignored by fog line (AC #3)
      sub: paused.sub,
      entries: [
        { daysAgo: 22, page: 32, minutes: 75 },
        { daysAgo: 16, page: 62, minutes: 75 },
      ],
    },
    {
      // Far behind & inactive for 16 days (page 105, sets the fog line!)
      sub: farBehind.sub,
      entries: [
        { daysAgo: 22, page: 55, minutes: 140 },
        { daysAgo: 16, page: 105, minutes: 125 },
      ],
    },
  ];

  for (const plan of progressPlan) {
    for (const e of plan.entries) {
      await progRepo.create({
        bookId: book.id,
        readerSub: plan.sub,
        on: addDays(now, -e.daysAgo),
        page: e.page,
        minutes: e.minutes,
      });
    }
  }

  // 28 notes across chapters 1..11
  const noteRepo = store.repo('Note');
  for (const n of NOTE_SEEDS) {
    const author = ctx.people[n.readerIdx] ?? convenor;
    await noteRepo.create({
      bookId: book.id,
      chapter: n.chapter,
      authorSub: author.sub,
      authorName: author.displayName,
      kind: n.kind,
      body: n.body,
      createdAt: addDays(now, -n.daysAgo),
    });
  }
}
