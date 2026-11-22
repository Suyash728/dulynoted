import { describe, expect, it } from 'vitest';
import { baseDigest, buildChatMessages, escapeHtml } from '@/lib/telegram';
import { sampleRun } from './fixtures';

describe('escapeHtml', () => {
  it('escapes Telegram HTML special characters', () => expect(escapeHtml('<b>"A&B"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;'));
});

describe('baseDigest', () => {
  it('drops per-class clash lines', () => expect(baseDigest(sampleRun())).toBe('Register by 5 pm & bring <laptop>'));
});

describe('buildChatMessages', () => {
  const msgs = buildChatMessages(sampleRun(), '-100');

  it('groups classes by chat, defaulting to the demo chat', () => {
    expect(msgs.map((m) => [m.chatId, m.labels])).toEqual([
      ['-100', ['TE AI&DS A', 'TE AI&DS B']],
      ['-200', ['TE COMP A']],
    ]);
  });
  it('escapes user text and keeps our own markup', () => {
    expect(msgs[0].html).toContain('📌 <b>GenAI &lt;Agents&gt; Workshop</b>');
    expect(msgs[0].html).toContain('bring &lt;laptop&gt;');
  });
  it('names the audience specifically, with student counts', () => {
    expect(msgs[0].html).toContain('👥 <b>For:</b> Third-year (TE) AI&amp;DS — Div A &amp; B (126 students)');
    expect(msgs[1].html).toContain('👥 <b>For:</b> Third-year (TE) COMP — Div A (66 students)');
  });
  it('adds one merged clash line, with its date, only to chats with affected classes', () => {
    expect(msgs[0].html).toContain('⚠️ Timetable clash: <b>Unit Test 2</b> is on Tue, 24 Nov, 10:00 am for Third-year (TE) AI&amp;DS — Div A');
    expect(msgs[0].html.match(/Timetable clash/g)).toHaveLength(1);
    expect(msgs[1].html).not.toContain('clash');
  });
  it('does not repeat the digest clash note', () => {
    expect(msgs[0].html).not.toContain('⚠ Clash');
  });
  it('skips classes with no chat when there is no demo chat', () => {
    expect(buildChatMessages(sampleRun(), undefined).map((m) => m.chatId)).toEqual(['-200']);
  });
});
