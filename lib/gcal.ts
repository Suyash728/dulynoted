import type { ActionItem, EventItem } from './types';

/**
 * "Add to Google Calendar" template links — one tap, no OAuth, nothing stored on Google's side
 * until the student saves it. Times are written in UTC (…Z) with ctz=Asia/Kolkata for display.
 */

const BASE = 'https://calendar.google.com/calendar/render';
const DEADLINE_BLOCK_MS = 30 * 60_000;
const DEFAULT_EVENT_MS = 60 * 60_000;

/** 2026-11-27T23:59:00+05:30 → 20261127T182900Z */
export function toGcalUtc(at: Date): string {
  return at.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function link(text: string, start: Date, end: Date, details: string, location: string | null): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates: `${toGcalUtc(start)}/${toGcalUtc(end)}`,
    details,
    ctz: 'Asia/Kolkata',
  });
  if (location) params.set('location', location);
  return `${BASE}?${params.toString()}`;
}

/** Deadline = a 30-minute block ending at the deadline. Null when the deadline is unknown. */
export function actionCalendarUrl(a: ActionItem, source: string): string | null {
  if (!a.deadline) return null;
  const end = new Date(a.deadline);
  const notes = [a.requiredDocs.length ? `Bring: ${a.requiredDocs.join(', ')}` : '', a.fee ? `Fee: ${a.fee}` : '', `From: ${source}`];
  return link(`Due: ${a.what}`, new Date(end.getTime() - DEADLINE_BLOCK_MS), end, notes.filter(Boolean).join('\n'), a.location);
}

export function eventCalendarUrl(e: EventItem, source: string): string | null {
  if (!e.start) return null;
  const start = new Date(e.start);
  const end = e.end && new Date(e.end) > start ? new Date(e.end) : new Date(start.getTime() + DEFAULT_EVENT_MS);
  return link(e.title, start, end, `From: ${source}`, e.venue);
}
