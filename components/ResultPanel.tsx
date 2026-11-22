'use client';

import { ArrowRight, CalendarCheck2, ClipboardList, FileWarning, Loader2, ScanSearch } from 'lucide-react';
import type { RunResult } from '@/lib/types';
import { ActionCard } from './result/ActionCard';
import { ApprovalBar } from './result/ApprovalBar';
import { AudienceChips } from './result/AudienceChips';
import { ClashCard } from './result/ClashCard';
import { DigestPreview } from './result/DigestPreview';
import { EventRow } from './result/EventRow';
import { TimeSavedPill } from './result/TimeSavedPill';

interface Props {
  run: RunResult | null;
  running: boolean;
  approving: boolean;
  onApprove: () => void;
  onRefresh: () => Promise<RunResult | null> | null;
}

const SCHEMATIC = [
  { icon: FileWarning, title: 'Messy circular', body: 'PDF, phone photo or WhatsApp forward' },
  { icon: ScanSearch, title: 'AI reads · code checks', body: 'exact dates, affected classes, timetable clashes' },
  { icon: CalendarCheck2, title: 'One approval', body: 'class message + calendar file with reminders' },
] as const;

function EmptyState({ running }: { running: boolean }) {
  if (running) {
    return (
      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        Working… watch the run log — results appear as soon as the pipeline finishes.
      </p>
    );
  }
  return (
    <div className="mt-4 space-y-4">
      <ol className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {SCHEMATIC.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="contents">
            <div className="rounded-lg border bg-background p-3 text-center">
              <Icon aria-hidden className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-1.5 text-sm font-semibold">
                <span className="sr-only">Step {i + 1}: </span>
                {title}
              </p>
              <p className="text-xs text-muted-foreground">{body}</p>
            </div>
            {i < SCHEMATIC.length - 1 && <ArrowRight aria-hidden className="mx-auto hidden h-4 w-4 self-center text-muted-foreground sm:block" />}
          </li>
        ))}
      </ol>
      <p className="text-center text-sm text-muted-foreground">
        Pick a demo scenario on the left (or press <kbd className="rounded border bg-muted px-1 font-mono text-[11px]">1</kbd>), then <strong>Run automation</strong>.
      </p>
    </div>
  );
}

export function ResultPanel({ run, running, approving, onApprove, onRefresh }: Props) {
  if (!run?.extraction) {
    return (
      <section aria-labelledby="result-title" className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 id="result-title" className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList aria-hidden className="h-4 w-4 text-primary" />2 · What students need to do
        </h2>
        <EmptyState running={running} />
      </section>
    );
  }

  const x = run.extraction;
  return (
    <section aria-labelledby="result-title" className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{run.sourceName}</p>
          <h2 id="result-title" className="text-lg font-semibold leading-tight">
            {x.title}
          </h2>
          <p className="text-sm text-muted-foreground">{[x.issuer, x.summary].filter(Boolean).join(' — ')}</p>
        </div>
        {run.timeSaved && <TimeSavedPill value={run.timeSaved} />}
      </div>

      <ClashCard clashes={run.clashes} events={x.events} />

      {x.actions.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">To do</h3>
          <ul className="space-y-2">
            {x.actions.map((a, i) => (
              <ActionCard key={i} action={a} />
            ))}
          </ul>
        </div>
      )}

      {x.events.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Events</h3>
          <ul className="space-y-1.5">
            {x.events.map((e, i) => (
              <EventRow key={i} event={e} />
            ))}
          </ul>
        </div>
      )}

      <AudienceChips recipients={run.recipients} />
      <DigestPreview digests={run.digests} title={x.title} />

      <ApprovalBar run={run} approving={approving} onApprove={onApprove} onRefresh={onRefresh} />
    </section>
  );
}
