import { CalendarPlus } from 'lucide-react';

/** Opens Google Calendar's prefilled "add event" page in a new tab. */
export function GoogleCalendarLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
    >
      <CalendarPlus aria-hidden className="h-3.5 w-3.5" />
      Add to Google Calendar
      <span className="sr-only">: {label} (opens in a new tab)</span>
    </a>
  );
}
