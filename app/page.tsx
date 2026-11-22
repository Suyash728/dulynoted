import { SiteHeader } from '@/components/SiteHeader';
import { StatsStrip } from '@/components/StatsStrip';
import { Workspace } from '@/components/Workspace';
import { loadDashboard } from '@/lib/dashboard';
import { SAMPLES } from '@/lib/samples';
import { MAX_TEXT_CHARS, uuidSchema } from '@/lib/schemas';
import { loadSampleText } from '@/lib/seed';

// Sample dates are rendered relative to today (IST) and stats are live, so never serve a stale page.
export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { run?: string } }) {
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
      <SiteHeader status={dashboard.status} current="home" />
      <main id="main" className="mx-auto max-w-[1400px] space-y-4 px-4 py-5">
        <h1 className="sr-only">DulyNoted dashboard — process a circular</h1>
        <StatsStrip stats={dashboard.stats} />
        <Workspace samples={samples} maxChars={MAX_TEXT_CHARS} initialRunId={runId} />
      </main>
    </>
  );
}
