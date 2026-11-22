import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { InputType, RunResult, RunStatus, RunStep } from './types';
import { env } from './env';

/** Server-only Supabase access with the service-role key. RLS has no policies, so the browser can never read tables. */

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  const e = env();
  client ??= createClient(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export interface AudienceRow {
  label: string;
  year: string;
  branch: string;
  division: string;
  size: number;
  telegram_chat_id: string | null;
}

export interface CalendarRow {
  title: string;
  starts_at: string;
  ends_at: string | null;
  audience_label: string;
}

interface StepRow {
  run_id: string;
  seq: number;
  step: RunStep['step'];
  status: RunStep['status'];
  input: string;
  output: string;
  detail: unknown;
  tier: RunStep['tier'] | null;
  model: string | null;
  ms: number | null;
  at: string;
}

function fail(action: string, message: string): never {
  throw new Error(`Database error while ${action}: ${message}`);
}

export async function createRun(input: { inputType: InputType; sourceName: string; inputText: string }): Promise<string> {
  const { data, error } = await db()
    .from('runs')
    .insert({ input_type: input.inputType, source_name: input.sourceName, input_text: input.inputText })
    .select('id')
    .single<{ id: string }>();
  if (error || !data) fail('creating the run', error?.message ?? 'no row returned');
  return data.id;
}

export async function insertStep(step: RunStep): Promise<void> {
  const row: StepRow = {
    run_id: step.runId,
    seq: step.seq,
    step: step.step,
    status: step.status,
    input: step.input,
    output: step.output,
    detail: step.detail ?? null,
    tier: step.tier ?? null,
    model: step.model ?? null,
    ms: step.ms ?? null,
    at: step.at,
  };
  const { error } = await db().from('run_steps').insert(row);
  if (error) fail('saving a step', error.message);
}

/** Stores the result without steps (run_steps is the source of truth for those). */
export async function finishRun(id: string, status: RunStatus, result: RunResult | null, durationMs: number): Promise<void> {
  const stored = result ? { ...result, steps: [] } : null;
  const { error } = await db().from('runs').update({ status, result: stored, duration_ms: durationMs }).eq('id', id);
  if (error) fail('finishing the run', error.message);
}

export async function getRunResult(id: string): Promise<RunResult | null> {
  const [runRes, stepsRes] = await Promise.all([
    db().from('runs').select('id, status, input_type, source_name, result').eq('id', id).maybeSingle(),
    db().from('run_steps').select('*').eq('run_id', id).order('seq', { ascending: true }),
  ]);
  if (runRes.error) fail('loading the run', runRes.error.message);
  if (stepsRes.error) fail('loading run steps', stepsRes.error.message);
  if (!runRes.data) return null;

  const steps: RunStep[] = (stepsRes.data as StepRow[]).map((r) => ({
    runId: r.run_id,
    seq: r.seq,
    step: r.step,
    status: r.status,
    input: r.input ?? '',
    output: r.output ?? '',
    detail: r.detail ?? undefined,
    tier: r.tier ?? undefined,
    model: r.model ?? undefined,
    ms: r.ms ?? undefined,
    at: r.at,
  }));
  const stored = runRes.data.result as RunResult | null;
  return {
    id: runRes.data.id,
    status: runRes.data.status as RunStatus,
    inputType: runRes.data.input_type as InputType,
    sourceName: runRes.data.source_name ?? '',
    extraction: stored?.extraction ?? null,
    recipients: stored?.recipients ?? [],
    clashes: stored?.clashes ?? [],
    digests: stored?.digests ?? [],
    timeSaved: stored?.timeSaved ?? null,
    steps,
  };
}

export async function listAudiences(): Promise<AudienceRow[]> {
  const { data, error } = await db()
    .from('audiences')
    .select('label, year, branch, division, size, telegram_chat_id')
    .order('label');
  if (error) fail('loading classes', error.message);
  return data as AudienceRow[];
}

export async function listCalendarEvents(labels: string[], fromIso: string, toIso: string): Promise<CalendarRow[]> {
  if (labels.length === 0) return [];
  const { data, error } = await db()
    .from('calendar_events')
    .select('title, starts_at, ends_at, audience_label')
    .in('audience_label', labels)
    .gte('starts_at', fromIso)
    .lte('starts_at', toIso);
  if (error) fail('loading the timetable', error.message);
  return data as CalendarRow[];
}

/**
 * Atomically moves a run from 'awaiting_approval' to 'running'. Returns false when the run
 * is missing or already approved, so a double click can never send twice.
 */
export async function claimForApproval(id: string): Promise<boolean> {
  const { data, error } = await db()
    .from('runs')
    .update({ status: 'running' })
    .eq('id', id)
    .eq('status', 'awaiting_approval')
    .select('id');
  if (error) fail('claiming the run for approval', error.message);
  return (data ?? []).length === 1;
}

export async function getRunStatus(id: string): Promise<RunStatus | null> {
  const { data, error } = await db().from('runs').select('status').eq('id', id).maybeSingle<{ status: RunStatus }>();
  if (error) fail('loading the run status', error.message);
  return data?.status ?? null;
}

export async function setRunStatus(id: string, status: RunStatus): Promise<void> {
  const { error } = await db().from('runs').update({ status }).eq('id', id);
  if (error) fail('updating the run status', error.message);
}

export async function maxStepSeq(id: string): Promise<number> {
  const { data, error } = await db()
    .from('run_steps')
    .select('seq')
    .eq('run_id', id)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle<{ seq: number }>();
  if (error) fail('loading run steps', error.message);
  return data?.seq ?? 0;
}

export interface DeliveryRow {
  run_id: string;
  audience_label: string;
  channel: 'telegram';
  status: 'sent' | 'failed' | 'skipped';
  payload: Record<string, unknown>;
}

/** One batch insert for all deliveries of a run. */
export async function insertDeliveries(rows: DeliveryRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db().from('deliveries').insert(rows);
  if (error) fail('saving deliveries', error.message);
}

export interface ReminderInsert {
  run_id: string;
  audience_label: string;
  message: string;
  due_at: string;
}

export async function insertReminders(rows: ReminderInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await db().from('reminders').insert(rows);
  if (error) fail('scheduling reminders', error.message);
}

export interface ClaimedReminder {
  id: number;
  run_id: string;
  audience_label: string;
  message: string;
}

/**
 * Claims due, unsent reminders by stamping sent_at with a conditional update, so two
 * overlapping cron ticks can never send the same reminder twice.
 */
export async function claimDueReminders(limit = 50): Promise<ClaimedReminder[]> {
  const nowIso = new Date().toISOString();
  const due = await db().from('reminders').select('id').is('sent_at', null).lte('due_at', nowIso).order('due_at').limit(limit);
  if (due.error) fail('loading due reminders', due.error.message);
  const ids = (due.data as { id: number }[]).map((r) => r.id);
  if (ids.length === 0) return [];
  const claimed = await db()
    .from('reminders')
    .update({ sent_at: nowIso })
    .in('id', ids)
    .is('sent_at', null)
    .select('id, run_id, audience_label, message');
  if (claimed.error) fail('claiming reminders', claimed.error.message);
  return claimed.data as ClaimedReminder[];
}

/** Un-claims reminders whose send failed so the next tick retries them. */
export async function releaseReminders(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await db().from('reminders').update({ sent_at: null }).in('id', ids);
  if (error) fail('releasing reminders', error.message);
}

export async function countPendingReminders(runId: string): Promise<number> {
  const { count, error } = await db().from('reminders').select('id', { count: 'exact', head: true }).eq('run_id', runId).is('sent_at', null);
  if (error) fail('counting reminders', error.message);
  return count ?? 0;
}

export interface RunSummary {
  id: string;
  createdAt: string;
  sourceName: string;
  inputType: InputType;
  status: RunStatus;
  classes: number;
  students: number;
  manualMin: number | null;
  autoSec: number | null;
}

/** Latest runs for the history page; reads only summary fields out of the stored result. */
export async function listRecentRuns(limit = 50): Promise<RunSummary[]> {
  const { data, error } = await db()
    .from('runs')
    .select('id, created_at, source_name, input_type, status, result->recipients, result->timeSaved')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) fail('loading history', error.message);
  type Row = {
    id: string; created_at: string; source_name: string | null; input_type: InputType; status: RunStatus;
    recipients: { size: number }[] | null; timeSaved: { manualMin: number; autoSec: number } | null;
  };
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    sourceName: r.source_name ?? '—',
    inputType: r.input_type,
    status: r.status,
    classes: r.recipients?.length ?? 0,
    students: (r.recipients ?? []).reduce((s, x) => s + (x.size ?? 0), 0),
    manualMin: r.timeSaved?.manualMin ?? null,
    autoSec: r.timeSaved?.autoSec ?? null,
  }));
}
