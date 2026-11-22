import { describe, expect, it } from 'vitest';
import { actionCalendarUrl, eventCalendarUrl, toGcalUtc } from '@/lib/gcal';
import { buildChatMessages, calendarLinks } from '@/lib/telegram';
import { sampleRun } from './fixtures';

const run = sampleRun();
const x = run.extraction!;

describe('Google Calendar links', () => {
  it('formats UTC basic time', () => expect(toGcalUtc(new Date('2026-11-27T23:59:00+05:30'))).toBe('20261127T182900Z'));

  it('makes a deadline a 30-minute block ending at the deadline', () => {
    const url = new URL(actionCalendarUrl(x.actions[0], x.title)!);
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Due: Register');
    expect(url.searchParams.get('dates')).toBe('20261123T110000Z/20261123T113000Z'); // 16:30–17:00 IST
    expect(url.searchParams.get('ctz')).toBe('Asia/Kolkata');
    expect(url.searchParams.get('details')).toContain('Bring: Laptop');
  });

  it('uses event start/end and venue; skips undated items', () => {
    const url = new URL(eventCalendarUrl(x.events[0], x.title)!);
    expect(url.searchParams.get('dates')).toBe('20261124T043000Z/20261124T103000Z');
    expect(url.searchParams.get('location')).toBe('Hall 2');
    expect(actionCalendarUrl(x.actions[1], x.title)).toBeNull();
    expect(calendarLinks(run)).toHaveLength(2);
  });

  it('puts escaped links in the Telegram message and credits Gemini only when it composed', () => {
    const plain = buildChatMessages(run, '-100', new Date('2026-11-22T06:00:00Z'))[0].html;
    expect(plain).toContain('📅 <b>Add to your Google Calendar</b>');
    expect(plain).toContain('• <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&amp;text=Due');
    expect(plain).toContain('>Register</a> — Mon, 23 Nov, 5:00 pm');
    expect(plain).toContain('⏰ This group will get a reminder 24 h before each deadline.');
    expect(plain).not.toContain('summarised by Gemini');
    expect(plain).not.toContain('.ics');
    const withGemini = sampleRun({ steps: [{ runId: run.id, seq: 6, step: 'COMPOSE', status: 'ok', input: '', output: '', tier: 'gemini', at: '' }] });
    expect(buildChatMessages(withGemini, '-100')[0].html).toContain('<i>Sent by DulyNoted · summarised by Gemini</i>');
  });
});
