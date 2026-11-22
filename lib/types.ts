export type ApiEnvelope<T> = { success: boolean; data: T | null; error: string | null };

export type InputType = 'text' | 'pdf' | 'image';
export type Tier = 'groq' | 'gemini' | 'cache' | 'none';
export type StepName =
  | 'INGEST' | 'EXTRACT' | 'REPAIR' | 'NORMALIZE_DATES' | 'ROUTE_AUDIENCE'
  | 'CLASH_CHECK' | 'COMPOSE' | 'APPROVE' | 'DELIVER' | 'SCHEDULE';
export type StepStatus = 'running' | 'ok' | 'warn' | 'error' | 'skipped';
export type RunStatus = 'running' | 'awaiting_approval' | 'delivered' | 'failed';

export interface RunStep {
  runId: string; seq: number; step: StepName; status: StepStatus;
  input: string;   // one-line human summary of what went in
  output: string;  // one-line human summary of what came out
  detail?: unknown; // raw JSON shown when the row is expanded
  tier?: Tier; model?: string; ms?: number; at: string; // ISO
}

export interface ActionItem {
  what: string; deadline: string | null; // ISO 8601 with +05:30
  deadlineText: string; location: string | null;
  requiredDocs: string[]; fee: string | null; needsReview: boolean;
}
export interface EventItem {
  title: string; start: string | null; end: string | null;
  dateText: string; venue: string | null; needsReview: boolean;
}
export interface Audience {
  all: boolean; years: ('FE' | 'SE' | 'TE' | 'BE')[];
  branches: string[]; divisions: string[];
}
export interface Extraction {
  title: string; issuer: string | null; issuedOn: string | null; // YYYY-MM-DD
  summary: string; audience: Audience;
  actions: ActionItem[]; events: EventItem[]; language: string;
}
export interface Recipient { audienceLabel: string; size: number; chatId: string | null }
export interface Clash { eventTitle: string; withTitle: string; audienceLabel: string; start: string }
export interface Digest { audienceLabels: string[]; text: string }
export interface TimeSaved { manualMin: number; autoSec: number; formula: string }

export interface RunResult {
  id: string; status: RunStatus; inputType: InputType; sourceName: string;
  extraction: Extraction | null; recipients: Recipient[]; clashes: Clash[];
  digests: Digest[]; timeSaved: TimeSaved | null; steps: RunStep[];
}

// POST /api/runs body = FormData: inputType, text?, file?, sampleId?
export type StreamEvent =
  | { type: 'step'; step: RunStep }
  | { type: 'result'; run: RunResult }
  | { type: 'error'; error: string };
