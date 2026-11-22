import Link from 'next/link';
import type { Metadata } from 'next';
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { listRecentRuns, type RunSummary } from '@/lib/db';
import type { RunStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'History · DulyNoted' };

const STATUS: Record<RunStatus, { label: string; icon: typeof Clock; className: string }> = {
  running: { label: 'Running', icon: Loader2, className: 'text-primary' },
  awaiting_approval: { label: 'Awaiting approval', icon: Clock, className: 'text-amber-800' },
  delivered: { label: 'Delivered', icon: CheckCircle2, className: 'text-emerald-800' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-red-800' },
};

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
        {r.classes} <span className="text-muted-foreground">({r.students} students)</span>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums">{r.manualMin !== null ? `≈ ${r.manualMin} min → ${r.autoSec} s` : '—'}</td>
    </tr>
  );
}

export default async function HistoryPage() {
  let runs: RunSummary[] = [];
  let error: string | null = null;
  try {
    runs = await listRecentRuns();
  } catch {
    error = 'Could not load history right now.';
  }
  const delivered = runs.filter((r) => r.status === 'delivered');
  const minutes = runs.reduce((s, r) => s + (r.manualMin ?? 0), 0);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold">Run history</h1>
          <p className="text-sm text-muted-foreground">
            {runs.length} circulars processed · {delivered.length} delivered · ≈ {minutes} min of manual work automated
          </p>
        </div>
        {error && (
          <p role="alert" className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle aria-hidden className="h-4 w-4" />
            {error}
          </p>
        )}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Latest 50 runs, newest first. Open a run to see its full log.</caption>
            <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2">Time (IST)</th>
                <th scope="col" className="px-3 py-2">Source</th>
                <th scope="col" className="px-3 py-2">Status</th>
                <th scope="col" className="px-3 py-2 text-right">Classes reached</th>
                <th scope="col" className="px-3 py-2 text-right">Time saved</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <Row key={r.id} r={r} />
              ))}
              {runs.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No runs yet — <Link href="/" className="text-primary underline">process your first circular</Link>.
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
