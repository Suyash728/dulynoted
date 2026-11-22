import { SiteHeader } from '@/components/SiteHeader';
import { StatsStrip } from '@/components/StatsStrip';
import { Workspace } from '@/components/Workspace';
import { loadDashboard } from '@/lib/dashboard';
import { SAMPLES } from '@/lib/samples';
import { MAX_TEXT_CHARS, uuidSchema } from '@/lib/schemas';
import { loadSampleText } from '@/lib/seed';

// Sample dates are rendered relative to today (IST) and stats are live, so never serve a stale page.
export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { run?: string; review?: string } }) {
  const runId = uuidSchema.safeParse(searchParams.run).success ? searchParams.run : undefined;
  const [samples, dashboard] = await Promise.all([
    Promise.all(SAMPLES.map(async (s) => ({ id: s.id, label: s.label, text: (await loadSampleText(s.id)).text }))),
    loadDashboard(),
  ]);

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader
        status={dashboard.status}
        pendingApprovals={dashboard.pendingApprovals}
        current="home"
        title="Circular automation dashboard"
        subtitle="Drop any college circular. Gemini reads it, code checks dates, classes and timetables — one approval sends every class its deadline, checklist and calendar link."
      >
        <StatsStrip stats={dashboard.stats} />
      </SiteHeader>
      <main id="main" className="mx-auto -mt-1 max-w-[1400px] px-4 py-6">
        <Workspace samples={samples} maxChars={MAX_TEXT_CHARS} initialRunId={runId} focusApproval={Boolean(runId) && searchParams.review === '1'} />
      </main>
    </>
  );
}
