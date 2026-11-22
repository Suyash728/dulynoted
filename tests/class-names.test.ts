import { describe, expect, it } from 'vitest';
import { describeClasses, parseClassLabel } from '@/lib/class-names';

describe('describeClasses', () => {
  it('groups divisions by year and branch, in year order', () => {
    expect(describeClasses(['BE AI&DS A', 'TE AI&DS A', 'TE AI&DS B'])).toBe(
      'Third-year (TE) AI&DS — Div A & B · Final-year (BE) AI&DS — Div A',
    );
  });
  it('handles three divisions and unknown label formats', () => {
    expect(describeClasses(['SE IT C', 'SE IT A', 'SE IT B', 'Staff room'])).toBe('Second-year (SE) IT — Div A, B & C · Staff room');
  });
  it('parses labels', () => {
    expect(parseClassLabel('TE AI&DS B')).toEqual({ year: 'TE', branch: 'AI&DS', division: 'B' });
    expect(parseClassLabel('All students')).toBeNull();
  });
});
