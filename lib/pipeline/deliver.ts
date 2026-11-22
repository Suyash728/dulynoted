import 'server-only';
import type { RunResult, RunStatus, StreamEvent } from '../types';
import { env } from '../env';
import { getRunResult, insertDeliveries, insertReminders, setRunStatus, type DeliveryRow } from '../db';
import { planDeadlineReminders } from '../reminders';
import { buildChatMessages, calendarLinks, sendMessage } from '../telegram';
import { formatTime } from '../time';
import { Recorder } from './recorder';

/**
 * APPROVE → DELIVER. The caller must already hold the approval claim (db.claimForApproval).
 * Telegram problems never fail the run: DELIVER turns amber and the run stays approvable again.
 */

export interface ApproveOptions {
  dryRun: boolean;
}

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const classes = (n: number) => plural(n, 'class', 'classes');
const maskChat = (id: string) => `…${id.slice(-4)}`;

export async function* approveRun(runId: string, opts: ApproveOptions): AsyncGenerator<StreamEvent> {
  const run = await getRunResult(runId);
  if (!run?.extraction) {
    await setRunStatus(runId, 'failed');
    yield { type: 'error', error: 'This run has no extracted data to send.' };
    return;
  }

  const rec = new Recorder(runId, Math.max(0, ...run.steps.map((s) => s.seq)));
  let finalStatus: RunStatus = 'awaiting_approval';

  try {
    yield* rec.run('APPROVE', 'Staff clicked "Approve & send"', async () => ({
      status: 'ok',
      output: `Approved by staff at ${formatTime(new Date().toISOString())} IST`,
      value: null,
    }));

    finalStatus = yield* rec.run('DELIVER', `${classes(run.recipients.length)} · digest + Google Calendar links`, async () => {
      const e = env();
      const messages = buildChatMessages(run, e.TELEGRAM_DEMO_CHAT_ID);
      const labels = messages.flatMap((m) => m.labels);

      if (opts.dryRun) {
        return {
          status: 'skipped',
          output: `Dry run — would send ${plural(messages.length, 'message')} with Google Calendar links to ${classes(labels.length)}`,
          value: 'delivered' as RunStatus,
          detail: messages.map((m) => ({ chat: maskChat(m.chatId), labels: m.labels, html: m.html })),
        };
      }
      if (!e.TELEGRAM_BOT_TOKEN || messages.length === 0) {
        return { status: 'warn', output: 'Telegram not configured — use the Google Calendar buttons or .ics instead', value: 'awaiting_approval' as RunStatus };
      }

      const token = e.TELEGRAM_BOT_TOKEN;
      // One message per class group: digest + one-tap Google Calendar links (no file for students to import).
      const results = await Promise.all(messages.map(async (m) => ({ m, message: await sendMessage(token, m.chatId, m.html) })));

      const rows: DeliveryRow[] = results.flatMap(({ m, message }) =>
        m.labels.map((label) => ({
          run_id: runId,
          audience_label: label,
          channel: 'telegram' as const,
          status: message.ok ? ('sent' as const) : ('failed' as const),
          payload: { messageOk: message.ok, messageId: message.messageId ?? null, error: message.description ?? null },
        })),
      );
      await insertDeliveries(rows);

      const detail = results.map(({ m, message }) => ({ chat: maskChat(m.chatId), labels: m.labels, message: message.ok ? 'ok' : message.description }));
      const failed = results.find((r) => !r.message.ok);
      if (failed) {
        return {
          status: 'warn',
          output: `Telegram unavailable (${failed.message.description ?? 'unknown error'}) — use the Google Calendar buttons or .ics instead`,
          value: 'awaiting_approval' as RunStatus,
          detail,
        };
      }
      // Follow-up automation: a Telegram reminder 24 h before each deadline (sent by /api/cron/dispatch).
      const reminders = planDeadlineReminders(run);
      await insertReminders(reminders);
      const links = calendarLinks(run).length;
      return {
        status: 'ok',
        output: `Delivered to ${classes(labels.length)} · ${plural(messages.length, 'message')} · ${plural(links, 'Google Calendar link')}${reminders.length ? ` · ${plural(new Set(reminders.map((r) => r.due_at)).size, 'reminder')} scheduled` : ''}`,
        value: 'delivered' as RunStatus,
        detail,
      };
    });
  } catch {
    // The failing step is already in the log with a human message; the run stays approvable.
    finalStatus = 'awaiting_approval';
  }

  await rec.flush();
  try {
    await setRunStatus(runId, finalStatus);
  } catch (err) {
    console.error('[deliver] could not update status:', err instanceof Error ? err.message : 'unknown');
  }

  const fresh = await getRunResult(runId).catch(() => null);
  const result: RunResult = fresh ?? { ...run, status: finalStatus, steps: [...run.steps, ...rec.steps] };
  yield { type: 'result', run: result };
}
