import 'server-only';
import type { Extraction } from '../types';
import { chat, type ChatResult, type RepairInfo } from '../llm';
import { extractionSchema } from '../schemas';
import { EXTRACTION_JSON_SCHEMA } from '../extraction-json-schema';

/** EXTRACT — the one LLM call that turns a messy circular into structured data. */

export const EXTRACT_SYSTEM_PROMPT = `You extract structured data from Indian college circulars and notices.
Reply with ONE JSON object, no prose, exactly this shape:
{
  "title": string,                       // short title of the notice
  "issuer": string | null,               // office / person who issued it
  "issuedOn": "YYYY-MM-DD" | null,       // date printed on the notice
  "summary": string,                     // one sentence, plain English
  "audience": { "all": boolean, "years": ("FE"|"SE"|"TE"|"BE")[], "branches": string[], "divisions": string[] },
  "actions": [ { "what": string, "deadline": null, "deadlineText": string, "location": string | null,
                 "requiredDocs": string[], "fee": string | null, "needsReview": boolean } ],
  "events":  [ { "title": string, "start": null, "end": null, "dateText": string, "venue": string | null, "needsReview": boolean } ],
  "language": string                     // ISO code of the notice language, e.g. "en"
}
Rules:
- NEVER invent dates. Copy the original date wording verbatim into deadlineText / dateText (include the time if given). Leave "deadline", "start", "end" as null.
- If an action has no date of its own, use deadlineText "" and needsReview false. If an event has no date, use dateText "" and needsReview true. Set needsReview true only when the wording is ambiguous.
- An action is something a student must DO (fill, submit, register, bring, pay). An event is something that HAPPENS at a time (workshop, exam, lecture).
- A late-fee window is its own action ("Fill exam form with late fee").
- For an event spanning several days, output one event per day, each with that day's date and the time range.
- Audience years use FE/SE/TE/BE (first/second/third/final year). "All students" → all: true. Keep branch names as written (e.g. "AI&DS", "Comp", "IT"). Divisions as letters ("A", "B"). Include optional attendees too.
- requiredDocs: one short item per document. fee: amount with currency as written, else null.`;

export function extractCirculars(
  text: string,
  opts: { cache?: () => Promise<Extraction | null>; onRepair?: (info: RepairInfo) => void },
): Promise<ChatResult<Extraction>> {
  return chat({
    task: 'extract',
    schema: extractionSchema,
    jsonSchema: { name: 'circular_extraction', schema: EXTRACTION_JSON_SCHEMA },
    messages: [
      { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
      { role: 'user', content: `Circular:\n"""\n${text}\n"""` },
    ],
    cache: opts.cache,
    onRepair: opts.onRepair,
  });
}

export function describeAudience(a: Extraction['audience']): string {
  if (a.all) return 'all students';
  const parts = [a.years.join('/'), a.branches.join('/'), a.divisions.length ? `Div ${a.divisions.join('/')}` : ''];
  return parts.filter(Boolean).join(' ') || 'audience unclear';
}

export function summarizeExtraction(x: Extraction): string {
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return `${n(x.actions.length, 'action')} · ${n(x.events.length, 'event')} · ${describeAudience(x.audience)}`;
}
