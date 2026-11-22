import { fail } from '@/lib/api';
import { renderNoticePdf } from '@/lib/sample-pdf';
import { loadSampleText } from '@/lib/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Demo upload: the exam-form circular as a printed PDF, dated relative to today (IST). */
export async function GET(): Promise<Response> {
  try {
    const { text } = await loadSampleText('exam-form');
    const bytes = await renderNoticePdf(text, 'EXAM CELL');
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="exam-form.pdf"',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err) {
    console.error('[api/samples/pdf]', err instanceof Error ? err.message : 'unknown');
    return fail('Could not render the sample PDF', 500);
  }
}
