import type { RunStep } from './types';

/** Who did the work in a step — shown as a tag so the hybrid AI/code design is visible. */
export type StepKind = 'AI' | 'Code' | 'Human';

export function stepKind(step: Pick<RunStep, 'step' | 'tier'>): StepKind {
  switch (step.step) {
    case 'APPROVE':
      return 'Human';
    case 'EXTRACT':
    case 'REPAIR':
      return 'AI';
    case 'COMPOSE':
      return step.tier === 'none' ? 'Code' : 'AI'; // template fallback is plain code
    case 'INGEST':
      return step.tier === 'gemini' || step.tier === 'cache' ? 'AI' : 'Code'; // OCR vs text/PDF layer
    default:
      return 'Code';
  }
}

/** Short engine label: "Groq 120B", "Gemini", "Cache", "Template", or the code technique. */
export function engineLabel(step: Pick<RunStep, 'step' | 'tier' | 'model'>): string | null {
  if (step.tier === 'cache') return 'Cache';
  if (step.tier === 'none') return 'Template';
  if (step.tier === 'gemini') return 'Gemini';
  if (step.tier === 'groq') return step.model?.endsWith('-20b') ? 'Groq 20B' : 'Groq 120B';
  const code: Partial<Record<RunStep['step'], string>> = {
    NORMALIZE_DATES: 'chrono-node',
    ROUTE_AUDIENCE: 'class table',
    CLASH_CHECK: 'timetable SQL',
    DELIVER: 'Telegram API',
    SCHEDULE: 'pg_cron',
  };
  return code[step.step] ?? null;
}
