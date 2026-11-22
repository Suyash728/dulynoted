import { describe, expect, it } from 'vitest';
import { canonicalBranch, matchAudiences, type ClassRow } from '@/lib/pipeline/route';

const row = (label: string, year: string, branch: string, division: string, size = 60): ClassRow => ({
  label, year, branch, division, size, telegram_chat_id: null,
});
const rows = [
  row('TE AI&DS A', 'TE', 'AI&DS', 'A', 64), row('TE AI&DS B', 'TE', 'AI&DS', 'B', 62),
  row('TE COMP A', 'TE', 'COMP', 'A', 66), row('TE IT A', 'TE', 'IT', 'A'),
  row('BE AI&DS A', 'BE', 'AI&DS', 'A', 58), row('SE AI&DS A', 'SE', 'AI&DS', 'A', 65),
];
const labels = (r: ReturnType<typeof matchAudiences>) => r.recipients.map((x) => x.audienceLabel);

describe('canonicalBranch', () => {
  it.each([
    ['AI&DS', 'AI&DS'], ['AI & DS', 'AI&DS'], ['aids', 'AI&DS'], ['Artificial Intelligence & Data Science', 'AI&DS'],
    ['Comp', 'COMP'], ['CE', 'COMP'], ['Computer Engineering', 'COMP'], ['IT', 'IT'], ['Information Technology', 'IT'],
    ['Mechanical', 'MECHANICAL'],
  ])('%s → %s', (input, expected) => expect(canonicalBranch(input)).toBe(expected));
});

describe('matchAudiences', () => {
  it('matches year + branch aliases across divisions', () => {
    const r = matchAudiences({ all: false, years: ['TE'], branches: ['AI & DS', 'Comp', 'IT'], divisions: [] }, rows);
    expect(labels(r)).toEqual(['TE AI&DS A', 'TE AI&DS B', 'TE COMP A', 'TE IT A']);
    expect(r.fallback).toBe(false);
  });
  it('filters by division ("Div A")', () => {
    const r = matchAudiences({ all: false, years: ['TE'], branches: ['AI&DS'], divisions: ['Div A'] }, rows);
    expect(labels(r)).toEqual(['TE AI&DS A']);
  });
  it('sends to everyone when audience.all', () => {
    const r = matchAudiences({ all: true, years: [], branches: [], divisions: [] }, rows);
    expect(r.recipients).toHaveLength(rows.length);
    expect(r.fallback).toBe(false);
  });
  it('falls back to all classes when nothing matches', () => {
    const r = matchAudiences({ all: false, years: ['FE'], branches: ['Civil'], divisions: [] }, rows);
    expect(r.fallback).toBe(true);
    expect(r.recipients).toHaveLength(rows.length);
  });
  it('carries class size and chat id', () => {
    const r = matchAudiences({ all: false, years: ['BE'], branches: [], divisions: [] }, rows);
    expect(r.recipients).toEqual([{ audienceLabel: 'BE AI&DS A', size: 58, chatId: null }]);
  });
});
