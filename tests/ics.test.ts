import { describe, expect, it } from 'vitest';
import { buildIcs, icsFilename } from '@/lib/ics';
import { sampleRun } from './fixtures';

describe('buildIcs', () => {
  const ics = buildIcs(sampleRun());
  const body = ics.body;

  it('is a calendar with one event per dated action and event', () => {
    expect(body).toContain('BEGIN:VCALENDAR');
    expect(ics.eventCount).toBe(2);
    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
  it('adds −1 day and −2 h alarms to deadlines and −1 h to events', () => {
    expect(body.match(/BEGIN:VALARM/g)).toHaveLength(3);
    expect(body).toMatch(/TRIGGER:-P1D/);
    expect(body).toMatch(/TRIGGER:-PT2H/);
    expect(body).toMatch(/TRIGGER:-PT1H/);
  });
  it('writes UTC times and stable UIDs', () => {
    expect(body).toContain('DTSTART:20261123T113000Z'); // 17:00 IST
    expect(body).toContain('UID:3f2a9c1e-0000-4000-8000-000000000000-a0@dulynoted');
    expect(body).toContain('SUMMARY:Due: Register');
  });
  it('returns a valid empty calendar when nothing is dated', () => {
    const empty = buildIcs(sampleRun({ extraction: { ...sampleRun().extraction!, actions: [], events: [] } }));
    expect(empty.eventCount).toBe(0);
    expect(empty.body).toContain('END:VCALENDAR');
  });
  it('builds a safe filename', () => expect(icsFilename('3f2a9c1e-00')).toBe('dulynoted-3f2a9c1e.ics'));
});
