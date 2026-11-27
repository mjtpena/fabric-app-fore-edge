import { useCallback, useMemo, useState } from 'react';
import { useAsync, usePolling } from '@x10/shared/lib';
import { AppShell, useApp } from '@x10/shared/runtime';
import {
  Badge,
  Button,
  Callout,
  Card,
  DataState,
  Field,
  InlineError,
  Input,
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

import { buildReaderSummaries, formatDuration } from '../domain/rules';
import { loadCircleData, logProgress, updateMembershipStatus } from '../domain/store';
import type { Schema } from '../model';

export function BookmarkPage() {
  const { store, me } = useApp<Schema>();
  const now = useMemo(() => new Date().toISOString(), []);
  const load = useCallback(() => loadCircleData(store), [store]);
  const state = useAsync(load, [load]);
  const { data, reload } = state;
  usePolling(reload, 5000);

  const [pageInput, setPageInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('45');
  const [dateInput, setDateInput] = useState(() => now.slice(0, 10));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    if (!data?.book) return null;
    const built = buildReaderSummaries(
      data.book,
      data.chapters,
      data.meetings,
      data.memberships,
      data.progress,
      now,
    );
    const mine = built.readers.find((r) => r.membership.readerSub === me.sub) ?? null;
    return { ...built, mine };
  }, [data, me.sub, now]);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.book) return;
    setSubmitError(null);
    setSavedMsg(null);
    const pageNum = Number(pageInput);
    const minsNum = Number(minutesInput);
    if (!Number.isInteger(pageNum)) {
      setSubmitError('Enter a whole page number.');
      return;
    }
    setSaving(true);
    try {
      await logProgress(store, {
        book: data.book,
        readerSub: me.sub,
        on: dateInput,
        page: pageNum,
        minutes: Number.isFinite(minsNum) ? Math.round(minsNum) : 0,
      });
      setSavedMsg(`Bookmark moved to page ${pageNum}.`);
      setPageInput('');
      await reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save progress.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async () => {
    if (!summary?.mine) return;
    setSubmitError(null);
    const nextStatus = summary.mine.membership.status === 'paused' ? 'reading' : 'paused';
    try {
      await updateMembershipStatus(store, summary.mine.membership, me.sub, nextStatus);
      await reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not update status.');
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <PageHeader
          title="Bookmark"
          subtitle={data?.book ? `${data.book.title} · ${data.book.totalPages} pages` : undefined}
          actions={
            summary?.mine ? (
              <Button variant="secondary" size="sm" onClick={handleTogglePause}>
                {summary.mine.membership.status === 'paused' ? 'Resume reading' : 'Pause reading'}
              </Button>
            ) : undefined
          }
        />

        <DataState state={state} isEmpty={(d) => !d.book}>
          {() =>
            data?.book && summary?.mine ? (
              <>
              <StatStrip>
                <Stat label="Current page" value={`p. ${summary.mine.latestPage}`} hint={`Chapter ${summary.mine.latestChapter}`} />
                <Stat label="Expected today" value={`p. ${summary.expectedPage}`} hint={summary.mine.state.replace('_', ' ')} />
                <Stat label="Your median speed" value={`${summary.mine.pagesPerHour} p/h`} hint={`${summary.mine.pace7d} p/day (7d)`} />
                <Stat
                  label="Catch-up time"
                  value={summary.mine.catchUpMinutes > 0 ? formatDuration(summary.mine.catchUpMinutes) : 'On pace'}
                  hint={`Fog line p. ${summary.fogLine}`}
                />
              </StatStrip>

              {summary.mine.offerPause && (
                <Callout tone="warn" title="No progress logged in 21+ days">
                  You can pause your membership so the circle&apos;s fog line moves forward without spoiling the book for you.
                </Callout>
              )}

              <Section title="Move your silk ribbon">
                <Card className="p-4">
                  <form onSubmit={handleLog} className="grid gap-4 sm:grid-cols-3">
                    <Field label="Page reached" htmlFor="bm-page">
                      <Input
                        id="bm-page"
                        type="number"
                        min={0}
                        max={data.book.totalPages}
                        placeholder={String(Math.min(data.book.totalPages, summary.mine.latestPage + 20))}
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Minutes read" htmlFor="bm-minutes">
                      <Input
                        id="bm-minutes"
                        type="number"
                        min={0}
                        max={600}
                        value={minutesInput}
                        onChange={(e) => setMinutesInput(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Date" htmlFor="bm-date">
                      <Input
                        id="bm-date"
                        type="date"
                        value={dateInput}
                        onChange={(e) => setDateInput(e.target.value)}
                        required
                      />
                    </Field>
                    <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
                      <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Saving…' : 'Log bookmark'}
                      </Button>
                      {savedMsg && <Badge tone="ok">{savedMsg}</Badge>}
                      {submitError && <InlineError error={submitError} />}
                    </div>
                  </form>
                </Card>
              </Section>

              <Section title="Your reading log">
                <TableWrap>
                  <Table>
                    <thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th numeric>Page</Th>
                        <Th numeric>Minutes</Th>
                      </Tr>
                    </thead>
                    <tbody>
                      {[...summary.mine.progressRows].reverse().map((row) => (
                        <Tr key={row.id}>
                          <Td>{row.on.slice(0, 10)}</Td>
                          <Td numeric>{row.page}</Td>
                          <Td numeric>{row.minutes}</Td>
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
