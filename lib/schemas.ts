import { z } from 'zod';
import type { ActionItem, Audience, EventItem, Extraction } from './types';
import { SAMPLE_IDS } from './samples';

export const MAX_TEXT_CHARS = 20_000;

const YEARS = ['FE', 'SE', 'TE', 'BE'] as const;

/** Models write "T.E.", "te", "Third Year"… — normalise before the enum check. */
const yearSchema = z.preprocess((v) => {
  if (typeof v !== 'string') return v;
  const s = v.toUpperCase().replace(/[^A-Z]/g, '');
  const words: Record<string, (typeof YEARS)[number]> = { FIRST: 'FE', SECOND: 'SE', THIRD: 'TE', FINAL: 'BE', FOURTH: 'BE' };
  return words[s.replace(/YEAR$/, '')] ?? s;
}, z.enum(YEARS));

const str = z.string().trim();
const nullableStr = z.string().trim().nullish().transform((v) => (v ? v : null));

export const audienceSchema = z.object({
  all: z.boolean().default(false),
  years: z.array(yearSchema).default([]),
  branches: z.array(str).default([]),
  divisions: z.array(str).default([]),
}) satisfies z.ZodType<Audience, unknown>;

export const actionSchema = z.object({
  what: str.min(1),
  deadline: nullableStr,
  deadlineText: str.default(''),
  location: nullableStr,
  requiredDocs: z.array(str).default([]),
  fee: nullableStr,
  needsReview: z.boolean().default(false),
}) satisfies z.ZodType<ActionItem, unknown>;

export const eventSchema = z.object({
  title: str.min(1),
  start: nullableStr,
  end: nullableStr,
  dateText: str.default(''),
  venue: nullableStr,
  needsReview: z.boolean().default(false),
}) satisfies z.ZodType<EventItem, unknown>;

export const extractionSchema = z.object({
  title: str.min(1),
  issuer: nullableStr,
  issuedOn: nullableStr,
  summary: str.default(''),
  audience: audienceSchema,
  actions: z.array(actionSchema).default([]),
  events: z.array(eventSchema).default([]),
  language: str.default('en'),
}) satisfies z.ZodType<Extraction, unknown>;

export const digestSchema = z.object({ digest: str.min(1) });

/** POST /api/runs FormData. For pdf/image the file itself is validated in the route (lib/file-input.ts). */
export const runInputSchema = z
  .object({
    inputType: z.enum(['text', 'pdf', 'image']),
    text: z.string().max(MAX_TEXT_CHARS, `Text is longer than ${MAX_TEXT_CHARS} characters`).optional(),
    sampleId: z.enum(SAMPLE_IDS).optional(),
  })
  .refine((v) => v.inputType !== 'text' || Boolean(v.sampleId) || Boolean(v.text?.trim()), {
    message: 'Paste a circular or load a sample first',
  });

export type RunInput = z.infer<typeof runInputSchema>;

export const uuidSchema = z.string().uuid();
