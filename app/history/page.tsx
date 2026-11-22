import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { z } from 'zod';
import { StatsStrip } from '@/components/StatsStrip';
import { loadDashboard } from '@/lib/dashboard';
import type { RunSummary } from '@/lib/db';
import { cn } from '@/lib/utils';
import type { RunStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'History · DulyNoted' };

const STATUS: Record<RunStatus, { label: string; icon: typeof Clock; className: string }> = {
  running: { label: 'Running', icon: Loader2, className: 'text-primary' },
  awaiting_approval: { label: 'Awaiting approval', icon: Clock, className: 'text-amber-800' },
  delivered: { label: 'Delivered', icon: CheckCircle2, className: 'text-emerald-800' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-red-800' },
};

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'delivered', label: 'Delivered', test: (r: RunSummary) => r.status === 'delivered' },
  { id: 'awaiting', label: 'Awaiting approval', test: (r: RunSummary) => r.status === 'awaiting_approval' },
  { id: 'clashes', label: 'Clashes detected', test: (r: RunSummary) => r.clashes > 0 },
] as const;
const filterSchema = z.enum(['all', 'delivered', 'awaiting', 'clashes']).catch('all');

const when = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Row({ r }: { r: RunSummary }) {
  const s = STATUS[r.status];
  const Icon = s.icon;
  return (
    <tr className="border-b last:border-0 hover:bg-muted/50">
      <td className="whitespace-nowrap px-3 py-2.5">{when.format(new Date(r.createdAt))}</td>
      <th scope="row" className="px-3 py-2.5 text-left font-medium">
        <Link href={`/?run=${r.id}`} className="text-primary underline-offset-4 hover:underline">
          {r.sourceName}
        </Link>
        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] uppercase text-muted-foreground">{r.inputType}</span>
      </th>
      <td className="px-3 py-2.5">
        <span className={`inline-flex items-center gap-1.5 ${s.className}`}>
          <Icon aria-hidden className="h-4 w-4" />
          {s.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {r.clashes > 0 ? <span className="inline-flex items-center gap-1 text-red-800"><AlertTriangle aria-hidden className="h-3.5 w-3.5" />{r.clashes}</span> : <span className="text-muted-foreground">0</span>}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">
        {r.classes} <span className="text-muted-foreground">({r.students} students)</span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{r.manualMin !== null ? `≈ ${r.manualMin} min → ${r.autoSec} s` : '—'}</td>
    </tr>
  );
}

export default async function HistoryPage({ searchParams }: { searchParams: { filter?: string } }) {
  const filter = filterSchema.parse(searchParams.filter);
  const { runs: all, stats, status } = await loadDashboard();
  const active = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const runs = all.filter(active.test).slice(0, 50);

  return (
    <>
      <SiteHeader status={status} current="history" />
      <main id="main" className="mx-auto max-w-[1400px] space-y-4 px-4 py-5">
        <h1 className="text-xl font-semibold">Run history</h1>
        <StatsStrip stats={stats} />
        {!status.database && (
          <p role="alert" className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle aria-hidden className="h-4 w-4" />
            Could not load history right now.
          </p>
        )}
        <nav aria-label="Filter runs">
          <ul className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const count = all.filter(f.test).length;
              const current = f.id === active.id;
              return (
                <li key={f.id}>
                  <Link
                    href={f.id === 'all' ? '/history' : `/history?filter=${f.id}`}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent',
                      current ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : 'bg-card',
                    )}
                  >
                    {f.label}
                    <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', current ? 'bg-white/20' : 'bg-muted')}>{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Latest runs ({active.label}), newest first. Open a run to see its full log.</caption>
            <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2">Time (IST)</th>
                <th scope="col" className="px-3 py-2">Source</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2 text-right">Clashes</th>
                <th scope="col" className="px-3 py-2 text-right">Classes reached</th>
                <th scope="col" className="px-3 py-2 text-right">Time saved</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <Row key={r.id} r={r} />
              ))}
              {runs.length === 0 && status.database && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No runs match this filter — <Link href="/" className="text-primary underline">process a circular</Link>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
