import { AppShell } from '@x10/shared/runtime';
import { Card, PageHeader, Section } from '@x10/shared/ui';

import {
  INACTIVE_TODAY_DAYS,
  PACE_BAND_PAGES,
  PAUSE_PROMPT_DAYS,
  RECENT_PACE_DAYS,
  WEEKEND_WEIGHT,
} from '../domain/config';

export function AboutPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <PageHeader title="About Fore-Edge" subtitle="Reading & study circle" />

        <Section title="The idea">
          <Card className="p-4 text-sm text-fg space-y-2">
            <p>
              Fore-Edge works reading pace back from each fortnightly meeting date, seals discussion notes until your bookmark
              reaches that chapter, and draws a fog line at the slowest active reader so nobody spoils the book.
            </p>
            <p className="text-muted">
              Supports the study-circle process; not legal, compliance, or educational accreditation advice.
            </p>
          </Card>
        </Section>

        <Section title="Rules & thresholds">
          <Card className="p-4 text-sm text-fg">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Effective days:</strong> weekdays count as 1, weekend days count as <code>{WEEKEND_WEIGHT}</code>.
              </li>
              <li>
                <strong>Reader state:</strong> ahead at +{PACE_BAND_PAGES} pages, behind at −{PACE_BAND_PAGES} pages, on pace
                otherwise. Forecast uses each reader&apos;s {RECENT_PACE_DAYS}-day pace.
              </li>
              <li>
                <strong>Spoiler lock:</strong> notes for chapter <em>n</em> stay sealed until your latest page reaches chapter{' '}
                <em>n</em>&apos;s start page (enforced in the app domain; authors always see their own, convenors see all with a
                spoiler tag).
              </li>
              <li>
                <strong>Fog line:</strong> the page of the slowest reader whose status is <code>reading</code> (paused and dropped
                readers are excluded).
              </li>
              <li>
                <strong>Catch-up &amp; pause:</strong> catch-up time uses your median pages per hour from logged sessions. Readers
                inactive for {INACTIVE_TODAY_DAYS} days appear in Today; at {PAUSE_PROMPT_DAYS} days they are offered a pause.
                Progress cannot go backwards except as a same-day correction.
              </li>
            </ul>
          </Card>
        </Section>
      </div>
    </AppShell>
  );
}
