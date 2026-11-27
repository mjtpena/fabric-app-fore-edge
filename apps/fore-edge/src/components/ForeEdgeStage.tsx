import { useMemo } from 'react';
import { useReducedMotion, useThemeColors } from '@x10/shared/ui';

import type { Book, Chapter, Meeting, Note } from '../model';
import { formatDuration, getNoteVisibility, type MeetingWindow, type ReaderSummary } from '../domain/rules';

export type StageLens = 'progress' | 'pace' | 'notes' | 'chapter';

interface ForeEdgeStageProps {
  book: Book;
  chapters: Chapter[];
  meetings: Meeting[];
  readers: ReaderSummary[];
  notes: Note[];
  fogLine: number;
  expectedPage: number;
  window: MeetingWindow | null;
  lens: StageLens;
  viewAsConvenor: boolean;
  viewerSub: string;
  viewerLatestPage: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const BOOK_X = 92;
const BOOK_Y = 128;
const BOOK_W = 816;
const BOOK_H = 210;

export function ForeEdgeStage({
  book,
  chapters,
  meetings,
  readers,
  notes,
  fogLine,
  expectedPage,
  lens,
  viewAsConvenor,
  viewerSub,
  viewerLatestPage,
  selectedId,
  onSelect,
}: ForeEdgeStageProps) {
  const colors = useThemeColors();
  const reducedMotion = useReducedMotion();

  const totalPages = Math.max(1, book.totalPages);
  const pageToX = (page: number) => BOOK_X + (Math.max(0, Math.min(totalPages, page)) / totalPages) * BOOK_W;

  // Deterministic fine page lines across the fore-edge block
  const pageLines = useMemo(() => {
    const count = 136;
    const out: Array<{ x: number; opacity: number; width: number }> = [];
    for (let i = 1; i < count; i++) {
      const x = BOOK_X + (i / count) * BOOK_W;
      const grain = ((i * 37) % 11) / 11;
      out.push({
        x,
        opacity: 0.08 + grain * 0.14,
        width: i % 9 === 0 ? 1.1 : 0.65,
      });
    }
    return out;
  }, []);

  // Group notes by chapter for margin tabs
  const notesByChapter = useMemo(() => {
    const map = new Map<number, { total: number; open: number; sealed: number }>();
    for (const n of notes) {
      const vis = getNoteVisibility(n, chapters, viewerSub, viewerLatestPage, viewAsConvenor);
      const cur = map.get(n.chapter) ?? { total: 0, open: 0, sealed: 0 };
      cur.total += 1;
      if (vis.visible && !vis.isSpoiler) cur.open += 1;
      else cur.sealed += 1;
      map.set(n.chapter, cur);
    }
    return map;
  }, [notes, chapters, viewerSub, viewerLatestPage, viewAsConvenor]);

  const fogX = pageToX(fogLine);
  const expectedX = pageToX(expectedPage);

  const accentSolid = colors.accent[9] || '#6b5ce7';
  const fgColor = colors.text || (colors.dark ? '#f5f4f8' : '#1b1824');
  const lineColor = colors.line || (colors.dark ? '#383446' : '#dcd6cc');

  const ribbonColor = (r: ReaderSummary) => {
    if (r.membership.status === 'paused' || r.membership.status === 'dropped') return colors.muted;
    if (r.state === 'ahead') return accentSolid;
    if (r.state === 'behind') return colors.warn;
    return colors.ok;
  };

  // Spread overlapping ribbons slightly so labels never collide
  const positionedReaders = useMemo(() => {
    const sorted = [...readers].sort((a, b) => a.latestPage - b.latestPage);
    return sorted.map((r, idx) => {
      const x = pageToX(r.latestPage);
      const tier = idx % 3;
      const dropLen = 58 + tier * 30;
      return { reader: r, x, dropLen };
    });
  }, [readers, totalPages]);

  const isDark = colors.dark;
  const paperLight = isDark ? '#2b2722' : '#f7f1e3';
  const paperMid = isDark ? '#221f1b' : '#eee4cf';
  const clothCover = isDark ? '#3a2f4d' : '#4a3d63';
  const giltGold = isDark ? '#d4b46a' : '#c89e46';
  const fogShade = isDark ? 'rgba(9, 10, 16, 0.56)' : 'rgba(28, 25, 38, 0.22)';
  const lampGlow = isDark ? 'rgba(244, 198, 114, 0.16)' : 'rgba(255, 224, 152, 0.42)';

  return (
    <div
      className="relative flex h-full w-[calc(100%-var(--side-w,0px))] items-center justify-center overflow-hidden select-none"
      data-testid="fore-edge-stage"
    >
      <svg
        viewBox="0 0 1000 540"
        className="h-full max-h-[680px] w-full max-w-[1100px]"
        role="img"
        aria-label={`Fore-edge of ${book.title}, ${book.totalPages} pages, fog line at page ${fogLine}`}
      >
        <defs>
          {/* Warm reading lamp from the left */}
          <radialGradient id="lamp-pool" cx="14%" cy="22%" r="72%">
            <stop offset="0%" stopColor={lampGlow} />
            <stop offset="65%" stopColor="transparent" />
          </radialGradient>

          {/* Paper fore-edge horizontal gradient */}
          <linearGradient id="paper-block" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={paperLight} />
            <stop offset="50%" stopColor={paperMid} />
            <stop offset="100%" stopColor={paperLight} />
          </linearGradient>

          {/* Gilt top edge */}
          <linearGradient id="gilt-edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={giltGold} stopOpacity="0.95" />
            <stop offset="45%" stopColor="#f3dc9b" stopOpacity="0.95" />
            <stop offset="100%" stopColor={giltGold} stopOpacity="0.7" />
          </linearGradient>

          {/* Soft table shadow */}
          <filter id="book-shadow" x="-8%" y="-10%" width="116%" height="130%">
            <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#000000" floodOpacity={isDark ? 0.55 : 0.18} />
          </filter>
        </defs>

        {/* Warm table surface + reading lamp light */}
        <rect x="0" y="0" width="1000" height="540" fill="url(#lamp-pool)" />

        {/* Subtle desk horizon line */}
        <line
          x1="40"
          y1={BOOK_Y + BOOK_H + 18}
          x2="960"
          y2={BOOK_Y + BOOK_H + 18}
          stroke={lineColor}
          strokeOpacity="0.45"
          strokeDasharray="2 6"
        />

        {/* Hardback book body */}
        <g filter="url(#book-shadow)">
          {/* Left cloth board (front cover) */}
          <rect x={BOOK_X - 16} y={BOOK_Y - 12} width="18" height={BOOK_H + 24} rx="4" fill={clothCover} />
          <rect x={BOOK_X - 13} y={BOOK_Y - 9} width="3" height={BOOK_H + 18} rx="1" fill="#ffffff" fillOpacity="0.14" />

          {/* Right cloth board (back cover) */}
          <rect x={BOOK_X + BOOK_W - 2} y={BOOK_Y - 12} width="18" height={BOOK_H + 24} rx="4" fill={clothCover} />

          {/* Top cloth headcap & gilt top edge */}
          <rect x={BOOK_X} y={BOOK_Y - 10} width={BOOK_W} height="10" fill="url(#gilt-edge)" />
          <rect x={BOOK_X} y={BOOK_Y + BOOK_H} width={BOOK_W} height="8" fill={clothCover} fillOpacity="0.82" />

          {/* Fore-edge paper block */}
          <rect x={BOOK_X} y={BOOK_Y} width={BOOK_W} height={BOOK_H} fill="url(#paper-block)" stroke={lineColor} strokeWidth="1" />

          {/* Fine page lines with paper grain */}
          {pageLines.map((line, i) => (
            <line
              key={i}
              x1={line.x}
              y1={BOOK_Y + 1}
              x2={line.x}
              y2={BOOK_Y + BOOK_H - 1}
              stroke={isDark ? '#8b7e6a' : '#7a6850'}
              strokeOpacity={line.opacity}
              strokeWidth={line.width}
            />
          ))}

          {/* Chapter bands (subtle in all lenses, prominent in chapter lens) */}
          {chapters.map((ch) => {
            const x1 = pageToX(ch.startPage - 1);
            const x2 = pageToX(ch.endPage);
            const isSelected = selectedId === `chapter:${ch.number}`;
            const showBand = lens === 'chapter' || isSelected;
            return (
              <g key={ch.id}>
                {showBand && (
                  <rect
                    x={x1}
                    y={BOOK_Y}
                    width={Math.max(2, x2 - x1)}
                    height={BOOK_H}
                    fill={isSelected ? colors.accent[9] : colors.muted}
                    fillOpacity={isSelected ? 0.18 : ch.number % 2 === 0 ? 0.06 : 0.02}
                  />
                )}
                <line
                  x1={x1}
                  y1={BOOK_Y}
                  x2={x1}
                  y2={BOOK_Y + BOOK_H}
                  stroke={lineColor}
                  strokeOpacity={lens === 'chapter' ? 0.65 : 0.25}
                  strokeWidth={lens === 'chapter' ? 1.2 : 0.75}
                />
              </g>
            );
          })}

          {/* Fog shade beyond the fog line */}
          {fogLine < totalPages && (
            <rect
              x={fogX}
              y={BOOK_Y}
              width={Math.max(0, BOOK_X + BOOK_W - fogX)}
              height={BOOK_H}
              fill={fogShade}
              pointerEvents="none"
            />
          )}
        </g>

        {/* Chapter paper tabs along top gilt edge */}
        {chapters.map((ch) => {
          const x = pageToX(ch.startPage);
          const isSelected = selectedId === `chapter:${ch.number}`;
          return (
            <g
              key={`tab-${ch.id}`}
              className="cursor-pointer"
              onClick={() => onSelect(isSelected ? null : `chapter:${ch.number}`)}
              role="button"
              tabIndex={0}
              aria-label={`Chapter ${ch.number}: ${ch.title}, pages ${ch.startPage} to ${ch.endPage}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(isSelected ? null : `chapter:${ch.number}`);
                }
              }}
            >
              <path
                d={`M ${x} ${BOOK_Y - 10} L ${x + 3} ${BOOK_Y - 26} L ${x + 26} ${BOOK_Y - 26} L ${x + 29} ${BOOK_Y - 10} Z`}
                fill={isSelected ? colors.accent[9] : paperLight}
                stroke={isSelected ? accentSolid : lineColor}
                strokeWidth="1"
              />
              <text
                x={x + 14.5}
                y={BOOK_Y - 15}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-mono, monospace)"
                fontWeight={isSelected ? 700 : 500}
                fill={isSelected ? '#ffffff' : fgColor}
              >
                {ch.number}
              </text>
            </g>
          );
        })}

        {/* Meeting flags (pennants on poles above the gilt edge) */}
        {meetings.map((m, idx) => {
          const ch = chapters.find((c) => c.number === m.endChapter);
          const targetPage = ch ? ch.endPage : totalPages;
          const x = pageToX(targetPage);
          const isSelected = selectedId === `meeting:${m.id}`;
          return (
            <g
              key={m.id}
              className="cursor-pointer"
              onClick={() => onSelect(isSelected ? null : `meeting:${m.id}`)}
              role="button"
              tabIndex={0}
              aria-label={`Meeting ${idx + 1} on ${m.on.slice(0, 10)}, through chapter ${m.endChapter}`}
            >
              <line x1={x} y1={BOOK_Y - 78} x2={x} y2={BOOK_Y + BOOK_H} stroke={colors.accent[9]} strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.7" />
              <path
                d={`M ${x} ${BOOK_Y - 78} L ${x + 76} ${BOOK_Y - 78} L ${x + 69} ${BOOK_Y - 67} L ${x + 76} ${BOOK_Y - 56} L ${x} ${BOOK_Y - 56} Z`}
                fill={isSelected ? fgColor : colors.accent[9]}
              />
              <text
                x={x + 7}
                y={BOOK_Y - 64}
                fontSize="9.5"
                fontWeight="600"
                fontFamily="var(--font-mono, monospace)"
                fill="#ffffff"
              >
                M{idx + 1} · Ch {m.endChapter}
              </text>
            </g>
          );
        })}

        {/* Expected pace line (especially highlighted in pace lens) */}
        <g opacity={lens === 'pace' ? 1 : 0.5}>
          {lens === 'pace' && (
            <rect
              x={pageToX(expectedPage - 10)}
              y={BOOK_Y}
              width={Math.max(4, pageToX(expectedPage + 10) - pageToX(expectedPage - 10))}
              height={BOOK_H}
              fill={colors.ok}
              fillOpacity="0.14"
            />
          )}
          <line
            x1={expectedX}
            y1={BOOK_Y - 34}
            x2={expectedX}
            y2={BOOK_Y + BOOK_H + 6}
            stroke={colors.ok}
            strokeWidth={lens === 'pace' ? 2 : 1.2}
            strokeDasharray="4 3"
          />
          <text
            x={expectedX}
            y={BOOK_Y - 39}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-mono, monospace)"
            fill={colors.ok}
            fontWeight="600"
          >
            Pace p.{expectedPage}
          </text>
        </g>

        {/* Fog line threshold */}
        <g>
          <line
            x1={fogX}
            y1={BOOK_Y - 10}
            x2={fogX}
            y2={BOOK_Y + BOOK_H + 12}
            stroke={fgColor}
            strokeWidth="2"
            strokeOpacity="0.8"
          />
          <rect
            x={Math.max(BOOK_X, fogX - 54)}
            y={BOOK_Y + 8}
            width="108"
            height="20"
            rx="10"
            fill={isDark ? '#1a1824' : '#ffffff'}
            fillOpacity="0.92"
            stroke={lineColor}
          />
          <text
            x={Math.max(BOOK_X + 54, fogX)}
            y={BOOK_Y + 21}
            textAnchor="middle"
            fontSize="10"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="600"
            fill={fgColor}
          >
            Fog line · p.{fogLine}
          </text>
        </g>

        {/* Margin note tabs (open vs sealed flaps) */}
        {chapters.map((ch) => {
          const stats = notesByChapter.get(ch.number);
          if (!stats) return null;
          const x = pageToX((ch.startPage + ch.endPage) / 2);
          const allSealed = stats.open === 0 && stats.sealed > 0;
          const isSelected = selectedId === `chapter:${ch.number}`;
          const scale = lens === 'notes' ? 1.15 : 0.95;
          return (
            <g
              key={`notes-${ch.id}`}
              transform={`translate(${x}, ${BOOK_Y + BOOK_H - 22}) scale(${scale})`}
              className="cursor-pointer"
              onClick={() => onSelect(isSelected ? null : `chapter:${ch.number}`)}
              opacity={lens === 'notes' ? 1 : 0.8}
            >
              {allSealed ? (
                /* Sealed flap (spoiler-locked) */
                <g>
                  <rect x="-11" y="-8" width="22" height="16" rx="2" fill={isDark ? '#332e3c' : '#e5dfd3'} stroke={colors.muted} strokeWidth="1" />
                  <path d="M -11 -8 L 0 1 L 11 -8" fill="none" stroke={colors.muted} strokeWidth="1" />
                  <circle cx="0" cy="1" r="2.2" fill={colors.warn} />
                </g>
              ) : (
                /* Open note slip */
                <g>
                  <rect x="-11" y="-10" width="22" height="18" rx="2" fill={isDark ? '#252130' : '#fffdf8'} stroke={colors.accent[9]} strokeWidth="1.2" />
                  <text
                    x="0"
                    y="3"
                    textAnchor="middle"
                    fontSize="9"
                    fontFamily="var(--font-mono, monospace)"
                    fontWeight="700"
                    fill={colors.accent[9]}
                  >
                    {stats.open}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Reader silk ribbon markers */}
        {positionedReaders.map(({ reader: r, x, dropLen }) => {
          const fill = ribbonColor(r);
          const isSelected = selectedId === `reader:${r.membership.readerSub}`;
          const isMe = r.membership.readerSub === viewerSub;
          const ribbonW = isSelected || isMe ? 12 : 9;
          const bottomY = BOOK_Y + BOOK_H + dropLen;
          const firstName = r.membership.readerName.split(' ')[0];
          const subtitle =
            lens === 'pace'
              ? r.catchUpMinutes > 0
                ? `${formatDuration(r.catchUpMinutes)} behind`
                : `${r.pace7d} p/d`
              : `p.${r.latestPage}`;

          return (
            <g
              key={r.membership.id}
              className="cursor-pointer"
              style={reducedMotion ? undefined : { transition: 'transform 260ms ease' }}
              onClick={() => onSelect(isSelected ? null : `reader:${r.membership.readerSub}`)}
              role="button"
              tabIndex={0}
              aria-label={`${r.membership.readerName}, page ${r.latestPage}, ${r.membership.status === 'paused' ? 'paused' : r.state}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(isSelected ? null : `reader:${r.membership.readerSub}`);
                }
              }}
            >
              {/* Ribbon thread inside the fore-edge */}
              <line
                x1={x}
                y1={BOOK_Y}
                x2={x}
                y2={BOOK_Y + BOOK_H}
                stroke={fill}
                strokeWidth={isSelected ? 3 : 2}
                strokeOpacity={r.membership.status === 'paused' ? 0.5 : 0.9}
              />

              {/* Silk ribbon draping below with swallowtail notch */}
              <path
                d={`M ${x - ribbonW / 2} ${BOOK_Y + BOOK_H}
                    L ${x + ribbonW / 2} ${BOOK_Y + BOOK_H}
                    L ${x + ribbonW / 2} ${bottomY}
                    L ${x} ${bottomY - 8}
                    L ${x - ribbonW / 2} ${bottomY} Z`}
                fill={fill}
                fillOpacity={r.membership.status === 'paused' ? 0.55 : 0.95}
                stroke={isSelected ? fgColor : 'none'}
                strokeWidth={isSelected ? 1.5 : 0}
              />

              {/* Reader label pill */}
              <g transform={`translate(${x}, ${bottomY + 14})`}>
                <rect
                  x="-38"
                  y="-11"
                  width="76"
                  height="28"
                  rx="6"
                  fill={isDark ? 'rgba(18, 17, 24, 0.85)' : 'rgba(252, 250, 246, 0.88)'}
                />
                <text
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isSelected || isMe ? 700 : 600}
                  fill={fgColor}
                >
                  {firstName}
                  {r.membership.status === 'paused' ? ' (paused)' : ''}
                </text>
                <text
                  y="13"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontFamily="var(--font-mono, monospace)"
                  fill={colors.muted}
                >
                  {subtitle}
                </text>
              </g>
            </g>
          );
        })}

        {/* Page scale footer */}
        <text x={BOOK_X} y={BOOK_Y - 34} fontSize="10" fontFamily="var(--font-mono, monospace)" fill={colors.muted}>
          p. 1
        </text>
        <text
          x={BOOK_X + BOOK_W}
          y={BOOK_Y - 34}
          textAnchor="end"
          fontSize="10"
          fontFamily="var(--font-mono, monospace)"
          fill={colors.muted}
        >
          p. {book.totalPages}
        </text>
      </svg>
    </div>
  );
}
