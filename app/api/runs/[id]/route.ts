import { getRunResult } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { uuidSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET → ApiEnvelope<RunResult> including all persisted steps. */
export async function GET(_request: Request, { params }: { params: { id: string } }): Promise<Response> {
  if (!uuidSchema.safeParse(params.id).success) return fail('Invalid run id', 400);
  try {
    const run = await getRunResult(params.id);
    return run ? ok(run) : fail('Run not found', 404);
  } catch (err) {
    console.error('[api/runs/:id]', err instanceof Error ? err.message : 'unknown');
    return fail('Could not load this run right now', 500);
  }
}
