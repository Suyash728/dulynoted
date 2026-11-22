import 'server-only';
import type { Clash, Extraction, Recipient, RunResult, StreamEvent } from '../types';
import type { RepairInfo } from '../llm';
import { LlmUnavailableError } from '../llm';
import type { RunInput } from '../schemas';
import { createRun, finishRun, listAudiences, listCalendarEvents } from '../db';
import { Recorder, StepError } from './recorder';
import { loadFixture, loadSampleText, type Fixture } from '../seed';
import { cleanText, describeText } from './ingest';
import { describeAudience, extractCirculars, summarizeExtraction } from './extract';
import { normalizeExtraction } from './normalize';
import { matchAudiences } from './route';
import { eventWindow, findClashes } from './clash';
import { composeDigest } from './compose';
import { buildDigests, estimateTimeSaved } from './digest';
import { formatTime } from '../time';

/**
 * Sequential pipeline INGEST → EXTRACT (→ REPAIR) → NORMALIZE_DATES → ROUTE_AUDIENCE → CLASH_CHECK → COMPOSE.
 * Yields StreamEvents for the live run log and persists every finished step. Ends 'awaiting_approval'.
 */

export async function* runPipeline(input: RunInput, now: Date = new Date()): AsyncGenerator<StreamEvent> {
  const started = Date.now();
  const sample = input.sampleId ? await loadSampleText(input.sampleId) : null;
  const rawText = sample?.text ?? input.text ?? '';
  const sourceName = sample ? `Sample: ${sample.label}` : 'Pasted text';

  let runId: string;
  try {
    runId = await createRun({ inputType: 'text', sourceName, inputText: rawText });
  } catch {
    yield { type: 'error', error: 'Could not start the run — the database is unreachable. Please retry in a moment.' };
    return;
  }

  const rec = new Recorder(runId);
  const fixture: Promise<Fixture | null> = input.sampleId ? loadFixture(input.sampleId) : Promise.resolve(null);
  const result: RunResult = {
    id: runId,
    status: 'running',
    inputType: 'text',
    sourceName,
    extraction: null,
    recipients: [],
    clashes: [],
    digests: [],
    timeSaved: null,
    steps: [],
  };

  try {
    // 1 INGEST
    const text = yield* rec.run('INGEST', sourceName, async () => {
      const clean = cleanText(rawText);
      if (clean.length < 20) throw new StepError('This text is too short to be a circular — paste the full notice or load a sample.');
      return { status: 'ok', output: describeText(clean), value: clean, detail: { preview: clean.slice(0, 280) } };
    });

    // 2 EXTRACT (+ REPAIR when the first JSON fails validation)
    let repair: RepairInfo | null = null;
    const raw = yield* rec.run('EXTRACT', describeText(text), async () => {
      try {
        const res = await extractCirculars(text, {
          cache: async () => (await fixture)?.extraction ?? null,
          onRepair: (info) => (repair = info),
        });
        return { status: 'ok', output: summarizeExtraction(res.data), value: res.data, detail: res.data, tier: res.tier, model: res.model };
      } catch (err) {
        if (err instanceof LlmUnavailableError) {
          throw new StepError('AI extraction is unavailable right now (all providers failed). Retry, or load a sample which works offline.');
        }
        throw err;
      }
    });
    const r = repair as RepairInfo | null;
    if (r) {
      yield* rec.note('REPAIR', r.ok ? 'ok' : 'warn', 'Invalid JSON from model', r.ok ? 'Fixed in one repair call' : 'Repair failed — moved to next provider', {
        detail: { zodError: r.error },
        tier: r.tier,
        model: r.model,
        ms: r.ms,
      });
    }

    // 3 NORMALIZE_DATES
    const extraction: Extraction = yield* rec.run('NORMALIZE_DATES', `${raw.actions.length + raw.events.length} date phrases`, async () => {
      const n = normalizeExtraction(raw, now);
      const ok = n.resolved.filter((x) => x.iso).length;
      return {
        status: n.reviewCount > 0 ? 'warn' : 'ok',
        output: n.reviewCount > 0 ? `${ok} resolved · ${n.reviewCount} need${n.reviewCount === 1 ? 's' : ''} review` : `${ok} dates resolved to exact IST times`,
        value: n.extraction,
        detail: n.resolved,
      };
    });
    result.extraction = extraction;

    // 4 ROUTE_AUDIENCE
    const recipients: Recipient[] = yield* rec.run('ROUTE_AUDIENCE', describeAudience(extraction.audience), async () => {
      const rows = await listAudiences();
      const routed = matchAudiences(extraction.audience, rows);
      const students = routed.recipients.reduce((s, x) => s + x.size, 0);
      return {
        status: routed.fallback ? 'warn' : 'ok',
        output: `${routed.fallback ? 'No exact match — sending to all classes: ' : ''}${routed.recipients.length} classes · ${students} students`,
        value: routed.recipients,
        detail: routed.recipients.map((x) => x.audienceLabel),
      };
    });
    result.recipients = recipients;

    // 5 CLASH_CHECK
    const labels = recipients.map((x) => x.audienceLabel);
    const clashes: Clash[] = yield* rec.run('CLASH_CHECK', `${extraction.events.length} events × timetable`, async () => {
      const window = eventWindow(extraction.events);
      if (!window) return { status: 'skipped', output: 'No dated events to check', value: [] };
      const found = findClashes(extraction.events, await listCalendarEvents(labels, window.from, window.to), labels);
      if (found.length === 0) return { status: 'ok', output: 'No timetable clashes', value: found };
      const first = found[0];
      return {
        status: 'warn',
        output: `${found.length} clash${found.length === 1 ? '' : 'es'}: ${first.eventTitle} vs ${first.withTitle} (${first.audienceLabel}, ${formatTime(first.start)})`,
        value: found,
        detail: found,
      };
    });
    result.clashes = clashes;

    // 6 COMPOSE
    const base = yield* rec.run('COMPOSE', `${labels.length} class groups`, async () => {
      const c = await composeDigest(extraction, (await fixture) !== null, now);
      return {
        status: c.usedFallback ? 'warn' : 'ok',
        output: c.usedFallback ? `AI unavailable — template digest (${c.text.length} chars)` : `Digest ready (${c.text.length} chars)`,
        value: c.text,
        detail: { digest: c.text },
        tier: c.tier,
        model: c.model,
      };
    });
    result.digests = buildDigests(base, recipients, clashes);
    result.timeSaved = estimateTimeSaved(extraction, recipients.length, Date.now() - started);
    result.status = 'awaiting_approval';
  } catch (err) {
    result.status = 'failed';
    yield { type: 'error', error: err instanceof StepError ? err.message : 'The run failed unexpectedly. Please retry.' };
  }

  await rec.flush();
  result.steps = rec.steps;
  try {
    await finishRun(runId, result.status, result, Date.now() - started);
  } catch (err) {
    console.error('[run] finishRun failed:', err instanceof Error ? err.message : 'unknown');
  }
  yield { type: 'result', run: result };
}
