import type { Clash, EventItem } from '../types';

/** CLASH_CHECK — deterministic interval overlap between new events and the class timetable. */

export interface TimetableEntry {
  title: string;
  starts_at: string;
  ends_at: string | null;
  audience_label: string;
}

const HOUR_MS = 3_600_000;

function interval(start: string, end: string | null): [number, number] {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : s + HOUR_MS;
  return [s, e > s ? e : s + HOUR_MS];
}

export function findClashes(events: EventItem[], timetable: TimetableEntry[], labels: string[]): Clash[] {
  const affected = new Set(labels);
  const clashes: Clash[] = [];
  for (const ev of events) {
    if (!ev.start) continue;
    const [es, ee] = interval(ev.start, ev.end);
    for (const t of timetable) {
      if (!affected.has(t.audience_label)) continue;
      const [ts, te] = interval(t.starts_at, t.ends_at);
      if (es < te && ts < ee) {
        clashes.push({ eventTitle: ev.title, withTitle: t.title, audienceLabel: t.audience_label, start: t.starts_at });
      }
    }
  }
  return clashes;
}

/** Time window covering all dated events, padded by a day, for the timetable query. */
export function eventWindow(events: EventItem[]): { from: string; to: string } | null {
  const times = events.flatMap((e) => [e.start, e.end]).filter((x): x is string => Boolean(x)).map((x) => new Date(x).getTime());
  if (times.length === 0) return null;
  const day = 24 * HOUR_MS;
  return { from: new Date(Math.min(...times) - day).toISOString(), to: new Date(Math.max(...times) + day).toISOString() };
}
