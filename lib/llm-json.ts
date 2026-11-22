import type { z } from 'zod';

/** Parses model output that may be wrapped in ```json fences or have prose around the object. */
export function parseJsonLoose(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();
  try {
    return JSON.parse(body);
  } catch {
    const start = body.indexOf('{');
    const end = body.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(body.slice(start, end + 1));
    throw new SyntaxError('Model reply contained no JSON object');
  }
}

export type Validation<T> = { ok: true; data: T } | { ok: false; error: string };

/** Parse + zod-validate; the error string is fed back to the model on the single repair call. */
export function validateJson<T>(raw: string, schema: z.ZodType<T, unknown>): Validation<T> {
  let json: unknown;
  try {
    json = parseJsonLoose(raw);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  const error = parsed.error.issues
    .slice(0, 8)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return { ok: false, error };
}
