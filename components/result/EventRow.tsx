import { CalendarDays } from 'lucide-react';
import type { EventItem } from '@/lib/types';
import { formatDeadline, formatTime } from '@/lib/time';
import { ReviewChip } from './ReviewChip';

export function EventRow({ event }: { event: EventItem }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <CalendarDays aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>
        <span className="font-medium">{event.title}</span>
        {' — '}
        {event.start ? `${formatDeadline(event.start)}${event.end ? `–${formatTime(event.end)}` : ''}` : event.dateText || 'date not given'}
        {event.venue ? `, ${event.venue}` : ''} {event.needsReview && <ReviewChip />}
      </span>
    </li>
  );
}
