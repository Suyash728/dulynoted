import { Workspace } from '@/components/Workspace';
import { SAMPLES } from '@/lib/samples';
import { MAX_TEXT_CHARS } from '@/lib/schemas';
import { loadSampleText } from '@/lib/seed';

// Sample dates are rendered relative to today (IST), so never serve a stale page.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const samples = await Promise.all(
    SAMPLES.map(async (s) => ({ id: s.id, label: s.label, text: (await loadSampleText(s.id)).text })),
  );

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-baseline justify-between gap-2 px-4 py-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">DulyNoted</h1>
            <p className="text-sm text-muted-foreground">
              Drop any college circular. Every affected class gets the deadline, the checklist and a calendar reminder, automatically.
            </p>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-[1400px] px-4 py-6">
        <Workspace samples={samples} maxChars={MAX_TEXT_CHARS} />
      </main>
    </>
  );
}
