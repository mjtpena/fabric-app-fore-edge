import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync, usePolling } from '@x10/shared/lib';
import { AppShell, useApp } from '@x10/shared/runtime';
import {
  Badge,
  Button,
  DataState,
  FloatingPanel,
  Legend,
  LensBar,
  StagePage,
  Table,
  TableWrap,
  Td,
  Th,
  TodayPanel,
  Tr,
  ViewAsSwitch,
  ViewToggle,
  useHotkeys,
} from '@x10/shared/ui';

import { ForeEdgeStage, type StageLens } from '../components/ForeEdgeStage';
import {
  buildReaderSummaries,
  formatDuration,
  getNoteVisibility,
  requiredPace,
} from '../domain/rules';
import { loadCircleData } from '../domain/store';
import type { Schema } from '../model';

const LENSES: Array<{ value: StageLens; label: string }> = [
  { value: 'progress', label: 'Progress' },
  { value: 'pace', label: 'Pace' },
  { value: 'notes', label: 'Notes' },
  { value: 'chapter', label: 'Chapter' },
];

export function HomePage() {
  const { store, me } = useApp<Schema>();
  const now = useMemo(() => new Date().toISOString(), []);
  const navigate = useNavigate();

  const [view, setView] = useState<'stage' | 'list'>('stage');
  const [lens, setLens] = useState<StageLens>('progress');
  const [roleView, setRoleView] = useState<'reader' | 'convenor'>(me.isAdmin ? 'convenor' : 'reader');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => loadCircleData(store), [store]);
  const state = useAsync(load, [load]);
  const { data, reload } = state;
  usePolling(reload, 5000);

  const viewAsConvenor = roleView === 'convenor';

  useHotkeys({
    '1': () => setLens('progress'),
    '2': () => setLens('pace'),
    '3': () => setLens('notes'),
    '4': () => setLens('chapter'),
    v: () => setRoleView((r) => (r === 'convenor' ? 'reader' : 'convenor')),
    Escape: () => setSelectedId(null),
  });

  const computed = useMemo(() => {
    if (!data?.book) return null;
    const summary = buildReaderSummaries(
      data.book,
      data.chapters,
      data.meetings,
      data.memberships,
      data.progress,
      now,
    );
    const mySummary = summary.readers.find((r) => r.membership.readerSub === me.sub) ?? summary.readers[0];
    const myPage = mySummary ? mySummary.latestPage : 0;

    const visibleNotes = data.notes
      .map((n) => ({
        note: n,
        vis: getNoteVisibility(n, data.chapters, me.sub, myPage, viewAsConvenor),
      }))
      .filter((x) => x.vis.visible);

    const lockedCount = data.notes.length - visibleNotes.length;

    const pagesDueToday = summary.window
      ? requiredPace(Math.max(0, summary.window.endPage - myPage), summary.window.remainingEffectiveDays)
      : 0;

    return { ...summary, mySummary, myPage, visibleNotes, lockedCount, pagesDueToday };
  }, [data, me.sub, now, viewAsConvenor]);

  const todayItems = useMemo(() => {
    if (!computed || !data?.book) return [];
    const items: Array<{
      id: string;
      title: string;
      detail: string;
      severity: 'ok' | 'warn' | 'bad' | 'info';
    }> = [];

    if (computed.window) {
      items.push({
        id: `meeting:${computed.window.meeting.id}`,
        title: `Next meeting in ${Math.max(0, computed.window.daysUntil)} days`,
        detail: `Through Ch ${computed.window.meeting.endChapter} (p. ${computed.window.endPage}) · ${computed.window.remainingEffectiveDays} eff. days`,
        severity: computed.window.daysUntil <= 5 ? 'warn' : 'info',
      });
    }

    items.push({
      id: `reader:${me.sub}`,
      title: `${computed.pagesDueToday} pages/day to stay on pace`,
      detail: `You are at p. ${computed.myPage} (expected p. ${computed.expectedPage})`,
      severity: computed.mySummary?.state === 'behind' ? 'warn' : 'ok',
    });

    const recentUnlocked = computed.visibleNotes.filter((x) => !x.vis.isSpoiler).slice(0, 1)[0];
    if (recentUnlocked) {
      items.push({
        id: `chapter:${recentUnlocked.note.chapter}`,
        title: `${computed.visibleNotes.length} notes open (${computed.lockedCount} sealed)`,
        detail: `Latest unlocked in Ch ${recentUnlocked.note.chapter} by ${recentUnlocked.note.authorName}`,
        severity: 'info',
      });
    }

    for (const inactive of computed.inactiveReaders.slice(0, 2)) {
      items.push({
        id: `reader:${inactive.membership.readerSub}`,
        title: `${inactive.membership.readerName} inactive ${inactive.daysInactive}d`,
        detail: `At p. ${inactive.latestPage} · sets fog line at p. ${computed.fogLine}`,
        severity: 'warn',
      });
    }

    return items.slice(0, 5);
  }, [computed, data, me.sub]);

  const legendItems = useMemo(
    () => [
      { label: 'Ahead (+10p)', color: 'var(--accent-9)' },
      { label: 'On pace', color: 'var(--ok-solid)' },
      { label: 'Behind (-10p)', color: 'var(--warn-solid)' },
      { label: 'Paused (off fog line)', color: 'var(--gray-8)' },
    ],
    [],
  );

  const selectedDetail = useMemo(() => {
    if (!selectedId || !computed || !data?.book) return null;
    if (selectedId.startsWith('reader:')) {
      const sub = selectedId.slice('reader:'.length);
      const r = computed.readers.find((x) => x.membership.readerSub === sub);
      if (!r) return null;
      return {
        title: r.membership.readerName,
        subtitle: `Page ${r.latestPage} · Chapter ${r.latestChapter} · ${r.membership.status}`,
        body:
          r.catchUpMinutes > 0
            ? `${Math.abs(r.deltaPages)} pages behind pace (${formatDuration(r.catchUpMinutes)} at ${r.pagesPerHour} p/h).`
            : r.state === 'ahead'
              ? `${r.deltaPages} pages ahead of schedule · ${r.pace7d} p/day over 7d.`
              : `On pace for the next meeting · ${r.pace7d} p/day over 7d.`,
        actionLabel: sub === me.sub ? 'Log bookmark' : 'Open reading plan',
        actionTo: sub === me.sub ? '/bookmark' : '/plan',
      };
    }
    if (selectedId.startsWith('chapter:')) {
      const num = Number(selectedId.slice('chapter:'.length));
      const ch = data.chapters.find((c) => c.number === num);
      if (!ch) return null;
      const chNotes = data.notes.filter((n) => n.chapter === num);
      const openCount = chNotes.filter(
        (n) => getNoteVisibility(n, data.chapters, me.sub, computed.myPage, viewAsConvenor).visible,
      ).length;
      return {
        title: `Ch ${ch.number}: ${ch.title}`,
        subtitle: `Pages ${ch.startPage}–${ch.endPage}`,
        body: `${openCount} of ${chNotes.length} margin notes visible at your current page (p. ${computed.myPage}).`,
        actionLabel: 'Open margin',
        actionTo: '/margin',
      };
    }
    if (selectedId.startsWith('meeting:')) {
      const id = selectedId.slice('meeting:'.length);
      const m = data.meetings.find((x) => x.id === id);
      if (!m) return null;
      return {
        title: `Meeting · ${m.on.slice(0, 10)}`,
        subtitle: `Through Chapter ${m.endChapter}`,
        body: m.topic ?? 'Study circle discussion',
        actionLabel: 'Open meeting pack',
        actionTo: '/pack',
      };
    }
    return null;
  }, [selectedId, computed, data, me.sub, viewAsConvenor]);

  return (
    <AppShell immersive>
      <DataState state={state} isEmpty={(d) => !d.book}>
        {(d) =>
          d.book && computed ? (
            <StagePage
              label="Fore-Edge"
              view={view}
              title={d.book.title}
              meta={`${d.book.author} · ${d.book.totalPages} pp · Fog line p.${computed.fogLine}`}
            breadcrumb={
              selectedDetail
                ? [
                    { label: 'Fore-Edge', onClick: () => setSelectedId(null) },
                    { label: selectedDetail.title },
                  ]
                : [{ label: 'Fore-Edge' }]
            }
            topRight={
              <ViewToggle value={view} onChange={setView} stageLabel="Fore-Edge" glass={view === 'stage'} />
            }
            lenses={<LensBar lenses={LENSES} value={lens} onChange={setLens} />}
            legend={<Legend title="Ribbons" items={legendItems} collapsible />}
            bottomRight={
              <ViewAsSwitch
                options={[
                  { value: 'reader', label: 'Reader' },
                  { value: 'convenor', label: 'Convenor' },
                ]}
                value={roleView}
                onChange={setRoleView}
              />
            }
            side={
              <div className="flex flex-col gap-3">
                <TodayPanel
                  bare
                  items={todayItems}
                  activeId={selectedId ?? undefined}
                  onSelect={(item) => setSelectedId(item.id === selectedId ? null : item.id)}
                />
                {selectedDetail && (
                  <FloatingPanel className="p-3">
                    <div className="text-xs font-medium text-muted">{selectedDetail.subtitle}</div>
                    <div className="mt-0.5 text-sm font-semibold text-fg">{selectedDetail.title}</div>
                    <p className="mt-1 text-xs text-muted">{selectedDetail.body}</p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Button size="sm" variant="primary" onClick={() => navigate(selectedDetail.actionTo)}>
                        {selectedDetail.actionLabel}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>
                        Clear
                      </Button>
                    </div>
                  </FloatingPanel>
                )}
              </div>
            }
            sideCount={todayItems.length}
            stage={
              <ForeEdgeStage
                book={d.book}
                chapters={d.chapters}
                meetings={d.meetings}
                readers={computed.readers}
                notes={d.notes}
                fogLine={computed.fogLine}
                expectedPage={computed.expectedPage}
                window={computed.window}
                lens={lens}
                viewAsConvenor={viewAsConvenor}
                viewerSub={me.sub}
                viewerLatestPage={computed.myPage}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            }
            list={
              <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-fg">Readers</h2>
                  <TableWrap>
                    <Table>
                      <thead>
                        <Tr>
                          <Th>Reader</Th>
                          <Th>Status</Th>
                          <Th numeric>Page</Th>
                          <Th numeric>Ch</Th>
                          <Th>Pace</Th>
                          <Th numeric>Catch-up</Th>
                        </Tr>
                      </thead>
                      <tbody>
                        {computed.readers.map((r) => (
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
                                {r.membership.status === 'paused'
                                  ? 'Paused'
                                  : r.state === 'ahead'
                                    ? 'Ahead'
                                    : r.state === 'behind'
                                      ? 'Behind'
                                      : 'On pace'}
                              </Badge>
                            </Td>
                            <Td numeric>{r.latestPage}</Td>
                            <Td numeric>{r.latestChapter}</Td>
                            <Td>{r.pace7d} p/d</Td>
                            <Td numeric>{r.catchUpMinutes > 0 ? formatDuration(r.catchUpMinutes) : '—'}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrap>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-fg">
                      Margin notes ({computed.visibleNotes.length} visible · {computed.lockedCount} spoiler-locked)
                    </h2>
                    <Button size="sm" variant="secondary" onClick={() => navigate('/margin')}>
                      Open Margin
                    </Button>
                  </div>
                  <TableWrap>
                    <Table>
                      <thead>
                        <Tr>
                          <Th numeric>Ch</Th>
                          <Th>Kind</Th>
                          <Th>Author</Th>
                          <Th>Note</Th>
                        </Tr>
                      </thead>
                      <tbody>
                        {computed.visibleNotes.map(({ note, vis }) => (
                          <Tr key={note.id}>
                            <Td numeric>{note.chapter}</Td>
                            <Td>
                              <Badge tone={vis.isSpoiler ? 'warn' : 'brand'}>
                                {vis.isSpoiler ? 'Spoiler' : note.kind}
                              </Badge>
                            </Td>
                            <Td>{note.authorName}</Td>
                            <Td>{note.body}</Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrap>
                </div>
              </div>
            }
          />
          ) : null
        }
      </DataState>
    </AppShell>
  );
}
