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
    expect(msgs[0].html).toContain('📌 <b>DulyNoted · GenAI &lt;Agents&gt; Workshop</b>');
    expect(msgs[0].html).toContain('bring &lt;laptop&gt;');
  });
  it('adds clash lines only to chats with affected classes', () => {
    expect(msgs[0].html).toContain('⚠ Clash: Unit Test 2 at 10:00 am (TE AI&amp;DS A)');
    expect(msgs[1].html).not.toContain('Clash');
  });
  it('skips classes with no chat when there is no demo chat', () => {
    expect(buildChatMessages(sampleRun(), undefined).map((m) => m.chatId)).toEqual(['-200']);
  });
});
