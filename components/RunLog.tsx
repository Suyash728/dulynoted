'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Circle, Loader2, MinusCircle, XCircle } from 'lucide-react';
import type { RunStep, StepName, StepStatus, Tier } from '@/lib/types';
import { cn } from '@/lib/utils';

const PLANNED: StepName[] = ['INGEST', 'EXTRACT', 'NORMALIZE_DATES', 'ROUTE_AUDIENCE', 'CLASH_CHECK', 'COMPOSE'];

const STEP_LABEL: Record<StepName, string> = {
  INGEST: 'Read circular',
  EXTRACT: 'Extract actions & dates',
  REPAIR: 'Repair AI output',
  NORMALIZE_DATES: 'Resolve exact dates',
  ROUTE_AUDIENCE: 'Find affected classes',
  CLASH_CHECK: 'Check class timetable',
  COMPOSE: 'Write class message',
  APPROVE: 'Staff approval',
  DELIVER: 'Deliver to classes',
  SCHEDULE: 'Scheduled reminder',
};

const STATUS: Record<StepStatus, { label: string; icon: typeof Circle; className: string }> = {
  running: { label: 'Running', icon: Loader2, className: 'text-primary' },
  ok: { label: 'OK', icon: CheckCircle2, className: 'text-emerald-700' },
  warn: { label: 'Warning', icon: AlertTriangle, className: 'text-amber-800' },
  error: { label: 'Error', icon: XCircle, className: 'text-red-700' },
  skipped: { label: 'Skipped', icon: MinusCircle, className: 'text-muted-foreground' },
};

const TIER_LABEL: Record<Tier, string> = { groq: 'Groq', gemini: 'Gemini', cache: 'Cache', none: 'Template' };

function StepRow({ step }: { step: RunStep }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[step.status];
  const Icon = s.icon;
  const detailId = `step-detail-${step.seq}`;

  return (
    <li className="animate-row-in border-b border-border/70 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={detailId}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/60"
      >
        <Icon aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0', s.className, step.status === 'running' && 'animate-spin')} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{STEP_LABEL[step.step]}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide', s.className, 'bg-muted')}>
              {s.label}
            </span>
            {step.tier && (
              <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">{TIER_LABEL[step.tier]}</span>
            )}
            {step.ms !== undefined && <span className="text-[11px] text-muted-foreground">{step.ms} ms</span>}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {step.step}
            {step.output ? ` → ${step.output}` : ''}
          </span>
        </span>
        <ChevronRight aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <span className="sr-only">{open ? 'Hide details' : 'Show details'}</span>
      </button>
      {open && (
        <div id={detailId} className="space-y-2 px-3 pb-3 pl-10 text-xs">
          <p>
            <span className="font-semibold">In:</span> {step.input || '—'}
          </p>
          <p>
            <span className="font-semibold">Out:</span> {step.output || '—'}
          </p>
          {step.model && (
            <p>
              <span className="font-semibold">Model:</span> {step.model}
            </p>
          )}
          {step.detail !== undefined && step.detail !== null && (
            <pre tabIndex={0} aria-label={`${step.step} raw output`} className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-[11px] leading-relaxed">
              {JSON.stringify(step.detail, null, 2)}
            </pre>
          )}
        </div>
      )}
    </li>
  );
}

const APPROVAL: StepName[] = ['APPROVE', 'DELIVER'];

export function RunLog({ steps, active, approving }: { steps: RunStep[]; active: boolean; approving: boolean }) {
  const seen = new Set(steps.map((s) => s.step));
  const planned = approving || seen.has('APPROVE') ? [...PLANNED, ...APPROVAL] : PLANNED;
  const waiting = active || approving || steps.length > 0 ? planned.filter((p) => !seen.has(p)) : [];
  const finished = steps.filter((s) => s.status !== 'running').length;

  return (
    <section aria-labelledby="runlog-title" className="flex h-full flex-col rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-3 py-2.5">
        <h2 id="runlog-title" className="text-sm font-semibold">
          Run log
        </h2>
        <span className="text-xs text-muted-foreground">{steps.length ? `${finished} steps done` : 'idle'}</span>
      </header>
      <div className="font-mono text-sm">
        {steps.length === 0 && !active && !approving ? (
          <p className="px-3 py-6 text-xs text-muted-foreground">Every pipeline step appears here live — click any row to see exactly what went in and came out.</p>
        ) : (
          <ol aria-live="polite" aria-relevant="additions text" className="list-none">
            {steps.map((s) => (
              <StepRow key={s.seq} step={s} />
            ))}
            {waiting.map((name) => (
              <li key={name} className="flex items-center gap-3 border-b border-border/70 px-3 py-2.5 text-muted-foreground last:border-0">
                <Circle aria-hidden className="h-4 w-4" />
                <span>{STEP_LABEL[name]}</span>
                <span className="text-[11px]">waiting</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
