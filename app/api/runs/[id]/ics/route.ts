import { getRunResult } from '@/lib/db';
import { fail } from '@/lib/api';
import { buildIcs } from '@/lib/ics';
import { uuidSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET → text/calendar with every deadline and event of the run (works before approval). */
export async function GET(_request: Request, { params }: { params: { id: string } }): Promise<Response> {
  if (!uuidSchema.safeParse(params.id).success) return fail('Invalid run id', 400);
  try {
    const run = await getRunResult(params.id);
    if (!run?.extraction) return fail('Run not found', 404);
    const ics = buildIcs(run);
    return new Response(ics.body, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${ics.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/ics]', err instanceof Error ? err.message : 'unknown');
    return fail('Could not build the calendar file right now', 500);
  }
}
