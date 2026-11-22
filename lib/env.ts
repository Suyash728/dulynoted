import 'server-only';
import { z } from 'zod';

const optional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  GROQ_API_KEY: optional,
  GEMINI_API_KEY: optional,
  TELEGRAM_BOT_TOKEN: optional,
  TELEGRAM_DEMO_CHAT_ID: optional,
  CRON_SECRET: optional,
  FORCE_LLM_FAIL: optional.transform((v) => v === '1' || v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/** Validated server env. Error messages name missing variables, never their values. */
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Server is missing or has invalid environment variables: ${names}`);
  }
  cached = parsed.data;
  return cached;
}
