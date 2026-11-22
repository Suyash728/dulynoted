import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Extraction } from './types';
import { SAMPLES, renderDateTokens, type SampleId } from './samples';
import { extractionSchema } from './schemas';

/** Server-side access to seed files (circular text + offline LLM fixtures). */

const SEED_DIR = path.join(process.cwd(), 'seed');

export async function loadSampleText(id: SampleId): Promise<{ label: string; text: string }> {
  const sample = SAMPLES.find((s) => s.id === id);
  if (!sample) throw new Error(`Unknown sample: ${id}`);
  const raw = await readFile(path.join(SEED_DIR, 'circulars', sample.file), 'utf8');
  return { label: sample.label, text: renderDateTokens(raw) };
}

const fixtureSchema = z.object({ extraction: extractionSchema, digest: z.string().min(1) });
export type Fixture = { extraction: Extraction; digest: string };

/** Cached model output for a known sample; null when none exists. Dates are stored as {{D+n}} tokens. */
export async function loadFixture(id: SampleId): Promise<Fixture | null> {
  try {
    const raw = await readFile(path.join(SEED_DIR, 'fixtures', `${id}.json`), 'utf8');
    const parsed = fixtureSchema.safeParse(JSON.parse(renderDateTokens(raw)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
