import { runPipeline } from '@/lib/pipeline/run';
import { validateFile, type ValidFile } from '@/lib/file-input';
import { runInputSchema } from '@/lib/schemas';
import { fail } from '@/lib/api';
import { ndjsonResponse } from '@/lib/ndjson-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY_BYTES = 4.5 * 1024 * 1024; // file cap (4 MB) + form overhead

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

  let file: ValidFile | undefined;
  if (parsed.data.inputType !== 'text') {
    const upload = form.get('file');
    if (!(upload instanceof File)) return fail('Choose a PDF or image to upload', 400);
    const checked = validateFile(new Uint8Array(await upload.arrayBuffer()), upload.name);
    if (!checked.ok) return fail(checked.error, checked.error.includes('4 MB') ? 413 : 415);
    if (checked.file.kind !== parsed.data.inputType) return fail(`This file is not a ${parsed.data.inputType === 'pdf' ? 'PDF' : 'image'}`, 415);
    file = checked.file;
  }

  return ndjsonResponse(runPipeline({ ...parsed.data, file }), 'api/runs');
}
