import { claimForApproval, getRunStatus } from '@/lib/db';
import { fail } from '@/lib/api';
import { ndjsonResponse } from '@/lib/ndjson-response';
import { approveRun } from '@/lib/pipeline/deliver';
import { uuidSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST → NDJSON stream: APPROVE then DELIVER. ?dryRun=1 skips the Telegram call. */
export async function POST(request: Request, { params }: { params: { id: string } }): Promise<Response> {
  if (!uuidSchema.safeParse(params.id).success) return fail('Invalid run id', 400);
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

  try {
    const status = await getRunStatus(params.id);
    if (!status) return fail('Run not found', 404);
    if (!(await claimForApproval(params.id))) {
      return fail(status === 'delivered' ? 'This circular was already sent' : 'This run is not ready for approval', 409);
    }
  } catch (err) {
    console.error('[api/approve]', err instanceof Error ? err.message : 'unknown');
    return fail('Could not start delivery right now', 500);
  }

  return ndjsonResponse(approveRun(params.id, { dryRun }), 'api/approve');
}
