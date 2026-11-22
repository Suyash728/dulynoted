import type { RunResult } from './types';
import { escapeHtml } from './telegram';
import { formatDeadline } from './time';

/** Pure reminder planning + grouping. Persistence lives in lib/db.ts, sending in the cron route. */

export const REMINDER_LEAD_MS = 24 * 3_600_000;
export const DEMO_DELAY_MS = 60_000;

export interface ReminderDraft {
  run_id: string;
  audience_label: string;
  message: string;
  due_at: string; // ISO
}

/** One reminder per class per dated action, 24 h before the deadline; past times are skipped. */
export function planDeadlineReminders(run: RunResult, now: Date = new Date()): ReminderDraft[] {
  const actions = run.extraction?.actions ?? [];
  return actions.flatMap((a) => {
    if (!a.deadline) return [];
    const due = new Date(a.deadline).getTime() - REMINDER_LEAD_MS;
    if (due <= now.getTime()) return [];
    const message = `${a.what} — due ${formatDeadline(a.deadline, new Date(due))}`;
    return run.recipients.map((r) => ({ run_id: run.id, audience_label: r.audienceLabel, message, due_at: new Date(due).toISOString() }));
  });
}

/** The live-demo reminder: the soonest deadline (or the title), due in 60 s for every class. */
export function planDemoReminders(run: RunResult, now: Date = new Date()): ReminderDraft[] {
  const next = (run.extraction?.actions ?? [])
    .filter((a) => a.deadline)
    .sort((a, b) => new Date(a.deadline as string).getTime() - new Date(b.deadline as string).getTime())[0];
  const message = next?.deadline ? `${next.what} — due ${formatDeadline(next.deadline, now)}` : (run.extraction?.title ?? 'New circular');
  const due = new Date(now.getTime() + DEMO_DELAY_MS).toISOString();
  return run.recipients.map((r) => ({ run_id: run.id, audience_label: r.audienceLabel, message, due_at: due }));
}

export interface DueReminder {
  id: number;
  run_id: string;
  audience_label: string;
  message: string;
}

export interface ReminderBatch {
  runId: string;
  chatId: string;
  ids: number[];
  labels: string[];
  html: string;
}

/** Groups claimed reminders into one Telegram message per run + chat. */
export function groupReminders(due: DueReminder[], chatFor: (label: string) => string | undefined): ReminderBatch[] {
  const batches = new Map<string, Omit<ReminderBatch, 'html'> & { messages: Set<string> }>();
  for (const r of due) {
    const chatId = chatFor(r.audience_label);
    if (!chatId) continue;
    const key = `${r.run_id}|${chatId}`;
    const b = batches.get(key) ?? { runId: r.run_id, chatId, ids: [], labels: [], messages: new Set<string>() };
    b.ids.push(r.id);
    if (!b.labels.includes(r.audience_label)) b.labels.push(r.audience_label);
    b.messages.add(r.message);
    batches.set(key, b);
  }
  return Array.from(batches.values(), ({ messages, ...b }) => ({
    ...b,
    html: [`⏰ <b>DulyNoted reminder</b>`, `<i>For: ${escapeHtml(b.labels.join(', '))}</i>`, '', ...Array.from(messages, (m) => `• ${escapeHtml(m)}`)].join('\n'),
  }));
}
