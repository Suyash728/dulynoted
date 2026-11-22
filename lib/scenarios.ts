import type { SampleId } from './samples';

/** Demo scenarios shown as cards. Each tag names a capability the run really demonstrates. */
export interface Scenario {
  hotkey: '1' | '2' | '3' | '4' | '5';
  sampleId: SampleId;
  kind: 'text' | 'pdf' | 'image';
  title: string;
  tag: string;
  url?: string; // file scenarios — rendered per request with today's dates
}

export const SCENARIOS: readonly Scenario[] = [
  { hotkey: '1', sampleId: 'workshop', kind: 'text', title: 'Workshop circular', tag: 'Timetable clash' },
  { hotkey: '2', sampleId: 'exam-form', kind: 'text', title: 'Exam form notice', tag: 'Deadlines + checklist' },
  { hotkey: '3', sampleId: 'scholarship', kind: 'text', title: 'Scholarship notice', tag: 'All classes FE–BE' },
  { hotkey: '4', sampleId: 'exam-form', kind: 'pdf', title: 'Exam form · printed PDF', tag: 'PDF text layer', url: '/api/samples/exam-form.pdf' },
  { hotkey: '5', sampleId: 'scholarship', kind: 'image', title: 'Scholarship · phone photo', tag: 'Photo OCR', url: '/api/samples/scholarship.png' },
];
