# AI disclosure
- Build method: 100% prompt-driven with Claude Code (Anthropic) in VS Code. Every prompt is listed below ("Prompts used"), verbatim and in order.
- Runtime models: Groq openai/gpt-oss-120b (extraction), openai/gpt-oss-20b (digest), Google gemini-3.5-flash-lite (fallback + image OCR).
- MCP/tools used while building: Context7 (docs), Supabase MCP (schema), Playwright MCP (demo test), GitHub CLI, Vercel CLI.
- What AI generated: (fill at submit)
- What I verified by hand: (fill at submit)
- Deterministic (non-AI) parts: date normalisation, audience routing, clash detection, .ics generation, Telegram delivery.

## Prompts used (verbatim, in order)
The build follows a pre-written playbook of numbered prompts (P0–P8). Below: each message I typed to Claude Code, then the playbook prompt it executed.

### 1. Pre-flight [2026-11-22 12:23 IST]
```
/home/suyash/Downloads/PLAYBOOK.md start working, ask questions when needed
```
Executed playbook prompt P0:
```
Pre-flight for a hackathon. Do NOT write any application code.

1. Pin check (max 2 min per item, use Context7 or web): confirm these are current today and list anything that changed:
   - Groq models: openai/gpt-oss-120b, openai/gpt-oss-20b; Groq json_object / json_schema support for gpt-oss.
   - Gemini: gemini-3.5-flash-lite via the OpenAI-compatible endpoint https://generativelanguage.googleapis.com/v1beta/openai/ , incl. image_url (base64 data URL) input; free-tier daily limit.
   - npm: openai, zod, @supabase/supabase-js, ics, chrono-node, unpdf — current versions and the exact call signatures for: ics.createEvents with alarms, chrono.parse with a reference date and timezone, unpdf extractText.
   - Telegram Bot API: sendMessage (HTML parse_mode), sendDocument multipart upload.
   - Supabase pg_cron + pg_net: syntax to POST to an HTTPS URL every minute with a bearer header.
   - shadcn/ui CLI compatibility with Next.js 14 + Tailwind v3 (which CLI version to use).
2. Create .env.example with names only:
   GROQ_API_KEY GEMINI_API_KEY NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY TELEGRAM_BOT_TOKEN TELEGRAM_DEMO_CHAT_ID CRON_SECRET FORCE_LLM_FAIL APP_TZ=Asia/Kolkata
3. Write scripts/check_keys.sh that, using env vars from .env.local loaded by the shell (do not cat or print the file), makes one tiny request each to Groq (/models), Gemini (/models), Supabase (REST root) and Telegram (getMe), and prints only OK/FAIL per service. Also call Telegram getUpdates and print only the chat id(s) of group chats so I can set TELEGRAM_DEMO_CHAT_ID.
4. Create an empty PROMPTS.md with the header "# PROMPTS.md — every prompt used to build DulyNoted, verbatim, in order".
5. Output a table: item | status | what changed. Stop.
```

### 2. Question [12:27 IST]
```
does that playbook mentions of using hackthon-starter template?
```

### 3. Kickoff [12:30 IST]
```
okay i'll start creating and filling the .env.local meanwhile you start wokring on project as less time is avaible and don't add playbook.md and prompts.md to git
```
Executed playbook prompt P1 (Steps B–D; event facts not yet provided):
```
Kickoff. First append this entire prompt verbatim to PROMPTS.md under "## P1 Kickoff [HH:MM IST]".

EVENT FACTS (from the organisers):
- Start/end IST: [PASTE]
- Surprise statement: [PASTE or "none"]
- Submission requirements: [PASTE or "not published"]
- Rules about pre-existing code / AI disclosure / sponsor tech: [PASTE or "not published"]

STEP A — Rules + pivot check (max 3 min, write findings to PIVOT.md, 15 lines max):
- If the rules ban pre-existing code: delete everything except .claude/, CLAUDE.md, AGENTS.md, PLAYBOOK.md, PROMPTS.md, .env.example, scripts/check_keys.sh. Tooling is not product.
- If a sponsor/mandatory tech is named, it becomes the core LLM call in lib/llm.ts; note it in PIVOT.md.
- If the surprise statement is "none" or fits notices / reminders / forms / documents: keep DulyNoted as specified below.
- Otherwise keep the SAME architecture (INGEST → EXTRACT → NORMALIZE_DATES → ROUTE_AUDIENCE → CLASH_CHECK → COMPOSE → APPROVE → DELIVER) and remap the domain. Pre-designed remaps:
  (a) attendance sheet photo/CSV → defaulter list (<75%) → per-mentor Telegram digest + letters
  (b) Google Form responses CSV → who hasn't submitted → per-class chaser messages + .ics deadline
  (c) meeting minutes → task list with owners/dates → per-person Telegram + .ics
  Write the mapping in PIVOT.md, then adapt the one-liner, the Extraction type and the seed files below. Everything else stays.
- Convert T+0:30, 1:20, 2:00 (MUST done), 2:24 (FREEZE), 3:15 (submit pack), 3:45 (submitted) to IST and put them in CLAUDE.md under "## Clock".

STEP B — Scaffold (max 8 min):
- Next.js 14 App Router + TypeScript + Tailwind + ESLint + src-less layout, npm. If create-next-app refuses the non-empty folder, scaffold into ./_tmp and move the contents up.
- shadcn/ui (use the CLI version P0 found compatible): button, card, badge, tabs, textarea, separator, scroll-area, sonner, tooltip.
- npm i openai zod @supabase/supabase-js ics chrono-node unpdf
- git init (if needed), branch `build`. Never push to main.

STEP C — Write these files exactly as given at the bottom of this prompt (FILES section): CLAUDE.md (replace the existing one, keep any .claude/ skill references), lib/types.ts, supabase/schema.sql, supabase/seed.sql, agents/graph.md, seed/circulars/exam-form.txt, seed/circulars/workshop.txt, seed/circulars/scholarship.txt, AI_DISCLOSURE.md. Also: ln -sf CLAUDE.md AGENTS.md

STEP D — Database: using the Supabase MCP, apply supabase/schema.sql then supabase/seed.sql to the `dulynoted` project. Verify with: select label from audiences; select title, starts_at from calendar_events;

STEP E — Deploy now (live URL early): push branch `build` to a new public GitHub repo `dulynoted` (gh CLI). Link Vercel (npx vercel link), set the Vercel production branch to `build`, add every env var from .env.example to Vercel production by asking me to paste values when needed (never read .env.local). Deploy. A placeholder page that says "DulyNoted" is enough.

Done when: (1) `npm run build` passes, (2) the Vercel URL returns 200, (3) SQL verification rows printed raw. Then list files changed, commit "chore: scaffold, contracts, schema, deploy", and stop.

=== FILES ===
(CLAUDE.md, lib/types.ts, supabase/schema.sql, supabase/seed.sql, agents/graph.md, seed/circulars/*.txt, AI_DISCLOSURE.md — committed in this repo exactly as specified)
```

### 4. Database + disclosure [12:50 IST]
```
done supabase secrects copied into .env.local at / .. Vercel deploy i'll do manually (ask me when to do it). okay add the prompts to ai disclosure.
```

### 5. GitHub [12:41 IST]
```
yes create and push on github
```

### 6. Deployed + env help [12:45 IST]
```
deployed, here's the vercel url: https://dulynoted.vercel.app

and how to get

TELEGRAM_BOT_TOKEN=
TELEGRAM_DEMO_CHAT_ID=
CRON_SECRET=
FORCE_LLM_FAIL=
```

### 7. Telegram chat id [12:52 IST]
```
[screenshot of Telegram group] not getting reply
```

### 8. Next steps [12:53 IST]
```
what should i do now?
```

### 9. Bot re-added [12:56 IST]
```
i've added the bot again and sent the message on group now wht?
```

### 10. Evaluation criteria [12:58 IST]
```
yes all secrects are added to .env.local

[screenshot: Hack2Skill "AI Code Submission" — evaluated by AI on: Code Quality, Security, Efficiency, Testing, Accessibility, Problem Statement Alignment]
also make sure you keep this criteria in mind and the code will be equalvaluated by hack2skill ai and judges later
```
