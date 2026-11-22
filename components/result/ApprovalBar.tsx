'use client';

import { useEffect, useRef, useState } from 'react';
import { AlarmClock, AlertTriangle, CalendarPlus, CheckCircle2, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ApiEnvelope, RunResult } from '@/lib/types';
import { formatTime } from '@/lib/time';

interface Props {
  run: RunResult;
  approving: boolean;
  onApprove: () => void;
  onRefresh: () => Promise<RunResult | null> | null;
}

const POLL_MS = 5_000;
const POLL_LIMIT_MS = 3 * 60_000;

/** The single human gate (approve → Telegram + calendar), plus the live "demo reminder" button. */
export function ApprovalBar({ run, approving, onApprove, onRefresh }: Props) {
  const deliver = [...run.steps].reverse().find((s) => s.step === 'DELIVER');
  const delivered = run.status === 'delivered';
  const realDelivery = delivered && deliver?.status === 'ok';
  const canApprove = run.status === 'awaiting_approval' && !approving;
  const classes = run.recipients.length;

  const [reminder, setReminder] = useState<{ dueAt: string; since: number } | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const fired = reminder ? run.steps.some((s) => s.step === 'SCHEDULE' && new Date(s.at).getTime() >= reminder.since) : false;
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  // Announce a fresh delivery (not when re-opening an already-delivered run from history).
  const wasApproving = useRef(false);
  useEffect(() => {
    if (approving) wasApproving.current = true;
    else if (wasApproving.current && deliver) {
      wasApproving.current = false;
      if (delivered) toast.success(deliver.status === 'skipped' ? 'Dry run complete' : `Sent to ${classes} classes`, { description: deliver.output });
      else if (deliver.status === 'warn') toast.warning('Telegram unavailable', { description: 'The .ics file is ready to download. You can retry sending.' });
    }
  }, [approving, delivered, deliver, classes]);

  // Poll only while a demo reminder is pending; stops on arrival or after 3 minutes.
  useEffect(() => {
    if (!reminder || fired) return;
    const timer = setInterval(() => {
      if (Date.now() - reminder.since > POLL_LIMIT_MS) return clearInterval(timer);
      void refreshRef.current();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [reminder, fired]);

  const scheduleDemo = async () => {
    setReminderError(null);
    const since = Date.now();
    try {
      const res = await fetch(`/api/runs/${run.id}/remind-demo`, { method: 'POST' });
      const env = (await res.json()) as ApiEnvelope<{ dueAt: string }>;
      if (!env.success || !env.data) throw new Error(env.error ?? 'Could not schedule');
      setReminder({ dueAt: env.data.dueAt, since });
    } catch (err) {
      setReminderError(err instanceof Error ? err.message : 'Could not schedule the reminder');
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      {delivered && deliver && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-sm text-emerald-900">
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {deliver.output} · {formatTime(deliver.at)}
          </span>
        </p>
      )}
      {!delivered && deliver?.status === 'warn' && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-sm text-amber-900">
          <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{deliver.output}. You can retry sending.</span>
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={onApprove} disabled={!canApprove} className="btn-gradient h-11 flex-1 rounded-xl font-semibold shadow-md" aria-describedby="approve-note">
          {approving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
          {approving ? 'Sending…' : delivered ? `Sent to ${classes} classes` : `Approve & send to ${classes} classes`}
        </Button>
        <Button asChild variant="outline" className="h-11 rounded-xl">
          <a href={`/api/runs/${run.id}/ics`} download aria-label="Download calendar file for Apple Calendar or Outlook (.ics)">
            <CalendarPlus aria-hidden className="h-4 w-4" />
            Apple / Outlook (.ics)
          </a>
        </Button>
      </div>

      {realDelivery && (
        <div className="space-y-1">
          <Button type="button" variant="secondary" className="h-10 w-full rounded-xl" onClick={() => void scheduleDemo()} disabled={Boolean(reminder && !fired)}>
            {reminder && !fired ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <AlarmClock aria-hidden className="h-4 w-4" />}
            {reminder && !fired ? 'Reminder scheduled…' : 'Send a demo reminder in 60 s'}
          </Button>
          <p role="status" aria-live="polite" className="text-center text-xs text-muted-foreground">
            {reminderError ??
              (fired
                ? 'Reminder fired — see the SCHEDULE step in the run log.'
                : reminder
                  ? `Due at ${formatTime(reminder.dueAt)} — the scheduler (pg_cron, every minute) will send it.`
                  : 'Deadline reminders are already scheduled for 24 h before each due date.')}
          </p>
        </div>
      )}

      <p id="approve-note" className="text-center text-[11px] text-muted-foreground">
        Nothing is sent without a staff approval. Students get one-tap “Add to Google Calendar” links in the message, and the group is reminded 24 h before each deadline.
      </p>
    </div>
  );
}
