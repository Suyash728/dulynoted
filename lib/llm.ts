import 'server-only';
import OpenAI from 'openai';
import type { z } from 'zod';
import type { Tier } from './types';
import { env } from './env';
import { validateJson } from './llm-json';

/**
 * The ONLY place that talks to model providers.
 * Text:  groq → gemini → cache.   Image: gemini → cache.
 * Each tier gets one call plus at most ONE repair call when the JSON fails zod.
 */

export type LlmTask = 'extract' | 'compose' | 'ocr';
export type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export interface ChatResult<T> {
  data: T;
  tier: Tier;
  model: string;
  ms: number;
}

export interface RepairInfo {
  tier: Tier;
  model: string;
  error: string;
  ok: boolean;
  ms: number;
}

export interface ChatOptions<T> {
  task: LlmTask;
  messages: Message[];
  schema: z.ZodType<T, unknown>;
  /** Last-resort offline answer (e.g. a fixture for a known sample). */
  cache?: () => Promise<T | null>;
  onRepair?: (info: RepairInfo) => void;
}

/** One provider/model pair. `complete` returns the raw assistant text. */
export interface LiveTier {
  tier: Exclude<Tier, 'cache' | 'none'>;
  model: string;
  complete: (messages: Message[], signal: AbortSignal) => Promise<string>;
}

export class LlmUnavailableError extends Error {
  constructor(public readonly attempts: string[]) {
    super('All AI providers are unavailable right now');
    this.name = 'LlmUnavailableError';
  }
}

const TIMEOUT_MS: Record<LlmTask, number> = { extract: 8_000, compose: 3_000, ocr: 15_000 };
const MAX_TOKENS: Record<LlmTask, number> = { extract: 2_000, compose: 400, ocr: 2_500 };

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const GROQ_MODEL: Record<Exclude<LlmTask, 'ocr'>, string> = { extract: 'openai/gpt-oss-120b', compose: 'openai/gpt-oss-20b' };
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

let groq: OpenAI | null = null;
let gemini: OpenAI | null = null;

function openAiTier(
  client: OpenAI,
  tier: LiveTier['tier'],
  model: string,
  task: LlmTask,
): LiveTier {
  return {
    tier,
    model,
    async complete(messages, signal) {
      const res = await client.chat.completions.create(
        {
          model,
          messages,
          response_format: { type: 'json_object' },
          max_completion_tokens: MAX_TOKENS[task],
          temperature: 0.1,
          ...(tier === 'groq' ? { reasoning_effort: 'low' as const } : {}),
        },
        { signal, maxRetries: 0 },
      );
      return res.choices[0]?.message?.content ?? '';
    },
  };
}

/** Live tiers for a task, skipping providers with no key or when FORCE_LLM_FAIL is set. Image input (ocr) is Gemini-only. */
export function liveTiers(task: LlmTask): LiveTier[] {
  const e = env();
  if (e.FORCE_LLM_FAIL) return [];
  const tiers: LiveTier[] = [];
  if (e.GROQ_API_KEY && task !== 'ocr') {
    groq ??= new OpenAI({ apiKey: e.GROQ_API_KEY, baseURL: GROQ_BASE });
    tiers.push(openAiTier(groq, 'groq', GROQ_MODEL[task], task));
  }
  if (e.GEMINI_API_KEY) {
    gemini ??= new OpenAI({ apiKey: e.GEMINI_API_KEY, baseURL: GEMINI_BASE });
    tiers.push(openAiTier(gemini, 'gemini', GEMINI_MODEL, task));
  }
  return tiers;
}

function describe(err: unknown): string {
  if (err instanceof OpenAI.APIError) return `HTTP ${err.status ?? '?'}`;
  if (err instanceof Error) return err.name === 'AbortError' || /abort/i.test(err.message) ? 'timeout' : err.name;
  return 'unknown error';
}

/** Router core, separated from env so it can be unit-tested with fake tiers. */
export async function routeChat<T>(opts: ChatOptions<T>, tiers: LiveTier[]): Promise<ChatResult<T>> {
  const attempts: string[] = [];
  for (const t of tiers) {
    const started = Date.now();
    const elapsed = () => Date.now() - started;
    try {
      const signal = AbortSignal.timeout(TIMEOUT_MS[opts.task]);
      const first = validateJson(await t.complete(opts.messages, signal), opts.schema);
      if (first.ok) return { data: first.data, tier: t.tier, model: t.model, ms: elapsed() };

      const repairStart = Date.now();
      const repairMessages: Message[] = [
        ...opts.messages,
        {
          role: 'user',
          content: `Your previous JSON was invalid: ${first.error}. Reply again with ONLY the corrected JSON object.`,
        },
      ];
      const second = validateJson(
        await t.complete(repairMessages, AbortSignal.timeout(TIMEOUT_MS[opts.task])),
        opts.schema,
      );
      opts.onRepair?.({ tier: t.tier, model: t.model, error: first.error, ok: second.ok, ms: Date.now() - repairStart });
      if (second.ok) return { data: second.data, tier: t.tier, model: t.model, ms: elapsed() };
      attempts.push(`${t.tier}: invalid JSON after repair`);
    } catch (err) {
      attempts.push(`${t.tier}: ${describe(err)}`);
    }
  }

  const started = Date.now();
  const cached = opts.cache ? await opts.cache() : null;
  if (cached !== null) return { data: cached, tier: 'cache', model: 'fixture', ms: Date.now() - started };
  throw new LlmUnavailableError(attempts);
}

export function chat<T>(opts: ChatOptions<T>): Promise<ChatResult<T>> {
  return routeChat(opts, liveTiers(opts.task));
}
