import { bearerMatches } from '@/lib/auth';
import { fail, ok } from '@/lib/api';
import { claimDueReminders, insertStep, listAudiences, maxStepSeq, releaseReminders } from '@/lib/db';
import { env } from '@/lib/env';
import { groupReminders } from '@/lib/reminders';
import { sendMessage } from '@/lib/telegram';
import type { RunStep } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called every minute by Supabase pg_cron (pg_net) with `Authorization: Bearer CRON_SECRET`.
 * Sends due reminders and appends a SCHEDULE step to each run's log.
 */
async function dispatch(request: Request): Promise<Response> {
  const e = env();
  if (!bearerMatches(request.headers.get('authorization'), e.CRON_SECRET)) return fail('Unauthorized', 401);
  if (!e.TELEGRAM_BOT_TOKEN) return fail('Telegram is not configured', 503);
  const token = e.TELEGRAM_BOT_TOKEN;

  try {
    const due = await claimDueReminders();
    if (due.length === 0) return ok({ sent: 0, failed: 0 });

    const chats = new Map((await listAudiences()).map((a) => [a.label, a.telegram_chat_id ?? e.TELEGRAM_DEMO_CHAT_ID]));
    const batches = groupReminders(due, (label) => chats.get(label) ?? e.TELEGRAM_DEMO_CHAT_ID);
    const results = await Promise.all(batches.map(async (b) => ({ b, res: await sendMessage(token, b.chatId, b.html) })));

    await releaseReminders(results.filter((r) => !r.res.ok).flatMap((r) => r.b.ids));

    // One SCHEDULE step per run, appended after the run's last step.
    const byRun = new Map<string, typeof results>();
    results.forEach((r) => byRun.set(r.b.runId, [...(byRun.get(r.b.runId) ?? []), r]));
    for (const [runId, rs] of Array.from(byRun)) {
      const okLabels = rs.filter((r) => r.res.ok).flatMap((r) => r.b.labels);
      const failed = rs.filter((r) => !r.res.ok);
      const step: RunStep = {
        runId,
        seq: (await maxStepSeq(runId)) + 1,
        step: 'SCHEDULE',
        status: failed.length ? 'warn' : 'ok',
        input: 'pg_cron tick · due reminders',
        output: failed.length
          ? `Reminder failed (${failed[0].res.description ?? 'Telegram error'}) — will retry next minute`
          : `Reminder fired → ${okLabels.join(', ')}`,
        tier: undefined,
        at: new Date().toISOString(),
      };
      await insertStep(step);
    }

    const sent = results.filter((r) => r.res.ok).length;
    return ok({ sent, failed: results.length - sent });
  } catch (err) {
    console.error('[cron/dispatch]', err instanceof Error ? err.message : 'unknown');
    return fail('Dispatch failed', 500);
  }
}

export const GET = dispatch;
export const POST = dispatch;
