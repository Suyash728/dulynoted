'use client';

import type { RunResult } from '@/lib/types';
import { ActionCard } from './result/ActionCard';
import { ApprovalBar } from './result/ApprovalBar';
import { AudienceChips } from './result/AudienceChips';
import { ClashBanner } from './result/ClashBanner';
import { DigestPreview } from './result/DigestPreview';
import { EventRow } from './result/EventRow';
import { TimeSavedPill } from './result/TimeSavedPill';

const EMPTY_STEPS = [
  ['Load a sample circular', 'or paste any notice — messy WhatsApp forwards are fine.'],
  ['Run the automation', 'AI extracts actions and dates; code resolves exact times, finds the classes and checks their timetable.'],
  ['Approve once', 'every affected class gets the message and a calendar file with reminders.'],
] as const;

interface Props {
  run: RunResult | null;
  running: boolean;
  approving: boolean;
  onApprove: () => void;
  onRefresh: () => Promise<RunResult | null> | null;
}

export function ResultPanel({ run, running, approving, onApprove, onRefresh }: Props) {
  if (!run?.extraction) {
    return (
      <section aria-labelledby="result-title" className="rounded-lg border bg-card p-4">
        <h2 id="result-title" className="text-sm font-semibold">
          2 · What students need to do
        </h2>
        {running ? (
          <p className="mt-4 text-sm text-muted-foreground">Working… results appear as soon as the pipeline finishes.</p>
        ) : (
          <ol className="mt-4 space-y-3 text-sm">
            {EMPTY_STEPS.map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span>
                  <strong>{title}</strong> — {body}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }

  const x = run.extraction;
  return (
    <section aria-labelledby="result-title" className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="result-title" className="text-lg font-semibold leading-tight">
            {x.title}
          </h2>
          <p className="text-sm text-muted-foreground">{[x.issuer, x.summary].filter(Boolean).join(' — ')}</p>
        </div>
        {run.timeSaved && <TimeSavedPill value={run.timeSaved} />}
      </div>

      <ClashBanner clashes={run.clashes} />

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
      <DigestPreview digests={run.digests} />

      <ApprovalBar run={run} approving={approving} onApprove={onApprove} onRefresh={onRefresh} />
    </section>
  );
}
