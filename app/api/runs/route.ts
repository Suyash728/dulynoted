import { runPipeline } from '@/lib/pipeline/run';
import { runInputSchema } from '@/lib/schemas';
import { fail } from '@/lib/api';
import { ndjsonResponse } from '@/lib/ndjson-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY_BYTES = 4 * 1024 * 1024;

function field(form: FormData, name: string): string | undefined {
  const v = form.get(name);
  return typeof v === 'string' && v !== '' ? v : undefined;
}

/** POST FormData { inputType, text?, sampleId? } → NDJSON stream of StreamEvent lines. */
export async function POST(request: Request): Promise<Response> {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail('Upload is larger than 4 MB', 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('Expected multipart/form-data', 400);
  }

  const parsed = runInputSchema.safeParse({
    inputType: field(form, 'inputType'),
    text: field(form, 'text'),
    sampleId: field(form, 'sampleId'),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input', 400);

  return ndjsonResponse(runPipeline(parsed.data), 'api/runs');
}
