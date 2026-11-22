import 'server-only';
import type { RunResult, RunStatus, StreamEvent } from '../types';
import { env } from '../env';
import { getRunResult, insertDeliveries, setRunStatus, type DeliveryRow } from '../db';
import { buildIcs } from '../ics';
import { buildChatMessages, sendDocument, sendMessage } from '../telegram';
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

    finalStatus = yield* rec.run('DELIVER', `${classes(run.recipients.length)} · digest + calendar file`, async () => {
      const e = env();
      const messages = buildChatMessages(run, e.TELEGRAM_DEMO_CHAT_ID);
      const labels = messages.flatMap((m) => m.labels);

      if (opts.dryRun) {
        return {
          status: 'skipped',
          output: `Dry run — would send ${plural(messages.length, 'message')} + calendar file to ${classes(labels.length)}`,
          value: 'delivered' as RunStatus,
          detail: messages.map((m) => ({ chat: maskChat(m.chatId), labels: m.labels, html: m.html })),
        };
      }
      if (!e.TELEGRAM_BOT_TOKEN || messages.length === 0) {
        return { status: 'warn', output: 'Telegram unavailable — .ics ready to download', value: 'awaiting_approval' as RunStatus };
      }

      const token = e.TELEGRAM_BOT_TOKEN;
      const ics = buildIcs(run);
      const results = await Promise.all(
        messages.map(async (m) => {
          const message = await sendMessage(token, m.chatId, m.html);
          const document = message.ok
            ? await sendDocument(token, m.chatId, ics, `${plural(ics.eventCount, 'date')} with reminders — tap to add to your calendar`)
            : { ok: false, description: 'skipped after message failed' };
          return { m, message, document };
        }),
      );

      const rows: DeliveryRow[] = results.flatMap(({ m, message, document }) =>
        m.labels.map((label) => ({
          run_id: runId,
          audience_label: label,
          channel: 'telegram' as const,
          status: message.ok && document.ok ? ('sent' as const) : ('failed' as const),
          payload: { messageOk: message.ok, documentOk: document.ok, messageId: message.messageId ?? null, error: message.description ?? document.description ?? null },
        })),
      );
      await insertDeliveries(rows);

      const detail = results.map(({ m, message, document }) => ({
        chat: maskChat(m.chatId),
        labels: m.labels,
        message: message.ok ? 'ok' : message.description,
        calendar: document.ok ? 'ok' : document.description,
      }));
      const failed = results.filter((r) => !r.message.ok || !r.document.ok);
      if (failed.length > 0) {
        const reason = failed[0].message.description ?? failed[0].document.description ?? 'unknown error';
        return { status: 'warn', output: `Telegram unavailable (${reason}) — .ics ready to download`, value: 'awaiting_approval' as RunStatus, detail };
      }
      return {
        status: 'ok',
        output: `Delivered to ${classes(labels.length)} · ${plural(messages.length, 'message')} · ${plural(messages.length, 'calendar file')}`,
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
