/**
 * Builds the offline cache (LLM tier 3) from one live run of each sample.
 * Usage: npx tsx scripts/make-fixtures.ts <BASE_URL>
 * Dates become {{D+n}} tokens relative to today, so fixtures stay valid on any day;
 * deadline/start/end are dropped because NORMALIZE_DATES recomputes them from the wording.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { SAMPLE_IDS, tokenizeDates } from '../lib/samples';
import { extractionSchema } from '../lib/schemas';
import type { StreamEvent } from '../lib/types';

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const outDir = path.join(process.cwd(), 'seed', 'fixtures');

async function rawExtraction(sampleId: string) {
  const body = new FormData();
  body.set('inputType', 'text');
  body.set('sampleId', sampleId);
  const res = await fetch(`${base}/api/runs`, { method: 'POST', body });
  const events = (await res.text()).trim().split('\n').map((l) => JSON.parse(l) as StreamEvent);
  const step = events.find((e) => e.type === 'step' && e.step.step === 'EXTRACT' && e.step.status === 'ok');
  if (!step || step.type !== 'step') throw new Error(`${sampleId}: no successful EXTRACT step`);
  if (step.step.tier === 'cache') throw new Error(`${sampleId}: EXTRACT came from cache — need a live model`);
  return extractionSchema.parse(step.step.detail);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  for (const id of SAMPLE_IDS) {
    const x = await rawExtraction(id);
    const clean = {
      ...x,
      actions: x.actions.map((a) => ({ ...a, deadline: null })),
      events: x.events.map((e) => ({ ...e, start: null, end: null })),
    };
    const json = tokenizeDates(JSON.stringify({ extraction: clean }, null, 2));
    await writeFile(path.join(outDir, `${id}.json`), `${json}\n`);
    console.log(`wrote seed/fixtures/${id}.json (${x.actions.length} actions, ${x.events.length} events)`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
