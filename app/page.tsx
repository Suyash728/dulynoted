import { SiteHeader } from '@/components/SiteHeader';
import { Workspace } from '@/components/Workspace';
import { SAMPLES } from '@/lib/samples';
import { MAX_TEXT_CHARS } from '@/lib/schemas';
import { loadSampleText } from '@/lib/seed';
import { uuidSchema } from '@/lib/schemas';
import type { SampleFile } from '@/components/InputPanel';

const FILE_SAMPLES: SampleFile[] = [
  { id: 'exam-form', label: 'Sample PDF: Exam form', url: '/samples/exam-form.pdf', kind: 'pdf' },
  { id: 'scholarship', label: 'Sample photo: Scholarship', url: '/samples/scholarship.jpg', kind: 'image' },
];

// Sample dates are rendered relative to today (IST), so never serve a stale page.
export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { run?: string } }) {
  const runId = uuidSchema.safeParse(searchParams.run).success ? searchParams.run : undefined;
  const samples = await Promise.all(
    SAMPLES.map(async (s) => ({ id: s.id, label: s.label, text: (await loadSampleText(s.id)).text })),
  );

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[1400px] px-4 py-6">
        <h1 className="sr-only">Process a circular</h1>
        <Workspace samples={samples} fileSamples={FILE_SAMPLES} maxChars={MAX_TEXT_CHARS} initialRunId={runId} />
      </main>
    </>
  );
}
