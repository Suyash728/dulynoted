import { describe, expect, it } from 'vitest';
import { eventWindow, findClashes, type TimetableEntry } from '@/lib/pipeline/clash';
import type { EventItem } from '@/lib/types';

const ev = (start: string | null, end: string | null = null): EventItem => ({
  title: 'Workshop', start, end, dateText: '', venue: null, needsReview: false,
});
const test2: TimetableEntry = {
  title: 'Unit Test 2', starts_at: '2026-11-24T04:30:00+00:00', ends_at: '2026-11-24T06:00:00+00:00', audience_label: 'TE AI&DS A',
};

describe('findClashes', () => {
  it('detects an overlap for an affected class', () => {
    const c = findClashes([ev('2026-11-24T10:00:00+05:30', '2026-11-24T16:00:00+05:30')], [test2], ['TE AI&DS A']);
    expect(c).toEqual([{ eventTitle: 'Workshop', withTitle: 'Unit Test 2', audienceLabel: 'TE AI&DS A', start: test2.starts_at }]);
  });
  it('ignores classes that are not recipients', () => {
    expect(findClashes([ev('2026-11-24T10:00:00+05:30')], [test2], ['TE COMP A'])).toEqual([]);
  });
  it('does not flag back-to-back slots', () => {
    expect(findClashes([ev('2026-11-24T11:30:00+05:30', '2026-11-24T12:30:00+05:30')], [test2], ['TE AI&DS A'])).toEqual([]);
  });
  it('defaults a missing end to one hour', () => {
    expect(findClashes([ev('2026-11-24T09:30:00+05:30')], [test2], ['TE AI&DS A'])).toHaveLength(1);
    expect(findClashes([ev('2026-11-24T09:00:00+05:30')], [test2], ['TE AI&DS A'])).toHaveLength(0);
  });
  it('skips undated events', () => {
    expect(findClashes([ev(null)], [test2], ['TE AI&DS A'])).toEqual([]);
  });
});

describe('eventWindow', () => {
  it('pads the event range by a day', () => {
    expect(eventWindow([ev('2026-11-24T10:00:00+05:30', '2026-11-24T16:00:00+05:30')])).toEqual({
      from: '2026-11-23T04:30:00.000Z', to: '2026-11-25T10:30:00.000Z',
    });
  });
  it('is null when nothing is dated', () => expect(eventWindow([ev(null)])).toBeNull());
});
