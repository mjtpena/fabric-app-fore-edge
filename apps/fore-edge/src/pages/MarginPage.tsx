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
  FilterSelect,
  InlineError,
  PageHeader,
  Section,
  Select,
  TextArea,
} from '@x10/shared/ui';

import { buildReaderSummaries, getNoteVisibility } from '../domain/rules';
import { addNote, deleteNote, loadCircleData } from '../domain/store';
import type { NoteKind, Schema } from '../model';

export function MarginPage() {
  const { store, me } = useApp<Schema>();
  const now = useMemo(() => new Date().toISOString(), []);
  const load = useCallback(() => loadCircleData(store), [store]);
  const state = useAsync(load, [load]);
  const { data, reload } = state;
  usePolling(reload, 5000);

  const [chapterFilter, setChapterFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [newChapter, setNewChapter] = useState('1');
  const [newKind, setNewKind] = useState<NoteKind>('insight');
  const [newBody, setNewBody] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    const mine = summary.readers.find((r) => r.membership.readerSub === me.sub);
    const myPage = mine ? mine.latestPage : 0;

    const evaluated = data.notes.map((note) => ({
      note,
      vis: getNoteVisibility(note, data.chapters, me.sub, myPage, Boolean(me.isAdmin)),
    }));

    const visible = evaluated.filter((e) => e.vis.visible);
    const lockedCount = evaluated.length - visible.length;

    const filtered = visible.filter((e) => {
      if (chapterFilter !== 'all' && String(e.note.chapter) !== chapterFilter) return false;
      if (kindFilter !== 'all' && e.note.kind !== kindFilter) return false;
      return true;
    });

    return { myPage, fogLine: summary.fogLine, filtered, lockedCount, totalCount: evaluated.length };
  }, [data, me.sub, me.isAdmin, now, chapterFilter, kindFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.book) return;
    setSubmitError(null);
    setSaving(true);
    try {
      await addNote(store, {
        bookId: data.book.id,
        chapter: Number(newChapter),
        authorSub: me.sub,
        authorName: me.displayName,
        kind: newKind,
        body: newBody,
        nowIso: now,
      });
      setNewBody('');
      await reload();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not post note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    const note = data?.notes.find((n) => n.id === noteId);
    if (!note) return;
    await deleteNote(store, note, me.sub);
    await reload();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <PageHeader
          title="Margin"
          subtitle={
            computed
              ? `Your page: p. ${computed.myPage} · ${computed.filtered.length} shown · ${computed.lockedCount} spoiler-locked`
              : undefined
          }
        />

        <DataState state={state} isEmpty={(d) => !d.book}>
          {() =>
            data?.book && computed ? (
              <>
              <Callout tone="info" title="Spoiler lock is active">
                Notes for chapters beyond your latest page (p. {computed.myPage}) stay sealed until your bookmark reaches that
                chapter. This filter runs in the app domain, not as a database row policy.
              </Callout>

              <Section title="Write a margin note">
                <Card className="p-4">
                  <form onSubmit={handleAdd} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Chapter" htmlFor="note-ch">
                        <Select id="note-ch" value={newChapter} onChange={(e) => setNewChapter(e.target.value)}>
                          {data.chapters.map((ch) => (
                            <option key={ch.id} value={String(ch.number)}>
                              Ch {ch.number}: {ch.title} (p. {ch.startPage}–{ch.endPage})
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Kind" htmlFor="note-kind">
                        <Select id="note-kind" value={newKind} onChange={(e) => setNewKind(e.target.value as NoteKind)}>
                          <option value="insight">Insight</option>
                          <option value="question">Question</option>
                          <option value="disagreement">Disagreement</option>
                        </Select>
                      </Field>
                    </div>
                    <Field label="Note" htmlFor="note-body">
                      <TextArea
                        id="note-body"
                        rows={3}
                        placeholder="Share a question, insight, or disagreement for this chapter…"
                        value={newBody}
                        onChange={(e) => setNewBody(e.target.value)}
                        required
                      />
                    </Field>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Posting…' : 'Post margin note'}
                      </Button>
                      {submitError && <InlineError error={submitError} />}
                    </div>
                  </form>
                </Card>
              </Section>

              <Section
                title="Unlocked notes"
                actions={
                  <div className="flex flex-wrap gap-2">
                    <FilterSelect
                      label="Chapter"
                      value={chapterFilter}
                      onChange={setChapterFilter}
                      options={[
                        { value: 'all', label: 'All chapters' },
                        ...data.chapters.map((c) => ({ value: String(c.number), label: `Ch ${c.number}` })),
                      ]}
                    />
                    <FilterSelect
                      label="Kind"
                      value={kindFilter}
                      onChange={setKindFilter}
                      options={[
                        { value: 'all', label: 'All kinds' },
                        { value: 'question', label: 'Question' },
                        { value: 'insight', label: 'Insight' },
                        { value: 'disagreement', label: 'Disagreement' },
                      ]}
                    />
                  </div>
                }
              >
                <div className="space-y-3" data-testid="margin-notes-list">
                  {computed.filtered.map(({ note, vis }) => (
                    <Card key={note.id} className="p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone="brand">Ch {note.chapter}</Badge>
                          <Badge tone={vis.isSpoiler ? 'warn' : 'neutral'}>
                            {vis.isSpoiler ? 'Spoiler (convenor view)' : note.kind}
                          </Badge>
                          <span className="text-sm font-medium text-fg">{note.authorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted">{note.createdAt.slice(0, 10)}</span>
                          {note.authorSub === me.sub && (
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(note.id)}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-fg">{note.body}</p>
                    </Card>
                  ))}
                </div>
              </Section>
              </>
            ) : null
          }
        </DataState>
      </div>
    </AppShell>
  );
}
