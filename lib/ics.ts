import { createEvents, type EventAttributes } from 'ics';
import type { RunResult } from './types';

/**
 * Builds the calendar file students tap to import every deadline and event with reminders.
 * The `ics` package has no TZID support, so times are written in UTC — phone calendars show them in local time.
 */

export interface IcsFile {
  filename: string;
  body: string;
  eventCount: number;
}

const ms = (iso: string) => new Date(iso).getTime();

export function icsFilename(runId: string): string {
  return `dulynoted-${runId.replace(/[^a-z0-9]/gi, '').slice(0, 8)}.ics`;
}

export function buildIcsEvents(run: RunResult): EventAttributes[] {
  const x = run.extraction;
  if (!x) return [];
  const base = { startInputType: 'utc', startOutputType: 'utc', endInputType: 'utc', endOutputType: 'utc', productId: 'dulynoted' } as const;
  const events: EventAttributes[] = [];

  x.actions.forEach((a, i) => {
    if (!a.deadline) return;
    const notes = [
      a.location ? `Where: ${a.location}` : '',
      a.requiredDocs.length ? `Bring: ${a.requiredDocs.join(', ')}` : '',
      a.fee ? `Fee: ${a.fee}` : '',
      `From: ${x.title}`,
    ].filter(Boolean);
    events.push({
      ...base,
      uid: `${run.id}-a${i}@dulynoted`,
      title: `Due: ${a.what}`,
      start: ms(a.deadline),
      duration: { minutes: 15 },
      description: notes.join('\n'),
      location: a.location ?? undefined,
      alarms: [
        { action: 'display', description: `Due tomorrow: ${a.what}`, trigger: { days: 1, before: true } },
        { action: 'display', description: `Due in 2 hours: ${a.what}`, trigger: { hours: 2, before: true } },
      ],
    });
  });

  x.events.forEach((e, i) => {
    if (!e.start) return;
    const start = ms(e.start);
    const end = e.end && ms(e.end) > start ? ms(e.end) : start + 3_600_000;
    events.push({
      ...base,
      uid: `${run.id}-e${i}@dulynoted`,
      title: e.title,
      start,
      end,
      description: `From: ${x.title}`,
      location: e.venue ?? undefined,
      alarms: [{ action: 'display', description: `Starts in 1 hour: ${e.title}`, trigger: { hours: 1, before: true } }],
    });
  });

  return events;
}

export function buildIcs(run: RunResult): IcsFile {
  const events = buildIcsEvents(run);
  const filename = icsFilename(run.id);
  if (events.length === 0) {
    // A valid, empty calendar is friendlier than a 500 for notices without dates.
    return { filename, eventCount: 0, body: 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:dulynoted\r\nEND:VCALENDAR\r\n' };
  }
  const { error, value } = createEvents(events, { productId: 'dulynoted', calName: 'DulyNoted' });
  if (error || !value) throw new Error(`Could not build calendar file: ${error?.message ?? 'empty output'}`);
  return { filename, eventCount: events.length, body: value };
}
