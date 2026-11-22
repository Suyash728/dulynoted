import { AlertTriangle, CalendarPlus, CheckCircle2, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RunResult } from '@/lib/types';
import { formatTime } from '@/lib/time';

interface Props {
  run: RunResult;
  approving: boolean;
  onApprove: () => void;
}

/** The single human gate: approve → Telegram + calendar file. Download works before approval too. */
export function ApprovalBar({ run, approving, onApprove }: Props) {
  const deliver = [...run.steps].reverse().find((s) => s.step === 'DELIVER');
  const delivered = run.status === 'delivered';
  const canApprove = run.status === 'awaiting_approval' && !approving;
  const classes = run.recipients.length;

  return (
    <div className="space-y-2 border-t pt-3">
      {delivered && deliver && (
        <p role="status" className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 text-sm text-emerald-900">
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {deliver.status === 'skipped' ? deliver.output : `${deliver.output} · 1 calendar file`} · {formatTime(deliver.at)}
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
        <Button type="button" onClick={onApprove} disabled={!canApprove} className="flex-1" aria-describedby="approve-note">
          {approving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Send aria-hidden className="h-4 w-4" />}
          {approving ? 'Sending…' : delivered ? `Sent to ${classes} classes` : `Approve & send to ${classes} classes`}
        </Button>
        <Button asChild variant="outline">
          <a href={`/api/runs/${run.id}/ics`} download>
            <CalendarPlus aria-hidden className="h-4 w-4" />
            Download .ics
          </a>
        </Button>
      </div>
      <p id="approve-note" className="text-center text-[11px] text-muted-foreground">
        Nothing is sent without a staff approval. Students tap the calendar file to get reminders 1 day and 2 hours before each deadline.
      </p>
    </div>
  );
}
