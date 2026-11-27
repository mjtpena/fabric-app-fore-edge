import { useCallback, useMemo } from 'react';
import { useAsync } from '@x10/shared/lib';
import { AppShell, useApp } from '@x10/shared/runtime';
import {
  Badge,
  Button,
  Card,
  DataState,
  PageHeader,
  Section,
  Stat,
  StatStrip,
  Table,
  TableWrap,
  Td,
  Th,
  Tr,
} from '@x10/shared/ui';

import { buildReaderSummaries, formatDuration, getNoteVisibility } from '../domain/rules';
import { loadCircleData } from '../domain/store';
import type { Schema } from '../model';

export function MeetingPackPage() {
  const { store, me } = useApp<Schema>();
  const now = useMemo(() => new Date().toISOString(), []);
  const load = useCallback(() => loadCircleData(store), [store]);
  const state = useAsync(load, [load]);
  const { data } = state;

  const pack = useMemo(() => {
    if (!data?.book) return null;
    const summary = buildReaderSummaries(
      data.book,
      data.chapters,
      data.meetings,
      data.memberships,
      data.progress,
      now,
    );
    const mine = summary.readers.find((r) => r.membership.readerSub === me.sub);
    const myPage = mine ? mine.latestPage : 0;

    const maxCh = summary.window ? summary.window.meeting.endChapter : data.chapters.length;
    const questions = data.notes
      .filter((n) => n.kind === 'question' && n.chapter <= maxCh)
      .map((n) => ({
        note: n,
        vis: getNoteVisibility(n, data.chapters, me.sub, myPage, Boolean(me.isAdmin)),
      }))
      .filter((x) => x.vis.visible);

    const readyCount = summary.readers.filter(
      (r) => r.membership.status === 'reading' && r.willMakeIt,
    ).length;

    return { ...summary, questions, readyCount };
  }, [data, me.sub, me.isAdmin, now]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <PageHeader
          title="Meeting pack"
          subtitle={
            pack?.window
              ? `Next meeting: ${pack.window.meeting.on.slice(0, 10)} · Through Ch ${pack.window.meeting.endChapter}`
              : undefined
          }
          actions={
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Print pack
            </Button>
          }
        />

        <DataState state={state} isEmpty={(d) => !d.book}>
          {() =>
            data?.book && pack ? (
              <>
              <StatStrip>
                <Stat label="Spoiler-safe horizon" value={`p. ${pack.fogLine}`} hint="Fog line" />
                <Stat label="Questions ready" value={String(pack.questions.length)} hint="Visible to you" />
                <Stat
                  label="Projected ready"
                  value={`${pack.readyCount} / ${pack.readers.filter((r) => r.membership.status === 'reading').length}`}
                  hint="Will make target"
                />
              </StatStrip>

              <Section title="Discussion questions">
                <div className="space-y-3">
                  {pack.questions.map(({ note, vis }) => (
                    <Card key={note.id} className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge tone="brand">Ch {note.chapter}</Badge>
                        {vis.isSpoiler && <Badge tone="warn">Spoiler</Badge>}
                        <span className="text-sm font-medium text-fg">{note.authorName}</span>
                      </div>
                      <p className="mt-2 text-sm text-fg">{note.body}</p>
                    </Card>
                  ))}
                </div>
              </Section>

              <Section title="Who will be ready">
                <TableWrap>
                  <Table>
                    <thead>
                      <Tr>
                        <Th>Reader</Th>
                        <Th numeric>Current page</Th>
                        <Th numeric>Catch-up</Th>
                        <Th>Readiness</Th>
                      </Tr>
                    </thead>
                    <tbody>
                      {pack.readers.map((r) => (
                        <Tr key={r.membership.id}>
                          <Td className="font-medium">{r.membership.readerName}</Td>
                          <Td numeric>{r.latestPage}</Td>
                          <Td numeric>{r.catchUpMinutes > 0 ? formatDuration(r.catchUpMinutes) : '—'}</Td>
                          <Td>
                            <Badge
                              tone={
                                r.membership.status === 'paused'
                                  ? 'neutral'
                                  : r.willMakeIt
                                    ? 'ok'
                                    : 'warn'
                              }
                            >
                              {r.membership.status === 'paused'
                                ? 'Paused'
                                : r.willMakeIt
                                  ? 'Ready on time'
                                  : 'May fall short'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </Section>
              </>
            ) : null
          }
        </DataState>
      </div>
    </AppShell>
  );
}
