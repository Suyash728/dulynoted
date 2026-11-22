import { describe, expect, it } from 'vitest';
import { buildDigests, clip, estimateTimeSaved, templateDigest } from '@/lib/pipeline/digest';
import type { Extraction } from '@/lib/types';

const x: Extraction = {
  title: 'Exam form', issuer: 'Exam Cell', issuedOn: '2026-11-22', summary: '', language: 'en',
  audience: { all: false, years: ['TE'], branches: [], divisions: [] },
  actions: [{ what: 'Fill exam form', deadline: '2026-11-27T23:59:00+05:30', deadlineText: '', location: null, requiredDocs: ['Fee receipt'], fee: null, needsReview: false }],
  events: [{ title: 'Workshop', start: '2026-11-24T10:00:00+05:30', end: null, dateText: '', venue: 'Hall 2', needsReview: false }],
};
const now = new Date('2026-11-22T06:00:00Z');

describe('templateDigest', () => {
  it('builds a readable fallback from extracted fields only', () => {
    expect(templateDigest(x, now)).toBe(
      'Exam form\n• Fill exam form — due in 5 days · 27 Nov, 11:59 pm\n  Bring: Fee receipt\n• Workshop — in 2 days · 24 Nov, 10:00 am, Hall 2',
    );
  });
});

describe('clip', () => {
  it('caps length with an ellipsis', () => {
    const out = clip('a'.repeat(500));
    expect(out).toHaveLength(450);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('buildDigests', () => {
  const recipients = ['A', 'B', 'C'].map((l) => ({ audienceLabel: l, size: 60, chatId: null }));
  it('adds the clash line only for affected classes and groups identical texts', () => {
    const d = buildDigests('Base', recipients, [
      { eventTitle: 'Workshop', withTitle: 'Unit Test 2', audienceLabel: 'A', start: '2026-11-24T04:30:00Z' },
      { eventTitle: 'Workshop', withTitle: 'Unit Test 2', audienceLabel: 'B', start: '2026-11-24T04:30:00Z' },
    ]);
    expect(d).toEqual([
      { audienceLabels: ['A', 'B'], text: 'Base\n⚠ Clash: Unit Test 2 at 10:00 am' },
      { audienceLabels: ['C'], text: 'Base' },
    ]);
  });
});

describe('estimateTimeSaved', () => {
  it('follows the documented formula', () => {
    expect(estimateTimeSaved(x, 3, 3_400)).toMatchObject({ manualMin: 14, autoSec: 3 });
  });
});
