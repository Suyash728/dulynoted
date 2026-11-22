'use client';

import { AlertOctagon, AlertTriangle, CalendarDays, Clock, FileCheck2, IndianRupee, MapPin, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ActionItem, Clash, Digest, EventItem, Recipient, RunResult, TimeSaved } from '@/lib/types';
import { formatDeadline, formatTime } from '@/lib/time';

function ReviewChip() {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
      <AlertTriangle aria-hidden className="h-3 w-3" />
      check date
    </span>
  );
}

function ClashBanner({ clashes }: { clashes: Clash[] }) {
  if (clashes.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      <p className="flex items-center gap-2 font-semibold">
        <AlertOctagon aria-hidden className="h-4 w-4" />
        Timetable clash{clashes.length > 1 ? 'es' : ''} detected
      </p>
      <ul className="mt-1.5 space-y-1 pl-6">
        {clashes.map((c, i) => (
          <li key={i}>
            <strong>{c.eventTitle}</strong> clashes with <strong>{c.withTitle}</strong> — {c.audienceLabel}, {formatDeadline(c.start)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionCard({ action }: { action: ActionItem }) {
  return (
    <li className="rounded-lg border bg-card p-3">
      <p className="font-semibold">{action.what}</p>
      <dl className="mt-1.5 space-y-1 text-sm">
        {(action.deadline || action.deadlineText) && (
          <div className="flex items-start gap-2">
            <dt>
              <Clock aria-hidden className="mt-0.5 h-4 w-4 text-primary" />
              <span className="sr-only">Deadline</span>
            </dt>
            <dd className="flex flex-wrap items-center gap-2">
              {action.deadline ? <span className="font-medium">{formatDeadline(action.deadline)}</span> : <span>{action.deadlineText}</span>}
              {action.needsReview && <ReviewChip />}
            </dd>
          </div>
        )}
        {action.location && (
          <div className="flex items-start gap-2">
            <dt>
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Where</span>
            </dt>
            <dd>{action.location}</dd>
          </div>
        )}
        {action.fee && (
          <div className="flex items-start gap-2">
            <dt>
              <IndianRupee aria-hidden className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Fee</span>
            </dt>
            <dd>{action.fee}</dd>
          </div>
        )}
      </dl>
      {action.requiredDocs.length > 0 && (
        <fieldset className="mt-2">
          <legend className="text-xs font-semibold text-muted-foreground">Checklist</legend>
          <ul className="mt-1 space-y-1 text-sm">
            {action.requiredDocs.map((doc, i) => (
              <li key={i}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1 accent-[hsl(var(--primary))]" />
                  <span>{doc}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </li>
  );
}

function EventRow({ event }: { event: EventItem }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <CalendarDays aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>
        <span className="font-medium">{event.title}</span>
        {' — '}
        {event.start ? `${formatDeadline(event.start)}${event.end ? `–${formatTime(event.end)}` : ''}` : event.dateText || 'date not given'}
        {event.venue ? `, ${event.venue}` : ''} {event.needsReview && <ReviewChip />}
      </span>
    </li>
  );
}

function AudienceChips({ recipients }: { recipients: Recipient[] }) {
  const total = recipients.reduce((s, r) => s + r.size, 0);
  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Users aria-hidden className="h-4 w-4" />
        For {recipients.length} classes · {total} students
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {recipients.map((r) => (
          <li key={r.audienceLabel} className="rounded-full border bg-accent px-2.5 py-0.5 text-xs text-accent-foreground">
            {r.audienceLabel} <span className="text-muted-foreground">· {r.size}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DigestPreview({ digests }: { digests: Digest[] }) {
  if (digests.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground">Class message preview</h3>
      <ul className="mt-1.5 space-y-2">
        {digests.map((d, i) => (
          <li key={i} className="max-w-prose rounded-2xl rounded-tl-sm border bg-[#eef6ff] p-3 text-sm">
            <p className="mb-1 text-[11px] font-semibold text-primary">To: {d.audienceLabels.join(', ')}</p>
            <p className="whitespace-pre-line">{d.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimeSavedPill({ value }: { value: TimeSaved }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900">
            <FileCheck2 aria-hidden className="h-4 w-4" />≈ {value.manualMin} min of manual work → {value.autoSec} s
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Estimate: {value.formula}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const EMPTY_STEPS = [
  ['Load a sample circular', 'or paste any notice — messy WhatsApp forwards are fine.'],
  ['Run the automation', 'AI extracts actions and dates; code resolves exact times, finds the classes and checks their timetable.'],
  ['Approve once', 'every affected class gets the message and a calendar file with reminders.'],
] as const;

export function ResultPanel({ run, running }: { run: RunResult | null; running: boolean }) {
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

      <div className="border-t pt-3">
        <Button type="button" disabled className="w-full" aria-describedby="approve-note">
          <Send aria-hidden className="h-4 w-4" />
          Approve &amp; send to {run.recipients.length} classes
        </Button>
        <p id="approve-note" className="mt-1 text-center text-[11px] text-muted-foreground">
          Nothing is sent without a staff approval.
        </p>
      </div>
    </section>
  );
}
