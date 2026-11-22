import { Clock, IndianRupee, MapPin } from 'lucide-react';
import type { ActionItem } from '@/lib/types';
import { formatDeadline } from '@/lib/time';
import { ReviewChip } from './ReviewChip';

export function ActionCard({ action }: { action: ActionItem }) {
  return (
    <li className="rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <p className="font-semibold">{action.what}</p>
      <dl className="mt-1.5 space-y-1 text-sm">
        {(action.deadline || action.deadlineText) && (
          <div className="flex items-start gap-2">
            <dt>
              <Clock aria-hidden className="mt-0.5 h-4 w-4 text-primary" />
              <span className="sr-only">Deadline</span>
            </dt>
            <dd className="flex flex-wrap items-center gap-2">
              {action.deadline ? <span className="font-medium">{formatDeadline(action.deadline)}</span> : <span>{action.deadlineText}</span>}
              {action.needsReview && <ReviewChip />}
            </dd>
          </div>
        )}
        {action.location && (
          <div className="flex items-start gap-2">
            <dt>
              <MapPin aria-hidden className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Where</span>
            </dt>
            <dd>{action.location}</dd>
          </div>
        )}
        {action.fee && (
          <div className="flex items-start gap-2">
            <dt>
              <IndianRupee aria-hidden className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Fee</span>
            </dt>
            <dd>{action.fee}</dd>
          </div>
        )}
      </dl>
      {action.requiredDocs.length > 0 && (
        <fieldset className="mt-2">
          <legend className="text-xs font-semibold text-muted-foreground">Checklist</legend>
          <ul className="mt-1 space-y-1 text-sm">
            {action.requiredDocs.map((doc, i) => (
              <li key={i}>
                <label className="flex items-start gap-2">
                  <input type="checkbox" className="peer mt-1 h-4 w-4 accent-[hsl(var(--primary))]" />
                  <span className="transition-colors peer-checked:text-muted-foreground peer-checked:line-through">{doc}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </li>
  );
}
