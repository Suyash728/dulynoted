# AI disclosure

## Build tool
- **Claude Code** (Anthropic, Claude Opus 5.5) in the terminal. The build was **100% prompt-driven**: every prompt I typed, plus the pre-written playbook prompt it executed, is listed verbatim and in order under [Prompts used](#prompts-used-verbatim-in-order). (A separate PROMPTS.md is not committed; this file is the single source.)
- Tools/MCP used while building: Context7 (library docs), Supabase MCP (schema, seed, pg_cron, verification queries), Vercel MCP (preview env for the offline-cache test), Playwright + axe-core (demo path and accessibility scans), GitHub CLI.
- A UI review produced by **Google Antigravity (Gemini)** was used as input for the dashboard redesign; it is logged verbatim under prompt 17, with the suggestions that were rejected and why.

## Runtime models (exactly as implemented in `lib/llm.ts`)
- **Primary: Google Gemini `gemini-3.5-flash-lite`** via the OpenAI-compatible endpoint — schema-constrained JSON (`response_format: json_schema`) for extraction, the class message, and vision OCR for photos/scanned PDFs.
- **Fallback (text only): Groq** `openai/gpt-oss-120b` (extraction) and `openai/gpt-oss-20b` (message), `json_object` mode.
- **Last resort:** cached fixtures for the five demo scenarios (`seed/fixtures/`), labelled "Cache" in the run log.
- Every model reply is validated with zod; one repair call is allowed with the validation error.

## Google tech used
- Gemini API: structured output + vision (EXTRACT, COMPOSE, image INGEST).
- Google Calendar template links (`lib/gcal.ts`): one-tap "Add to Google Calendar" in the UI and in every Telegram message. No OAuth, no Calendar API writes.

## Deterministic (non-AI) parts
Date normalisation (chrono-node, IST), audience routing, timetable clash detection, digest grouping, time-saved estimate, `.ics` generation, Google Calendar links, Telegram delivery, approval locking, reminder scheduling (pg_cron) — all plain code with unit tests.

## What AI generated
All application code, tests, scripts, SQL and docs were written by Claude Code from the prompts below — in order of the git history:
- Scaffold, data contracts (`lib/types.ts`), Supabase schema/seed, sample circulars (playbook P1).
- Slice 1: LLM router, pipeline steps, NDJSON streaming API, 3-pane UI, run log (P2).
- Slice 2: approval gate, Telegram + `.ics` delivery, offline cache fixtures (P3).
- Slice 3: PDF/photo input, scheduled reminders with pg_cron, history page (P4).
- Polish: "How it works", region pinning for speed, demo scripts, DEMO.md (P5); dashboard redesign (prompt 17); Gemini-first router + Google Calendar links (P5b); this README, disclosure and submission pack (P6).
- The circular texts in `seed/circulars/` and the class/timetable seed data were written in the playbook (by me, with AI help) as realistic demo data — they are not real college notices.

## What I verified by hand
- Read and approved every plan before each slice was built (plan mode), and made every decision asked of me (Supabase project, Vault secret, Vercel access, test-data wipe, prompt logging, Gemini-first switch).
- Set up the Telegram bot and demo group, all API keys and the Supabase Vault secret myself.
- Confirmed on my phone (Telegram demo group):
  - [x] The class message (with Google Calendar links) and a scheduled reminder arrived in the "DulyNoted Demo" Telegram group.
  - [x] Tapping **Add to Google Calendar** in the message opened Google Calendar with the deadline prefilled.

## What was verified automatically (results read during the build)
- Telegram Bot API returned `ok: true` for `sendMessage` and `sendDocument` on a real delivery; pg_cron fired the demo reminder on its own (SCHEDULE step in the run log, `docs/s3-reminder.png`).
- 88 unit tests (`npm test`); the 16-check smoke test (`scripts/smoke.sh`) against localhost and the live Vercel URL; the Playwright demo path (9 screenshots in `docs/demo/`); axe accessibility scans (0 violations); the `FORCE_LLM_FAIL` offline test on a Vercel preview; the workshop run's EXTRACT step showing tier `gemini`; a secret scan of the git history.
- Bugs found by these checks and fixed: Next.js data cache hiding new run steps, the Telegram network-error retry path, a model-label bug (`gpt-oss-120b` shown as 20B), a CSS token mismatch from the UI library.

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

### 11. Problem statement → P2 [12:59 IST]
Answer to "What is the problem statement?": `Open Workflow Automation`. Executed playbook prompt P2 (plus the Evaluation rules in CLAUDE.md):
```
Append this prompt verbatim to PROMPTS.md under "## P2 Slice 1 [HH:MM IST]".
Enter Plan Mode. Read CLAUDE.md, lib/types.ts, agents/graph.md. Use Context7 for openai (custom baseURL), chrono-node and Next.js 14 streaming route handlers if unsure.

Build Slice 1: "Click 'Load sample' → watch 6 pipeline steps light up in the run log → an action card shows what to do, by when, for whom, with a clash warning."

IN SCOPE
- lib/samples.ts: list the 3 seed circulars (id, label, file); render {{D+n}} tokens as DD/MM/YYYY relative to today in Asia/Kolkata.
- lib/llm.ts: router exactly as CLAUDE.md (groq → gemini → cache), timeouts via AbortController, json_object + zod validation + one REPAIR call, returns {data, tier, model, ms}. Cache tier returns null for now if no fixture exists (P3 adds fixtures).
- lib/db.ts: server-only Supabase client with the service-role key.
- lib/pipeline/{ingest,extract,normalize,route,clash,compose,run}.ts — steps 1–6 per agents/graph.md. run.ts is an async generator that yields RunStep events and finally the RunResult; it inserts runs/run_steps rows and sets status 'awaiting_approval'. Extraction prompt: system prompt with the Extraction JSON shape, rules "never invent dates; copy the original wording into deadlineText/dateText; audience years use FE/SE/TE/BE".
- app/api/runs/route.ts: POST FormData (inputType=text, text | sampleId) → Response with a ReadableStream of NDJSON StreamEvent lines (content-type application/x-ndjson), maxDuration 60. Text input only in this slice.
- app/api/runs/[id]/route.ts: GET → ApiEnvelope<RunResult>.
- app/page.tsx + components/: 3-pane layout (stacks on mobile).
  • InputPanel: Tabs "Paste" (Textarea) | "Upload" (disabled, "coming soon"); 3 "Load sample" buttons; "Run automation" button.
  • RunLog (right): vertical stepper; per row icon + StepName + status badge (running = pulsing, ok = green, warn = amber, error = red, skipped = grey) + tier badge (Groq / Gemini / Cache) + ms; click to expand input → output + detail JSON in a monospace block. Rows animate in (150 ms CSS), no server sleeps.
  • ResultPanel: ActionCard per action (what, deadline as "in 3 days · 27 Nov, 11:59 pm", location, required-docs checklist, fee), events list, audience chips with student counts, red ClashBanner listing clashes, DigestPreview (Telegram-style bubble), TimeSaved pill "≈ 19 min of manual work → 12 s" with the formula in a Tooltip. needsReview items get an amber "check date" chip.
  • Disabled "Approve & send" button (P3 enables it).
  • Visual direction: calm "notice-board paper" look — off-white cards, one accent colour, monospace run log, no gradients, no emoji spam. Empty state explains the 3 steps in one line each.
- scripts/smoke.sh BASE_URL: POST sampleId=workshop, read the stream, assert the last line is a result with status awaiting_approval and that a CLASH_CHECK step has status warn; POST sampleId=exam-form and assert ≥ 1 action with a non-null deadline. Print PASS/FAIL per assertion.

OUT OF SCOPE: approve/deliver, Telegram, .ics, PDF/image, history, cron, auth.

DONE ONLY WHEN
[ ] `npm run build` passes
[ ] `bash scripts/smoke.sh http://localhost:3000` → all PASS (paste raw output)
[ ] Playwright MCP: open localhost:3000, click "Load sample: Workshop", click "Run automation", wait for the clash banner, screenshot to docs/s1.png
[ ] redeploy to Vercel and run smoke.sh against the Vercel URL (paste raw output)
Then list files changed, commit "feat(s1): hero pipeline with live run log and clash detection", and stop. Do not start Slice 2.
```

### 12. Vercel auto-deploy [13:12 IST]
```
vercel will redeploy automatically on push to main branch (or pr)
```

### 13. go P3 [13:14 IST]
```
go P3
```
Executed playbook prompt P3 (plus the Evaluation rules in CLAUDE.md):
```
Append this prompt verbatim to PROMPTS.md under "## P3 Slice 2 [HH:MM IST]".
Enter Plan Mode. Read CLAUDE.md, lib/types.ts, agents/graph.md. Use Context7 for `ics` (createEvents + alarms) and the Telegram Bot API (sendMessage HTML, sendDocument multipart) if unsure.

Build Slice 2: "Click 'Approve & send' → DELIVER step runs → the Telegram group receives the digest and a .ics file; tapping the .ics adds deadlines with reminders to the phone calendar. Works even when every LLM is down."

IN SCOPE
- lib/ics.ts: build a calendar from RunResult per agents/graph.md (alarms −1 day and −2 h for deadlines, −1 h for events, TZ Asia/Kolkata).
- app/api/runs/[id]/ics/route.ts: GET → text/calendar, filename dulynoted-<shortid>.ics. Add a "Download .ics" button on the result panel (works before approval).
- lib/telegram.ts: sendMessage (HTML parse_mode, escape user text) and sendDocument. chatId = audiences.telegram_chat_id ?? TELEGRAM_DEMO_CHAT_ID. Group recipients by chatId → one message per chat: header "📌 DulyNoted · <title>", "For: <labels>", digest, clash line for affected labels only, footer "Calendar file attached ⤵".
- lib/pipeline/deliver.ts + app/api/runs/[id]/approve/route.ts: POST → NDJSON stream; emits APPROVE (ok, "approved by staff at HH:MM") then DELIVER; inserts deliveries rows; run status 'delivered'. ?dryRun=1 skips the Telegram call and marks DELIVER 'skipped'. Missing token or Telegram error → DELIVER 'warn' with "Telegram unavailable — .ics ready to download", never a crash.
- UI: enable "Approve & send to N classes"; after delivery show a green "Delivered to N classes · 1 message · 1 calendar file" row with timestamps; the RunLog continues the same run (steps 7–8 appended).
- Offline cache: run each of the 3 samples once with live LLMs, save the Extraction + base digest to seed/fixtures/<sampleId>.json with concrete dates replaced by {{D+n}} tokens (relative to the issue date) so they stay valid on any day. lib/llm.ts cache tier loads and renders them. FORCE_LLM_FAIL=1 makes groq+gemini throw immediately so the cache path is testable.
- smoke.sh: add (a) GET /api/runs/<id>/ics contains BEGIN:VCALENDAR and VALARM, (b) approve with ?dryRun=1 ends with status delivered, (c) with FORCE_LLM_FAIL=1 on a local server the workshop sample still completes and EXTRACT shows tier cache.

OUT OF SCOPE: scheduled reminders, PDF/image, history, auth, editing extracted data.

DONE ONLY WHEN
[ ] `npm run build` passes
[ ] smoke.sh all PASS locally, including the FORCE_LLM_FAIL run (paste raw output)
[ ] One real approve (not dry run) on the workshop sample → Telegram API returns ok:true for both calls (paste the two JSON `ok` fields only)
[ ] Redeploy; smoke.sh PASS against Vercel (paste raw output)
Then list files changed, commit "feat(s2): approval gate, Telegram + .ics delivery, offline cache", and stop.
```

### 14. go P4 [13:24 IST]
```
go P4
```
Executed playbook prompt P4 (plus the Evaluation rules in CLAUDE.md):
```
Append this prompt verbatim to PROMPTS.md under "## P4 Slice 3 [HH:MM IST]".
Enter Plan Mode. Read CLAUDE.md, lib/types.ts, agents/graph.md. Hard time box: 24 minutes. Build the items IN ORDER and stop wherever the box ends; each item must leave the app working. Use Context7 for unpdf, Gemini image input and Supabase pg_cron/pg_net.

1. PDF + image input (10 min)
   - Enable the Upload tab: accept .pdf, .png, .jpg (≤ 4 MB). INGEST: PDF → unpdf extractText (if < 40 chars of text, treat it as scanned and send page 1 as an image instead); image → gemini-3.5-flash-lite OCR via lib/llm.ts ("transcribe exactly, keep line breaks").
   - Generate demo files with Playwright MCP: render seed/circulars/exam-form.txt as a printed A4 notice (serif font, college header, stamp-like "sd/-") → public/samples/exam-form.pdf; render scholarship.txt as a slightly rotated, off-white "phone photo" → public/samples/scholarship.jpg (dates rendered for today). Add both as "Load sample" buttons that upload the file.
2. Scheduled reminder (10 min)
   - On DELIVER, insert reminders rows: for each action deadline, due_at = deadline − 24 h (skip if in the past).
   - "Send a demo reminder in 60 s" button on a delivered run → one reminders row due now + 60 s.
   - app/api/cron/dispatch/route.ts: Bearer CRON_SECRET; sends due unsent reminders via lib/telegram.ts, sets sent_at, appends a SCHEDULE RunStep ("Reminder fired → TE AI&DS A, B") to that run. The result page polls GET /api/runs/[id] every 5 s while any reminder is pending, so the new step appears live.
   - Via Supabase MCP: enable pg_cron + pg_net and schedule a job every minute that POSTs to <VERCEL_URL>/api/cron/dispatch with the bearer header. Ask me to paste CRON_SECRET; do not read .env files.
3. History page (4 min): app/history/page.tsx — table of runs (time, source, status, classes reached, time saved) linking to /?run=<id>, which reloads that run with its full log.

DONE ONLY WHEN (for whatever items you finished)
[ ] `npm run build` passes; smoke.sh still all PASS (paste raw output)
[ ] Item 1: upload sample PDF and JPG → both reach awaiting_approval (paste the final stream line of each)
[ ] Item 2: demo reminder arrives in Telegram within ~2 min; SCHEDULE step visible (screenshot docs/s3-reminder.png)
Redeploy. Commit "feat(s3): pdf/image input, scheduled reminders, history". Then write "SCOPE FROZEN [HH:MM IST]" at the top of CLAUDE.md's Scope section and stop. From now on: fixes, polish and deploy only.
```

### 15. P5 [13:52 IST]
```
P5
```
Executed playbook prompt P5:
```
Append this prompt verbatim to PROMPTS.md under "## P5 Polish [HH:MM IST]".
Scope is FROZEN. Only fixes, states and polish. Read CLAUDE.md first.

1. States: every button has loading/disabled states; empty state on first load; friendly error card for stream errors with a "Retry" and a "Use sample instead" button; amber "needs review" chips; mobile layout check at 390 px.
2. Speed: make sure the workshop sample completes in < 15 s on Vercel; if EXTRACT is slow, lower max_tokens and keep reasoning_effort low.
3. Header: "DulyNoted" + tagline + a small "How it works" popover (the 8 steps, one line each) + link to /history.
4. Demo test: use the demo-tester subagent (or Playwright MCP directly) on the Vercel URL, clicking this exact path and screenshotting each numbered step into docs/demo/:
   (1) open / → (2) click "Load sample: Workshop" → (3) click "Run automation" → (4) wait for CLASH_CHECK amber + red banner → (5) expand the EXTRACT row → (6) click "Approve & send" → (7) wait for DELIVER ok → (8) click "Download .ics" → (9) open /history.
   Report any step slower than 5 s or any console error. Fix only what breaks the path.
5. Force-fail test: set FORCE_LLM_FAIL=1 on a Vercel preview (not production), repeat steps 1–7, confirm tier "cache" shows and nothing crashes. Remove the var afterwards.
6. Write docs/DEMO.md: the 90-second script below, adjusted to the real UI labels.

90-SECOND DEMO SCRIPT
0–10 s  "Every college sends 5–10 circulars a week as WhatsApp forwards and PDFs. Students miss deadlines; staff re-type them into groups." Show the messy workshop circular.
10–30 s Click Load sample → Run automation. Run log fills: INGEST → EXTRACT (Groq) → NORMALIZE ("tomorrow 5 pm" → exact date) → ROUTE (2 classes, 126 students) → CLASH_CHECK turns amber.
30–45 s WOW: red banner — "Workshop clashes with Unit Test 2, TE AI&DS, 10:00". Nobody noticed it on paper.
45–65 s Action card + Telegram preview. Click Approve & send → phone (screen-mirrored) buzzes in the class group with the digest + .ics; tap → deadline lands in the calendar with reminders.
65–80 s Drop the PDF / phone photo of the scholarship notice → same pipeline, all classes FE–BE.
80–90 s Time-saved pill: "≈ 19 min of manual work → 12 s, per circular". "Built entirely from prompts — every one is in PROMPTS.md."

DONE ONLY WHEN: all 9 demo screenshots exist, force-fail test passes, `npm run build` passes, redeployed. Commit "chore: polish, demo test, demo script" and stop.
```

### 16. Vercel access approved [13:59 IST]
```
i've approved
```

### 17. UI/UX dashboard polish [14:01 IST]
```
before that I want you to make the UI/UX better it should feel like a dashboard (single paged tho). Here's suggestion i got from antigravity:
'/home/suyash/Desktop/noteduly gemini suggestions'  make sure u make changes that are compliant with hackatthon guidlines.
```
Attached AI input — UI review generated by Google Antigravity (Gemini), verbatim. Suggestions that would show unverifiable status or claim non-existent features were rejected.
<details><summary>Antigravity suggestions (verbatim)</summary>

```text
  Here is a comprehensive review of DulyNoted, analyzing the UI, visual hierarchy, user journey, and hackathon presentation (evaluated against Hack2Skill
  guidelines).
  ──────
  Executive Summary
  DulyNoted has an exceptional functional core: the 8-step hybrid AI/deterministic pipeline, multi-class timetable clash detection, 1-click approval gate, and sub-4-
  second execution are rock solid.
  However, its visual and submission presentation currently undersells its technical sophistication:

  1. Repository Presentation: README.md is still the boilerplate Next.js starter template.
  2. Demo Screenshot Artifacts: The Playwright demo script (scripts/demo-path.mjs) recently generated unstyled, raw HTML screenshots in docs/demo/ (CSS didn't load
  during capture).
  3. UI Polish & Styling: The dashboard looks like a standard developer prototype (flat borders, plain text boxes, unstyled empty state) rather than a high-end
  enterprise/campus dispatch platform.

  Below are targeted suggestions organized by priority.
  ──────
  1. First Impressions & Repo Presentation (Critical for Judges)
  A. Overhaul README.md Immediately

  The repository's README.md is currently the unedited Next.js create-next-app template. Judges and automated review bots look at the README first.
  • Hero Banner & Tagline: Add an architecture flowchart showing the end-to-end transformation:

    Messy Notice (PDF/Photo/Text) ⟶ AI Extraction + Conflict Check ⟶ 1-Click Telegram \& Calendar Sync

  • Key Differentiators Section: Highlight the hybrid architecture (why AI is used only for unstructured text/vision, while date normalization, routing, and
  timetable clashes use deterministic code for zero-hallucination accuracy).
  • 60-Second Evaluator Guide: Provide a 3-step guide for judges to run the live demo with zero setup.
  • Tech Stack Badges: Next.js 14, Supabase (pg_cron), Groq (gpt-oss-120b), Gemini 1.5/Flash-Lite Vision, Chrono-node, ICS.
  B. Re-run or Fix Demo Screenshots in docs/demo/

  In docs/demo/4-clash.png, Playwright captured the page before Tailwind styles loaded, rendering plain Times New Roman unstyled HTML.

  • In scripts/demo-path.mjs, add await page.waitForLoadState('networkidle') or target localhost:3000 after a build so that the screenshots show the polished CSS
  rather than unstyled HTML.
  ──────
  2. Header & Branding Identity
  • Custom Logo & Identity:
      • Replace the plain text "DulyNoted" with an icon + wordmark (e.g. an academic graduation cap / notice board merged with a notification bell or lightning bolt).
  • Live System Status Chip:
      • In components/SiteHeader.tsx, add a subtle live status indicator:
      │ ● System Operational · Telegram Bot Active · pg_cron Running

      • This immediately signals that this is a connected, production-ready system rather than an offline mock.
  • Subtle Header Depth:
      • Add a subtle backdrop blur (backdrop-blur-md bg-card/80 sticky top-0 z-40) to make the header float cleanly above the workspace.

  ──────
  3. Input Panel & Scenario Selection (components/InputPanel.tsx)

  • Transform Generic Sample Buttons into "Demo Scenarios":
      • Currently, there are 5 uniform outline buttons (Load sample: Workshop, Sample PDF: Exam form, etc.).
      • Upgrade them to badge-accented scenario cards that guide evaluators to the most impressive features:
          • AI Workshop → Tag with ⚡ Timetable Clash Alert
          • Exam Form PDF → Tag with 📑 Multi-action & Checklist
          • Scholarship Photo → Tag with 📷 Vision OCR & Income Eligibility

  • Call-to-Action "Run Automation" Button:
      • Add a subtle shimmer/glow animation on hover, a Zap or Sparkle icon, and a keyboard hint badge (⌘ + Enter / Ctrl + Enter).
  • Drag-and-Drop Area:
      • In the "Upload PDF / photo" tab, add active drag-hover animations (subtle border color pulse) and thumbnail previews of uploaded images/PDFs.
  ──────
  4. Results Panel & Output Presentation (components/ResultPanel.tsx)
  A. Rich Empty State ("Before You Run")

  • When a user first opens the page, the center panel only shows 3 plain bullet points.
  • Suggestion: Replace this with an illustrative empty state or an interactive schematic illustrating the problem:
      • Left: Cluttered, confusing official circular notice.
      • Arrow: Instant extraction & class timetable clash verification.
      • Right: Clean, actionable student calendar event with alarms.

  B. Genuine Telegram Digest Card (components/result/DigestPreview.tsx)
  • Currently, the preview is a plain blue box (bg-[#eef6ff]).
  • Suggestion: Style it as an authentic Telegram channel post:
      • Header: Telegram paper plane icon, channel name (e.g., 🔔 BE AI&DS Announcements), timestamp.
      • Body: Formatted chat bubble with bold headers, bullet items, and emojis.
      • Footer: Read receipts (✓✓) and a 1-click "Copy to Clipboard" button.
      • This makes the end-to-end outcome instantly recognizable to judges.


  C. High-Impact Conflict Intelligence Card (components/result/ClashBanner.tsx)
  • Timetable clash detection is one of the project's most unique technical capabilities.
  • Instead of a standard red warning box, present it as a Split Timetable Comparison:
   Existing Class Timetable                                                        │ Conflicting Circular Event
  ─────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────
   Unit Test 2 — Machine LearningNov 24 · 10:00 AM – 11:30 AM                      │ GenAI Agents WorkshopNov 24 · 10:00 AM – 4:00 PM
  • Add a suggested action pill: Suggested action: Reschedule workshop start or excuse Unit Test attendees.

  D. Interactive Action Items & Checklists (components/result/ActionCard.tsx)

  • Allow the checkboxes under "Checklist" to toggle strike-through formatting on completed docs (e.g., Income Certificate, Marksheet).
  • Use custom shadcn checkboxes with smooth transition states instead of standard browser native inputs.

  E. Celebrate the "Time Saved" Metric (components/result/TimeSavedPill.tsx)

  • The ≈ 19 min of manual work → 4 s is a major hackathon metric.
  • Upgrade it into an ROI badge:
  │ ⚡ 98% Time Saved · 19 min manual routing completed in 3.4s
  │ with a subtle green pulse dot.

  ──────
  5. Run Log Transparency (components/RunLog.tsx)

  The step-by-step transparency log is technically impressive, but visually looks like an unadorned list.

  • Pipeline Timeline Stepper:
      • Connect the steps with a continuous vertical line (border-l-2) so it visually represents a live workflow graph.
  • Hybrid Architecture Tagging:
      • Visually differentiate steps:
          • AI Steps (EXTRACT, COMPOSE): Violet badge [AI · Groq 120B] or [AI · Gemini Vision].
          • Deterministic Code Steps (NORMALIZE_DATES, ROUTE_AUDIENCE, CLASH_CHECK): Emerald badge [Code · Regex/Chrono/SQL].
      • This demonstrates to judges that you used AI thoughtfully rather than as an unreliable black-box for math or dates.
  • JSON Viewer Formatting:
      • Inside the expandable rows, use lightweight syntax-colored JSON formatting rather than monochrome text.

  ──────
  6. History Dashboard (app/history/page.tsx)

  • Top-Level KPI Cards:
      • Above the table, add 4 summary metric tiles:
          1. Total Circulars Processed (e.g., 31)
          2. Students Reached (e.g., 1,200+)
          3. Schedule Clashes Caught (e.g., 6)
          4. Admin Hours Saved (e.g., 9.4 hrs)

  • Table Filters:
      • Add quick filter chips (All, Delivered, Awaiting Approval, Clashes Detected) to quickly show successful runs vs. flagged runs.

  ──────
  7. Micro-Interactions & Polish Details

  1. Confetti / Success Animation on Delivery:
      • When the user clicks "Approve & send" and the run transitions to delivered, trigger a brief, subtle micro-animation or toast (sonner) celebrating successful
      multi-class dispatch.
  2. Keyboard Accessibility Indicator:
      • Provide visual hotkey badges (e.g. [1], [2], [3] next to sample buttons) for rapid keyboard navigation during a live presentation.
  3. Typography & Card Elevation:
      • In app/globals.css, augment flat borders with gentle multi-stage shadows (shadow-sm on cards, shadow-md on hover) to elevate the "notice board" aesthetic
      into a crisp modern SaaS.
```
</details>

### 18. Google sponsorship → P5b Gemini-first retrofit [14:10 IST]
```
actually this hackathon is sponsered by google for developers so we gotta make some changes:
'/home/suyash/Downloads/updated prompts'
```
Executed prompt P5b from the updated playbook (verbatim):
```
Append this prompt verbatim to PROMPTS.md under "## P5b Gemini-first retrofit [HH:MM IST]".
Context: this is a Google for Developers–sponsored hackathon, so Gemini must be the core engine. Scope is frozen: this is a config change and a link helper, NOT a new feature. Hard time box 15 minutes. If anything breaks the demo path and can't be fixed in 5 minutes, `git restore .` and stop.

Read CLAUDE.md, lib/llm.ts, lib/telegram.ts and the ActionCard component first. Use Context7 for @google/genai if you switch SDKs.

1. Router order (lib/llm.ts): text → gemini → groq → cache; image → gemini → cache. Gemini model = gemini-3.5-flash-lite. Gemini timeouts: extract 8 s, compose 5 s, image 12 s. Keep Groq exactly as it is, just second.
   - If @google/genai is quick to adopt (≤ 5 min): call Gemini through it with responseMimeType "application/json" + responseSchema. Otherwise keep the OpenAI-compatible Gemini endpoint and only reorder. Don't change zod validation, the REPAIR step, or the fixture cache.
   - Tier badge labels: "Gemini 3.5 Flash-Lite" / "Groq (fallback)" / "Cache".
2. lib/gcal.ts: googleCalendarUrl(item) → https://calendar.google.com/calendar/render?action=TEMPLATE&text=..&dates=<start>/<end in UTC YYYYMMDDTHHMMSSZ>&details=..&location=..&ctz=Asia/Kolkata (deadline = 30-min block ending at the deadline). Add:
   - an "Add to Google Calendar" button on each ActionCard / event row (opens in a new tab)
   - one "➕ Add to Google Calendar" link per deadline/event in the Telegram message, and append "· summarised by Gemini" to the footer. Disable link previews.
3. Update CLAUDE.md: the LLM router section (Gemini primary, Groq fallback), MUST item 3 (mentions Google Calendar links), WON'T (no Google OAuth / Calendar API writes). Update the AI_DISCLOSURE.md runtime-models line to match.
4. Update the demo script in docs/DEMO.md: "EXTRACT (Gemini, structured output)" and "tap Add to Google Calendar".

DONE ONLY WHEN
[ ] npm run build passes
[ ] smoke.sh all PASS locally AND the workshop run shows EXTRACT tier = gemini (paste the EXTRACT step line)
[ ] the FORCE_LLM_FAIL run still shows tier cache
[ ] a dry-run approve payload contains "calendar.google.com/calendar/render"
[ ] redeployed; smoke.sh PASS on the Vercel URL (paste raw output)
Commit "feat: Gemini as primary engine, Google Calendar links" and stop. Then re-run the P5 demo-tester click path once and replace the screenshots in docs/demo/.
```

### 19. go P6 [14:18 IST]
```
go P6, link judges to AI_DISCLOSURE.md
```
Executed prompt P6 (updated playbook), with PROMPTS.md references pointed at this file per the instruction above:
```
Append this prompt verbatim to PROMPTS.md under "## P6 Submit pack [HH:MM IST]".
No code changes except docs. Read CLAUDE.md, PIVOT.md, agents/graph.md, lib/llm.ts, PROMPTS.md, docs/DEMO.md. Describe the model setup exactly as lib/llm.ts implements it; do not claim anything that isn't in the code. This is a Google for Developers–sponsored event, so make the Gemini/Google usage easy for judges to find.

1. README.md:
   - one-line pitch; a "Built with Google Gemini" line under the title; live URL; 3 screenshots from docs/demo
   - "Where Google tech is used" table: step | Google tech | what it does (e.g. EXTRACT | Gemini 3.5 Flash-Lite, structured JSON output | turns a messy circular into deadlines/audience/events; COMPOSE | Gemini | class digest; image INGEST | Gemini vision, if implemented; DELIVER | Google Calendar links | one-tap add for every deadline)
   - Mermaid flowchart of the 8 steps: mark Gemini steps vs deterministic steps, the approval gate, and the fallback chain Gemini → Groq → cache
   - How it works (8 bullets); setup (git clone, npm i, env var NAMES only with GEMINI_API_KEY first, supabase/schema.sql + seed.sql, npm run dev)
   - rubric-alignment table (INFERRED criteria: problem fit & usefulness | working end-to-end | quality of prompting & AI use | use of Google tech | UX & clarity | creativity | demo), each with the exact screen/file that proves it
   - Fallbacks section (Groq fallback, cache tier, FORCE_LLM_FAIL, Telegram down → .ics download + Google Calendar links still work)
   - links to AI_DISCLOSURE.md and PROMPTS.md
2. AI_DISCLOSURE.md: build tool (Claude Code, prompt-only, PROMPTS.md); runtime models exactly as in lib/llm.ts (Gemini primary, Groq fallback); Google tech used; "What AI generated" and "What I verified by hand", filled in from git log + PROMPTS.md (verified = smoke tests, Playwright demo run, real Telegram send, Google Calendar link opened).
3. docs/SUBMISSION.md:
   - Project name + tagline
   - Short description ≤ 100 words; mention Gemini in the first two sentences
   - Tech used (one line, Google tech first)
   - The impact number: "≈ X min of manual work per circular → Y s", with the formula
   - AI-tool disclosure (3 lines)
   - Demo video script: 2-column table (screen action | voiceover), timed to the required length (default 2 min); show the Gemini tier badge in the run log and the Google Calendar tap on the phone
   - Judge Q&A: the 9 hardest questions with 2-sentence answers:
     "Isn't this just an LLM wrapper?" (4 of 8 steps are deterministic; the clash check uses the real timetable)
     "Why Gemini, and how exactly is it used?" (structured output against a schema; vision if implemented; Flash-Lite keeps a whole college inside the free tier)
     "What if the model invents a date?" (copy-the-original-wording rule + chrono-node + needs-review chips + human approval gate)
     "What happens if Gemini is down or rate-limited?" (Groq fallback, then cached results; shown live in the run log)
     "Why Telegram and not WhatsApp?" (free bot API with no business verification; the WhatsApp Cloud API can replace lib/telegram.ts directly)
     "Why Google Calendar links instead of the Calendar API?" (zero OAuth for students; the API is next once there's college SSO)
     "How does it scale to a whole college?"
     "Privacy?"
     "What would you build next?" (Google Workspace sign-in, Calendar API, Sheets export, Classroom announcements as an input)
4. Checks: repo public; default branch `build` (or ask me to merge to main); no secrets in git history: `git log -p | grep -iE "gsk_|AIza|service_role|bot[0-9]+:"` must print nothing (paste the raw result).
Commit "docs: README, disclosure, submission pack" and push. Stop.
```

### 20. Telegram + UI polish [14:25 IST]
```
Before that make sure you fix:
[screenshot: Telegram group messages] 1. let the for statement be more specific: For: BE AI&DS A, TE AI&DS A, TE AI&DS B
2. what is that .ics file... i don't think that's easy to access for a normal user
[screenshot: dashboard] 3. UI still looks super basic.. make it look like a polished web app
```

### 21. go P7 [14:32 IST]
```
go P7
```
Executed prompt P7 (updated playbook), preceded by the agreed pre-demo test-data wipe:
```
Append this prompt verbatim to PROMPTS.md under "## P7 Final check [HH:MM IST]".
Run each check and report PASS/FAIL with the raw evidence:
1. The Vercel production URL returns 200 (curl -sI).
2. smoke.sh against production: all PASS. The workshop run's EXTRACT step shows tier gemini (paste that line). If it shows groq or cache, report which Gemini error caused it (429 / timeout / auth) from the step detail.
3. Playwright MCP in a fresh context (incognito-equivalent): sample → run → approve (dryRun) works; the "Add to Google Calendar" link's href starts with https://calendar.google.com/calendar/render; screenshot to docs/final.png.
4. Every env var name from .env.example exists in Vercel production, GEMINI_API_KEY included (vercel env ls; names only).
5. The GitHub repo is public; the latest commit is pushed; PROMPTS.md, AI_DISCLOSURE.md and README.md (with the "Where Google tech is used" table) are on the default branch.
6. The pg_cron job exists and its last run succeeded (Supabase MCP: cron.job_run_details, latest 3 rows), if built.
7. Gemini quota: one live run left at least ~10 requests in today's free quota. If a 429 appears, tell me to demo from the sample buttons, which fall back to the cache.
Fix nothing big. For any FAIL, give me a one-line workaround for the demo. Stop.
```

### 22. How it works dialog [14:35 IST]
```
[screenshot: How it works panel overlapped by status chips and KPI tiles] fix "HOw it works" message diaglog in the UT
```

### 23. Approval from history [14:36 IST]
```
[screenshot: history row "Sample photo: Scholarship · Awaiting approval"] and how will the user approve this? if there isn't any mechanism than add it
```

### 24. Manual verification confirmed [14:40 IST]
```
tick both boxes in AI_DISCLOSURE, i've verified them
```
