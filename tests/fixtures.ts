import type { RunResult } from '@/lib/types';

/** A delivered-shape run used by ics + telegram tests. */
export function sampleRun(overrides: Partial<RunResult> = {}): RunResult {
  return {
    id: '3f2a9c1e-0000-4000-8000-000000000000',
    status: 'awaiting_approval',
    inputType: 'text',
    sourceName: 'Sample: Workshop',
    extraction: {
      title: 'GenAI <Agents> Workshop',
      issuer: 'HOD',
      issuedOn: '2026-11-22',
      summary: 'Workshop',
      language: 'en',
      audience: { all: false, years: ['TE'], branches: ['AI&DS'], divisions: [] },
      actions: [
        { what: 'Register', deadline: '2026-11-23T17:00:00+05:30', deadlineText: 'tomorrow 5 pm', location: null, requiredDocs: ['Laptop'], fee: null, needsReview: false },
        { what: 'Bring laptop', deadline: null, deadlineText: '', location: null, requiredDocs: [], fee: null, needsReview: false },
      ],
      events: [{ title: 'Workshop day 1', start: '2026-11-24T10:00:00+05:30', end: '2026-11-24T16:00:00+05:30', dateText: '', venue: 'Hall 2', needsReview: false }],
    },
    recipients: [
      { audienceLabel: 'TE AI&DS A', size: 64, chatId: null },
      { audienceLabel: 'TE AI&DS B', size: 62, chatId: null },
      { audienceLabel: 'TE COMP A', size: 66, chatId: '-200' },
    ],
    clashes: [{ eventTitle: 'Workshop day 1', withTitle: 'Unit Test 2', audienceLabel: 'TE AI&DS A', start: '2026-11-24T04:30:00Z' }],
    digests: [
      { audienceLabels: ['TE AI&DS A'], text: 'Register by 5 pm & bring <laptop>\n⚠ Clash: Unit Test 2 at 10:00 am' },
      { audienceLabels: ['TE AI&DS B', 'TE COMP A'], text: 'Register by 5 pm & bring <laptop>' },
    ],
    timeSaved: null,
    steps: [],
    ...overrides,
  };
}
