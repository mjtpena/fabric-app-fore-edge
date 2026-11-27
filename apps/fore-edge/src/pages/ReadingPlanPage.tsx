import { useCallback, useMemo, useState } from 'react';
import { useAsync, usePolling } from '@x10/shared/lib';
import { AdminOnly, AppShell, useApp } from '@x10/shared/runtime';
import {
  Badge,
  Button,
  Card,
  DataState,
  Field,
  InlineError,
  Input,
  PageHeader,
  Section,
  Select,
  Stat,
  StatStrip,
  Table,
  TableWrap,
  Td,
  Th,
  Tr,
} from '@x10/shared/ui';

import { buildReaderSummaries, formatDuration } from '../domain/rules';
import { addMeeting, loadCircleData } from '../domain/store';
import type { Schema } from '../model';

export function ReadingPlanPage() {
  const { store, me } = useApp<Schema>();
  const now = useMemo(() => new Date().toISOString(), []);
  const load = useCallback(() => loadCircleData(store), [store]);
  const state = useAsync(load, [load]);
  const { data, reload } = state;
  usePolling(reload, 5000);

  const [meetDate, setMeetDate] = useState('');
  const [meetChapter, setMeetChapter] = useState('14');
  const [meetTopic, setMeetTopic] = useState('');
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    if (!data?.book) return null;
    return buildReaderSummaries(
      data.book,
      data.chapters,
      data.meetings,
      data.memberships,
      data.progress,
      now,
    );
  }, [data, now]);

  const handleAddMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.book) return;
    setFormErr(null);
    setSaving(true);
    try {
      await addMeeting(store, {
        bookId: data.book.id,
        on: meetDate,
        endChapter: Number(meetChapter),
        topic: meetTopic || null,
        isConvenor: Boolean(me.isAdmin),
      });
      setMeetDate('');
      setMeetTopic('');
      await reload();
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : 'Could not add meeting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <PageHeader
          title="Reading plan"
          subtitle={data?.book ? `${data.book.title} · ${data.chapters.length} chapters · ${data.meetings.length} meetings` : undefined}
        />

        <DataState state={state} isEmpty={(d) => !d.book}>
          {() =>
            data?.book && summary ? (
              <>
              <StatStrip>
                <Stat label="Fog line" value={`p. ${summary.fogLine}`} hint="Slowest active reader" />
                <Stat label="Expected today" value={`p. ${summary.expectedPage}`} hint="Weekend weight 0.5" />
                <Stat
                  label="Next meeting"
                  value={summary.window ? `${Math.max(0, summary.window.daysUntil)}d` : '—'}
                  hint={summary.window ? `${summary.window.remainingEffectiveDays} eff. days` : undefined}
                />
                <Stat
                  label="Will make it"
                  value={`${summary.readers.filter((r) => r.membership.status === 'reading' && r.willMakeIt).length} / ${summary.readers.filter((r) => r.membership.status === 'reading').length}`}
                  hint="At current 7d pace"
                />
              </StatStrip>

              <Section title="Pace by reader">
                <TableWrap>
                  <Table>
                    <thead>
                      <Tr>
                        <Th>Reader</Th>
                        <Th>Status</Th>
                        <Th numeric>Page</Th>
                        <Th numeric>7d pace</Th>
                        <Th numeric>Req. pace</Th>
                        <Th numeric>Catch-up</Th>
                        <Th>Forecast</Th>
                      </Tr>
                    </thead>
                    <tbody>
                      {summary.readers.map((r) => (
                        <Tr key={r.membership.id}>
                          <Td className="font-medium">{r.membership.readerName}</Td>
                          <Td>
                            <Badge
                              tone={
                                r.membership.status === 'paused'
                                  ? 'neutral'
                                  : r.state === 'ahead'
                                    ? 'brand'
                                    : r.state === 'behind'
                                      ? 'warn'
                                      : 'ok'
                              }
                            >
                              {r.membership.status === 'paused' ? 'Paused' : r.state.replace('_', ' ')}
                            </Badge>
                          </Td>
                          <Td numeric>{r.latestPage}</Td>
                          <Td numeric>{r.pace7d} p/d</Td>
                          <Td numeric>{r.requiredPace} p/d</Td>
                          <Td numeric>{r.catchUpMinutes > 0 ? formatDuration(r.catchUpMinutes) : '—'}</Td>
                          <Td>
                            <Badge tone={r.willMakeIt ? 'ok' : 'warn'}>
                              {r.membership.status === 'paused' ? 'Paused' : r.willMakeIt ? 'Will make it' : 'Needs nudge'}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </Section>

              <Section title="Meetings">
                <TableWrap>
                  <Table>
                    <thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th numeric>Through Ch</Th>
                        <Th>Topic</Th>
                      </Tr>
                    </thead>
                    <tbody>
                      {data.meetings.map((m) => (
                        <Tr key={m.id}>
                          <Td>{m.on.slice(0, 10)}</Td>
                          <Td numeric>Ch {m.endChapter}</Td>
                          <Td>{m.topic ?? '—'}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </Section>

              <AdminOnly>
                <Section title="Schedule a meeting (Convenor)">
                  <Card className="p-4">
                    <form onSubmit={handleAddMeeting} className="grid gap-3 sm:grid-cols-3">
                      <Field label="Meeting date" htmlFor="m-date">
                        <Input id="m-date" type="date" value={meetDate} onChange={(e) => setMeetDate(e.target.value)} required />
                      </Field>
                      <Field label="Through chapter" htmlFor="m-ch">
                        <Select id="m-ch" value={meetChapter} onChange={(e) => setMeetChapter(e.target.value)}>
                          {data.chapters.map((c) => (
                            <option key={c.id} value={String(c.number)}>
                              Ch {c.number}: {c.title}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Topic" htmlFor="m-topic">
                        <Input
                          id="m-topic"
                          placeholder="Optional focus topic"
                          value={meetTopic}
                          onChange={(e) => setMeetTopic(e.target.value)}
                        />
                      </Field>
                      <div className="sm:col-span-3 flex items-center gap-3">
                        <Button type="submit" variant="primary" disabled={saving}>
                          {saving ? 'Adding…' : 'Add meeting'}
                        </Button>
                        {formErr && <InlineError error={formErr} />}
                      </div>
                    </form>
                  </Card>
                </Section>
              </AdminOnly>
              </>
            ) : null
          }
        </DataState>
      </div>
    </AppShell>
  );
}
