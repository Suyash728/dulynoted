import { getRunResult, insertReminders } from '@/lib/db';
import { fail, ok } from '@/lib/api';
import { planDemoReminders } from '@/lib/reminders';
import { uuidSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST → schedules a reminder for every class of a delivered run, due in 60 s (live-demo button). */
export async function POST(_request: Request, { params }: { params: { id: string } }): Promise<Response> {
  if (!uuidSchema.safeParse(params.id).success) return fail('Invalid run id', 400);
  try {
    const run = await getRunResult(params.id);
    if (!run) return fail('Run not found', 404);
    const delivered = [...run.steps].reverse().find((s) => s.step === 'DELIVER');
    if (run.status !== 'delivered' || delivered?.status !== 'ok') {
      return fail('Reminders can only be scheduled after a real delivery to Telegram', 409);
    }
    const rows = planDemoReminders(run);
    await insertReminders(rows);
    return ok({ dueAt: rows[0]?.due_at ?? null, classes: rows.length });
  } catch (err) {
    console.error('[api/remind-demo]', err instanceof Error ? err.message : 'unknown');
    return fail('Could not schedule the reminder right now', 500);
  }
}
