# DulyNoted
Paste/upload a college circular → an automatic pipeline extracts actions, deadlines and events, routes them to the affected classes, flags timetable clashes, and after ONE approval click sends a Telegram digest + a .ics file whose alarms remind every student.

## Clock (IST)
(filled at kickoff)

## Evaluation (Hack2Skill AI code review + judges) — every slice must satisfy all 6
- Code Quality: strict TS, no `any`, small pure functions, one responsibility per file, zod at every boundary, no dead code, lint clean.
- Security: keys server-only (never NEXT_PUBLIC_ except the Supabase URL), validate + size-limit all input (text ≤ 20k chars, files ≤ 4 MB, MIME allowlist), escape HTML in Telegram, timing-safe CRON_SECRET compare, security headers in next.config, no secrets in logs/errors.
- Efficiency: one LLM call per step, timeouts + tier fallback, batch DB inserts where possible, no client polling except pending reminders, no server sleeps.
- Testing: vitest unit tests for every deterministic step (normalize, route, clash, ics, telegram escape, llm JSON repair parsing) + scripts/smoke.sh e2e + Playwright demo. `npm test` must pass before each commit.
- Accessibility: semantic landmarks, labels on every control, aria-live on the run log, keyboard-operable expand rows, visible focus rings, WCAG AA contrast, status never conveyed by colour alone (icon + text).
- Problem Statement Alignment: README + UI copy tie every feature to the problem (missed circular deadlines, manual re-typing, timetable clashes).

## Rules
- Prompt-only build: append every prompt I give you verbatim to PROMPTS.md (local, gitignored) AND to the "Prompts used" section of AI_DISCLOSURE.md ("### <n>. <title> [HH:MM IST]" + fenced block) before doing anything else.
- Plan Mode first for every slice. Use Context7 for any library API you're unsure of.
- ALL model calls go through lib/llm.ts. Never call Groq/Gemini anywhere else.
- Every API response is ApiEnvelope<T> = { success, data, error } (lib/types.ts), except NDJSON streams (StreamEvent lines).
- Every pipeline step emits a RunStep to the stream AND inserts it into run_steps.
- A failing step never crashes a run: use status 'warn' + fallback, or 'error' + a human sentence shown in the UI.
- Commit after every slice. Branch `build`. Never push main. Never read .env*.
- Do not edit lib/types.ts or supabase/schema.sql without asking me.
- Seed data, not live typing: every demo path starts from a "Load sample" button.

## Commands
npm run dev · npm run build · npm run lint · npm test · bash scripts/smoke.sh <BASE_URL>

## Stack
Next.js 14 App Router + TS + Tailwind + shadcn/ui · Supabase Postgres (server-only, service-role key) · Vercel (export const maxDuration = 60 on pipeline routes) · npm: openai zod @supabase/supabase-js ics chrono-node unpdf

## LLM router (lib/llm.ts) — one OpenAI client class, two base URLs
- Tier 1 Groq https://api.groq.com/openai/v1 — openai/gpt-oss-120b (extract), openai/gpt-oss-20b (compose); reasoning_effort "low" (Groq only). Timeouts: extract 8 s, compose 3 s.
- Tier 2 Gemini https://generativelanguage.googleapis.com/v1beta/openai/ — gemini-3.5-flash-lite (fallback for text; FIRST choice for image input). gemini-3.8-flash is NOT used (20 req/day).
- Tier 3 cache — seed/fixtures/<sampleId>.json, used when every live tier fails or FORCE_LLM_FAIL=1 and the input is a known sample. Run log labels it tier "cache".
- Order: text → groq → gemini → cache. image → gemini → cache. On 429/timeout/5xx move to next tier.
- JSON: response_format json_object, validate with zod; on failure ONE repair call that includes the zod error (emits a REPAIR step).
- chat() returns { data, tier, model, ms }.

## Architecture map
app/page.tsx — 3 panes: InputPanel | ResultPanel (ActionCard, ClashBanner, DigestPreview, TimeSaved) | RunLog
app/api/runs/route.ts — POST (FormData) → NDJSON stream of StreamEvent; run ends 'awaiting_approval'
app/api/runs/[id]/route.ts — GET RunResult (steps included)
app/api/runs/[id]/approve/route.ts — POST → NDJSON stream; DELIVER (+SCHEDULE); ?dryRun=1 skips Telegram
app/api/runs/[id]/ics/route.ts — GET text/calendar
app/api/cron/dispatch/route.ts — (S3) sends due reminders; requires Authorization: Bearer CRON_SECRET
app/history/page.tsx — (S3)
lib/llm.ts · lib/pipeline/{ingest,extract,normalize,route,clash,compose,deliver,schedule,run}.ts · lib/telegram.ts · lib/ics.ts · lib/db.ts · lib/samples.ts · lib/types.ts
seed/circulars/*.txt (date tokens {{D+n}}) · seed/fixtures/*.json · public/samples/* · supabase/*.sql · scripts/smoke.sh

## Pipeline (detail in agents/graph.md)
INGEST → EXTRACT (→ REPAIR) → NORMALIZE_DATES → ROUTE_AUDIENCE → CLASH_CHECK → COMPOSE → [APPROVE gate] → DELIVER → SCHEDULE (S3). Plain function calls. No LangGraph / CrewAI / n8n.

## Scope (FROZEN)
SCOPE FROZEN [13:48 IST] — from now on: fixes, polish and deploy only.
MUST (by T+2:00):
1. Hero pipeline on pasted text / sample buttons with a live step-by-step run log + time-saved number. [working output, AI use, UX]
2. Clash detection against the seeded class calendar, shown as a banner and a yellow run-log step. [usefulness, novelty]
3. Approve → Telegram digest + .ics (with alarms) delivered; cache fallback when LLMs fail. [end-to-end automation, demo]
SHOULD: PDF + image input; scheduled reminder via pg_cron with a "demo reminder in 60 s" button; history page.
COULD: Marathi digest toggle.
WON'T: auth, email, WhatsApp, n8n, multi-college, inline editing of extracted fields, mobile app, local GPU, LangGraph.

## Do not touch
.env* · lib/types.ts · supabase/schema.sql · PROMPTS.md history (append only) · .claude/hooks

## Pins (verified in P0, 2026-11-22)
- next 14.2.35 · Tailwind v3 · shadcn CLI pinned to `npx shadcn@2.3.0` (4.x is Tailwind v4 only)
- zod 4.x (`safeParse`, `error.issues`) · openai 7.x (`new OpenAI({ baseURL, apiKey })`)
- ics 3.12: `createEvents(events, headerAttrs) → {error,value}`; no TZID support → pass UTC (`startInputType/startOutputType:'utc'`); alarm `{action:'display', description, trigger:{hours:2, before:true}}`
- chrono-node 2.10: `chrono.parse(text, { instant, timezone: 'Asia/Kolkata' }, { forwardDate: true })`
- unpdf 2.2: `extractText(new Uint8Array(buf), { mergePages: true }) → { totalPages, text }`
- Groq gpt-oss: json_schema support is flaky per community reports → use json_object + zod + 1 repair
- Next 14 Data Cache caches GET fetches: the Supabase client in lib/db.ts forces `cache: 'no-store'` — keep it
- pg_cron job `dulynoted-dispatch` (every minute) reads its bearer from Vault secret `dulynoted_cron_secret`
- Before the demo / at P7 (user-approved): wipe test data — `delete from reminders; delete from deliveries; delete from run_steps; delete from runs;` (keep audiences + calendar_events), then do 2–3 clean real runs so KPI tiles are genuine
- Demo uploads in public/samples are rendered for a fixed day: re-run `npm run demo-files` (and reseed calendar) on demo day
