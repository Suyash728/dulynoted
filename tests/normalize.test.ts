import { describe, expect, it } from 'vitest';
import { normalizeExtraction, parseSpan, referenceDate } from '@/lib/pipeline/normalize';
import { toIstIso } from '@/lib/time';
import type { Extraction } from '@/lib/types';

const ref = referenceDate('2026-11-22');
const iso = (d: Date | null | undefined) => (d ? toIstIso(d) : null);

describe('parseSpan', () => {
  it('reads day-first dates and defaults date-only deadlines to 23:59 IST', () => {
    const s = parseSpan('on or before 05/12/2026', ref);
    expect(iso(s?.start)).toBe('2026-12-05T23:59:00+05:30');
    expect(s?.hasTime).toBe(false);
  });
  it('resolves relative phrases against the issue date', () => {
    expect(iso(parseSpan('latest by tomorrow 5 pm', ref)?.start)).toBe('2026-11-23T17:00:00+05:30');
  });
  it('keeps the time range of a multi-day event on its first day', () => {
    const s = parseSpan('24/11/2026 & 25/11/2026 from 10 AM to 4 PM', ref);
    expect(iso(s?.start)).toBe('2026-11-24T10:00:00+05:30');
    expect(iso(s?.end)).toBe('2026-11-24T16:00:00+05:30');
  });
  it('reads a date with a time after a comma', () => {
    expect(iso(parseSpan('29/11/2026, 4 pm', ref)?.start)).toBe('2026-11-29T16:00:00+05:30');
  });
  it('returns null when there is no date', () => {
    expect(parseSpan('as soon as possible', ref)).toBeNull();
    expect(parseSpan('', ref)).toBeNull();
  });
});

describe('normalizeExtraction', () => {
  const base: Extraction = {
    title: 'Notice', issuer: null, issuedOn: '2026-11-22', summary: '', language: 'en',
    audience: { all: true, years: [], branches: [], divisions: [] },
    actions: [
      { what: 'Fill form', deadline: '2030-01-01T00:00:00Z', deadlineText: 'on or before 27/11/2026', location: null, requiredDocs: [], fee: null, needsReview: false },
      { what: 'Vague', deadline: null, deadlineText: 'sometime next sem', location: null, requiredDocs: [], fee: null, needsReview: false },
      { what: 'Old', deadline: null, deadlineText: '01/11/2026', location: null, requiredDocs: [], fee: null, needsReview: false },
      { what: 'Bring laptop', deadline: null, deadlineText: '', location: null, requiredDocs: [], fee: null, needsReview: true },
    ],
    events: [{ title: 'Workshop', start: null, end: null, dateText: '24/11/2026 from 10 AM to 4 PM', venue: 'Hall', needsReview: false }],
  };
  const now = new Date('2026-11-22T06:00:00Z');
  const out = normalizeExtraction(base, now);

  it('ignores the model ISO and uses the copied wording', () => {
    expect(out.extraction.actions[0].deadline).toBe('2026-11-27T23:59:00+05:30');
    expect(out.extraction.actions[0].needsReview).toBe(false);
  });
  it('flags unparseable and past dates for review', () => {
    expect(out.extraction.actions[1]).toMatchObject({ deadline: null, needsReview: true });
    expect(out.extraction.actions[2].needsReview).toBe(true);
    expect(out.reviewCount).toBe(2);
  });
  it('does not flag undated to-dos', () => {
    expect(out.extraction.actions[3]).toMatchObject({ deadline: null, needsReview: false });
  });
  it('fills event start and end', () => {
    expect(out.extraction.events[0]).toMatchObject({ start: '2026-11-24T10:00:00+05:30', end: '2026-11-24T16:00:00+05:30' });
  });
});
