import * as chrono from 'chrono-node';
import type { ActionItem, EventItem, Extraction } from '../types';
import { IST_OFFSET_MIN, istDate, istYmd, parseYMD, toIstIso } from '../time';

/**
 * NORMALIZE_DATES — deterministic. Dates come ONLY from the original wording the
 * model copied (deadlineText / dateText), parsed by chrono-node relative to the
 * circular's issue date. The model never gets to invent an ISO timestamp.
 */

// Indian notices write dates day-first (27/11/2026), so use the en-GB parser.
const parser = chrono.en.GB;

export interface ParsedSpan {
  start: Date;
  end: Date | null;
  hasTime: boolean;
}

/** Parses one human date phrase. Multi-date phrases ("24/11 & 25/11 from 10 AM to 4 PM") use the first date and any time range. */
export function parseSpan(text: string, ref: Date): ParsedSpan | null {
  if (!text.trim()) return null;
  const results = parser.parse(text, { instant: ref, timezone: IST_OFFSET_MIN }, { forwardDate: true });
  if (results.length === 0) return null;

  const first = results[0].start;
  const y = first.get('year');
  const m = first.get('month');
  const d = first.get('day');
  if (y === null || m === null || d === null) return null;

  const timed = results.find((r) => r.start.isCertain('hour'));
  if (!timed) return { start: istDate(y, m, d, 23, 59), end: null, hasTime: false };

  const start = istDate(y, m, d, timed.start.get('hour') ?? 0, timed.start.get('minute') ?? 0);
  const endComp = timed.end?.isCertain('hour') ? timed.end : null;
  const end = endComp ? istDate(y, m, d, endComp.get('hour') ?? 0, endComp.get('minute') ?? 0) : null;
  return { start, end, hasTime: true };
}

/** Reference instant: 09:00 IST on the issue date, or now if the notice is undated. */
export function referenceDate(issuedOn: string | null, now: Date = new Date()): Date {
  const ymd = parseYMD(issuedOn);
  return ymd ? istDate(ymd.year, ymd.month, ymd.day, 9, 0) : now;
}

function startOfTodayIst(now: Date): Date {
  const t = istYmd(now);
  return istDate(t.year, t.month, t.day, 0, 0);
}

export interface NormalizeResult {
  extraction: Extraction;
  resolved: { text: string; iso: string | null }[];
  reviewCount: number;
}

export function normalizeExtraction(input: Extraction, now: Date = new Date()): NormalizeResult {
  const ref = referenceDate(input.issuedOn, now);
  const todayStart = startOfTodayIst(now);
  const resolved: NormalizeResult['resolved'] = [];

  const actions: ActionItem[] = input.actions.map((a) => {
    // Undated to-dos ("bring a laptop") are fine; only a date we cannot trust needs review.
    if (!a.deadlineText.trim()) return { ...a, deadline: null, needsReview: false };
    const span = parseSpan(a.deadlineText, ref);
    const deadline = span ? toIstIso(span.start) : null;
    resolved.push({ text: a.deadlineText, iso: deadline });
    const isPast = span ? span.start < todayStart : false;
    return { ...a, deadline, needsReview: a.needsReview || !span || isPast };
  });

  const events: EventItem[] = input.events.map((ev) => {
    const span = parseSpan(ev.dateText || ev.start || '', ref);
    const start = span ? toIstIso(span.start) : null;
    resolved.push({ text: ev.dateText, iso: start });
    const isPast = span ? span.start < todayStart : false;
    return {
      ...ev,
      start,
      end: span?.end ? toIstIso(span.end) : null,
      needsReview: ev.needsReview || !span || isPast,
    };
  });

  const reviewCount = [...actions, ...events].filter((x) => x.needsReview).length;
  return { extraction: { ...input, actions, events }, resolved, reviewCount };
}
