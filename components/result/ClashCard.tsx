import { AlertOctagon, ArrowLeftRight, CalendarClock, Lightbulb } from 'lucide-react';
import type { Clash, EventItem } from '@/lib/types';
import { formatDeadline, formatTime } from '@/lib/time';

interface Props {
  clashes: Clash[];
  events: EventItem[];
}

/** Side-by-side: what is already on the class timetable vs. what the circular adds. */
export function ClashCard({ clashes, events }: Props) {
  if (clashes.length === 0) return null;

  // One comparison per (timetable entry, event) pair; affected classes are listed together.
  const groups = new Map<string, { clash: Clash; labels: string[] }>();
  for (const c of clashes) {
    const key = `${c.withTitle}|${c.start}|${c.eventTitle}`;
    const g = groups.get(key) ?? { clash: c, labels: [] };
    g.labels.push(c.audienceLabel);
    groups.set(key, g);
  }

  return (
    <div role="alert" className="overflow-hidden rounded-xl border border-red-300 bg-red-50 text-sm text-red-950 shadow-sm">
      <p className="flex items-center gap-2 border-b border-red-200 bg-red-100/70 px-3 py-2 font-semibold">
        <AlertOctagon aria-hidden className="h-4 w-4" />
        Timetable clash{clashes.length > 1 ? 'es' : ''} detected · {clashes.length} class{clashes.length > 1 ? 'es' : ''} affected
      </p>
      <ul className="divide-y divide-red-200">
        {Array.from(groups.values()).map(({ clash, labels }) => {
          const ev = events.find((e) => e.title === clash.eventTitle && e.start);
          return (
            <li key={`${clash.withTitle}${clash.start}${clash.eventTitle}`} className="space-y-2 p-3">
              <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-lg border border-red-200 bg-white/70 p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-800">Already in timetable</p>
                  <p className="mt-0.5 font-semibold">{clash.withTitle}</p>
                  <p className="flex items-center gap-1 text-xs">
                    <CalendarClock aria-hidden className="h-3.5 w-3.5" />
                    {formatDeadline(clash.start)}
                  </p>
                </div>
                <ArrowLeftRight aria-hidden className="mx-auto h-4 w-4 self-center text-red-700" />
                <div className="rounded-lg border border-red-200 bg-white/70 p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-800">This circular</p>
                  <p className="mt-0.5 font-semibold">{clash.eventTitle}</p>
                  {ev?.start && (
                    <p className="flex items-center gap-1 text-xs">
                      <CalendarClock aria-hidden className="h-3.5 w-3.5" />
                      {formatDeadline(ev.start)}
                      {ev.end ? `–${formatTime(ev.end)}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs">
                <span className="font-semibold">Affected:</span> {labels.join(', ')}
              </p>
              <p className="inline-flex items-start gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs">
                <Lightbulb aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Suggested: excuse affected students from one session or move the event — the class message already warns them.
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
