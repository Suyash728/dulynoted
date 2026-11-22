import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { parseJsonLoose, validateJson } from '@/lib/llm-json';
import { LlmUnavailableError, routeChat, type LiveTier } from '@/lib/llm';

const schema = z.object({ digest: z.string().min(1) });
const opts = { task: 'compose' as const, messages: [{ role: 'user' as const, content: 'hi' }], schema };
const tier = (name: LiveTier['tier'], replies: (string | Error)[]): LiveTier => {
  const queue = [...replies];
  return {
    tier: name,
    model: `${name}-model`,
    complete: vi.fn(async () => {
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next ?? '';
    }),
  };
};

describe('parseJsonLoose', () => {
  it('handles fences and surrounding prose', () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Sure! {"a":2} hope that helps')).toEqual({ a: 2 });
  });
  it('throws when there is no object', () => expect(() => parseJsonLoose('nope')).toThrow());
});

describe('validateJson', () => {
  it('returns zod issues as a compact string', () => {
    const r = validateJson('{"digest":""}', schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^digest:/);
  });
});

describe('routeChat', () => {
  it('returns the first valid tier', async () => {
    const r = await routeChat(opts, [tier('groq', ['{"digest":"hello"}'])]);
    expect(r).toMatchObject({ data: { digest: 'hello' }, tier: 'groq', model: 'groq-model' });
  });

  it('makes ONE repair call with the zod error, and reports it', async () => {
    const onRepair = vi.fn();
    const groq = tier('groq', ['{"digest":""}', '{"digest":"fixed"}']);
    const r = await routeChat({ ...opts, onRepair }, [groq]);
    expect(r.data.digest).toBe('fixed');
    expect(groq.complete).toHaveBeenCalledTimes(2);
    const repairPrompt = vi.mocked(groq.complete).mock.calls[1][0].at(-1);
    expect(String(repairPrompt?.content)).toContain('digest:');
    expect(onRepair).toHaveBeenCalledWith(expect.objectContaining({ tier: 'groq', ok: true }));
  });

  it('falls through to the next tier on errors', async () => {
    const r = await routeChat(opts, [tier('groq', [new Error('429')]), tier('gemini', ['{"digest":"g"}'])]);
    expect(r.tier).toBe('gemini');
  });

  it('uses the cache when every live tier fails', async () => {
    const r = await routeChat({ ...opts, cache: async () => ({ digest: 'cached' }) }, [tier('groq', [new Error('down')])]);
    expect(r).toMatchObject({ tier: 'cache', data: { digest: 'cached' } });
  });

  it('throws LlmUnavailableError with attempts when nothing works', async () => {
    await expect(routeChat(opts, [tier('groq', [new Error('down')])])).rejects.toBeInstanceOf(LlmUnavailableError);
  });
});
