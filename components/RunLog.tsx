'use client';

import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Circle, Loader2, MinusCircle, XCircle } from 'lucide-react';
import type { RunStep, StepName, StepStatus } from '@/lib/types';
import { engineLabel, stepKind, type StepKind } from '@/lib/step-kind';
import { cn } from '@/lib/utils';
import { JsonView } from './result/JsonView';
import { PanelHeader } from './PanelHeader';

const PLANNED: StepName[] = ['INGEST', 'EXTRACT', 'NORMALIZE_DATES', 'ROUTE_AUDIENCE', 'CLASH_CHECK', 'COMPOSE'];
const APPROVAL: StepName[] = ['APPROVE', 'DELIVER'];

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

const STATUS: Record<StepStatus, { label: string; icon: typeof Circle; className: string; dot: string }> = {
  running: { label: 'Running', icon: Loader2, className: 'text-primary', dot: 'border-primary bg-card' },
  ok: { label: 'OK', icon: CheckCircle2, className: 'text-emerald-700', dot: 'border-emerald-600 bg-emerald-50' },
  warn: { label: 'Warning', icon: AlertTriangle, className: 'text-amber-800', dot: 'border-amber-600 bg-amber-50' },
  error: { label: 'Error', icon: XCircle, className: 'text-red-700', dot: 'border-red-600 bg-red-50' },
  skipped: { label: 'Skipped', icon: MinusCircle, className: 'text-muted-foreground', dot: 'border-border bg-muted' },
};

const KIND_STYLE: Record<StepKind, string> = {
  AI: 'bg-violet-100 text-violet-900',
  Code: 'bg-emerald-100 text-emerald-900',
  Human: 'bg-sky-100 text-sky-900',
};

function StepRow({ step }: { step: RunStep }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[step.status];
  const Icon = s.icon;
  const kind = stepKind(step);
  const engine = engineLabel(step);
  const detailId = `step-detail-${step.seq}`;

  return (
    <li className="animate-row-in relative pl-8">
      <span aria-hidden className={cn('absolute left-[11px] top-3 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2', s.dot)}>
        <Icon className={cn('h-3 w-3', s.className, step.status === 'running' && 'animate-spin')} />
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={detailId}
        className="flex w-full items-start gap-2 rounded-md py-2.5 pr-2 text-left hover:bg-muted/60"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="font-medium">{STEP_LABEL[step.step]}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', s.className, 'bg-muted')}>{s.label}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', KIND_STYLE[kind])}>
              {kind}
              {engine ? ` · ${engine}` : ''}
            </span>
            {step.ms !== undefined && <span className="text-[11px] text-muted-foreground">{step.ms} ms</span>}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] leading-snug text-muted-foreground">{step.output || step.input}</span>
        </span>
        <ChevronRight aria-hidden className={cn('mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <span className="sr-only">{open ? 'Hide details' : 'Show details'}</span>
      </button>
      {open && (
        <div id={detailId} className="space-y-1.5 pb-3 pr-2 font-mono text-xs">
          <p>
            <span className="font-semibold">Step:</span> {step.step}
          </p>
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
          {step.detail !== undefined && step.detail !== null && <JsonView value={step.detail} label={`${step.step} raw output`} />}
        </div>
      )}
    </li>
  );
}

export function RunLog({ steps, active, approving }: { steps: RunStep[]; active: boolean; approving: boolean }) {
  const seen = new Set(steps.map((s) => s.step));
  const planned = approving || seen.has('APPROVE') ? [...PLANNED, ...APPROVAL] : PLANNED;
  const waiting = active || approving || steps.length > 0 ? planned.filter((p) => !seen.has(p)) : [];
  const finished = steps.filter((s) => s.status !== 'running').length;
  const aiSteps = steps.filter((s) => s.status !== 'running' && stepKind(s) === 'AI').length;

  return (
    <section aria-labelledby="runlog-title" className="surface flex h-full flex-col">
      <header className="border-b px-5 py-4">
        <PanelHeader
          id="runlog-title"
          step={3}
          title="Live run log"
          hint="Every step, what went in and what came out"
          right={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Activity aria-hidden className="h-3 w-3" />
              {steps.length ? `${finished} done · ${aiSteps} AI` : 'idle'}
            </span>
          }
        />
      </header>
      <div className="px-3 py-2 text-sm">
        {steps.length === 0 && !active && !approving ? (
          <div className="space-y-2 px-1 py-5 text-xs text-muted-foreground">
            <p>Every pipeline step appears here live — click any row to see exactly what went in and came out.</p>
            <p className="flex flex-wrap gap-1.5">
              <span className={cn('rounded px-1.5 py-0.5 font-semibold', KIND_STYLE.AI)}>AI</span> reads language ·
              <span className={cn('rounded px-1.5 py-0.5 font-semibold', KIND_STYLE.Code)}>Code</span> does dates, routing, clashes ·
              <span className={cn('rounded px-1.5 py-0.5 font-semibold', KIND_STYLE.Human)}>Human</span> approves
            </p>
          </div>
        ) : (
          <ol aria-live="polite" aria-relevant="additions text" className="relative list-none">
            <span aria-hidden className="absolute bottom-3 left-[19px] top-3 w-0.5 bg-border" />
            {steps.map((s) => (
              <StepRow key={s.seq} step={s} />
            ))}
            {waiting.map((name) => (
              <li key={name} className="relative flex items-center gap-2 py-2.5 pl-8 text-muted-foreground">
                <span aria-hidden className="absolute left-[11px] h-[18px] w-[18px] rounded-full border-2 border-dashed border-border bg-card" />
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
