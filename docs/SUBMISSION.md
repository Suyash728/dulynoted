# DulyNoted — submission pack

## Project name + tagline
**DulyNoted** — Drop any college circular. Every affected class gets the deadline, the checklist and a calendar reminder, automatically.

Live: https://dulynoted.vercel.app · Repo: https://github.com/Suyash728/dulynoted (branch `build`)

## Short description (≤ 100 words)
DulyNoted uses Google Gemini to turn messy college circulars — PDFs, notice-board photos, WhatsApp forwards — into structured deadlines, checklists and audiences. Gemini 3.5 Flash-Lite reads the notice with schema-constrained JSON and vision; deterministic code then resolves exact dates, finds every affected class and flags clashes with their existing timetable. After one staff approval, each class gets one Telegram message naming exactly which divisions it's for, with one-tap Google Calendar links, and pg_cron sends a follow-up reminder a day before the deadline. Every step is visible in a live run log, with automatic fallbacks so it never fails silently.

## Tech used
Google Gemini API (gemini-3.5-flash-lite: structured output + vision) · Google Calendar links · Next.js 14 + TypeScript · Supabase Postgres + pg_cron + Vault · Telegram Bot API · Groq (fallback) · Vercel.

## Impact number
**≈ 19 min of manual work per circular → ~3 s** (workshop sample: 3 class groups, 5 dates/actions; production runs measured at 3–8 s depending on Gemini latency).

Formula (shown in the app's tooltip): `manual minutes = 3 (read) + 2 × class groups + 1.5 × dates/actions + 2 (timetable check)` = 3 + 2×3 + 1.5×5 + 2 ≈ 19 min. It is an estimate of staff re-typing time, not a measured study.

## AI-tool disclosure
1. Built 100% from prompts with Claude Code (Anthropic); every prompt is listed verbatim in [AI_DISCLOSURE.md](../AI_DISCLOSURE.md).
2. Runtime AI: Google Gemini 3.5 Flash-Lite (primary: extraction, message, OCR), Groq gpt-oss (text fallback), cached fixtures (last resort).
3. Dates, routing, clash detection, calendar links and delivery are deterministic code with 88 unit tests; nothing is sent without a human approval.

## Demo video script (2:00)
| Time | Screen action | Voiceover |
|---|---|---|
| 0:00–0:12 | Dashboard at dulynoted.vercel.app; point at the KPI tiles and status chips. | "Colleges send five to ten circulars a week. Staff re-type each one into every class group, and students still miss deadlines." |
| 0:12–0:25 | Press **1** (Workshop circular); the messy notice fills the text box. | "Here's a real-style notice: a mandatory workshop, a Google-form deadline 'tomorrow 5 pm', two divisions." |
| 0:25–0:45 | **Ctrl+Enter**. Run log fills; zoom on **Extract actions & dates — AI · Gemini 3.5 Flash-Lite**, expand it to show the JSON. | "Gemini reads the notice and returns structured JSON against a schema — actions, documents, audience. It copies the date wording; it never invents dates." |
| 0:45–1:00 | Rows **Resolve exact dates · Find affected classes** go green (Code tags). | "Then plain code takes over: 'tomorrow 5 pm' becomes an exact time, and the audience is matched to the real class list — 3 classes, 184 students." |
| 1:00–1:15 | **Check class timetable** turns amber; the clash card shows Unit Test 2 vs the workshop. | "And the part nobody catches on paper: the workshop clashes with Unit Test 2 for two divisions. The message warns only those classes." |
| 1:15–1:35 | Click **Approve & send to 3 classes**; cut to the phone (screen-mirrored): Telegram message arrives; tap **➕ Add to Google Calendar** → Google Calendar opens prefilled. | "One staff click — nothing goes out without it. Every class gets one clear message and one-tap Google Calendar links — no files to download." |
| 1:35–1:50 | Press **5** (phone photo) → run; point at **Read circular — AI · Gemini** (vision) and **6 classes**. | "A phone photo of the notice board works too — Gemini vision reads it, and it reaches all six classes." |
| 1:50–2:00 | Point at **99% time saved · ≈ 19 min → 3 s**, then open **History**. | "About nineteen minutes of manual work per circular, done in seconds — with a full audit trail. That's DulyNoted." |

## Judge Q&A
**1. Isn't this just an LLM wrapper?**
No — four of the eight steps are deterministic code (date resolution, class routing, timetable clash check, delivery), plus a human approval gate. The clash check runs against the real class timetable in Postgres; Gemini only reads language.

**2. Why Gemini, and how exactly is it used?**
Gemini 3.5 Flash-Lite returns schema-constrained JSON (`response_format: json_schema`) for extraction and the class message, and its vision reads phone photos and scanned PDFs. Flash-Lite is fast and inexpensive enough that a whole college's weekly circulars fit comfortably in a small quota (2–3 calls per circular).

**3. What if the model invents a date?**
It is told to copy the original date wording, and code — not the model — turns that wording into a time with chrono-node, relative to the notice's own date. Anything unparseable or in the past gets an amber "check date" chip, and a human approves before anything is sent.

**4. What happens if Gemini is down or rate-limited?**
The router falls back to Groq automatically, and the run log names the reason (e.g. "fallback after gemini: HTTP 429"). If every model is down, the demo scenarios run from cached results, and the message falls back to a template built from the extracted fields.

**5. Why Telegram and not WhatsApp?**
Telegram's bot API is free and needs no business verification, so it works for a class group today. WhatsApp's Cloud API can replace `lib/telegram.ts` directly — the rest of the pipeline doesn't change.

**6. Why Google Calendar links instead of the Calendar API?**
Template links need zero OAuth from students: one tap opens Google Calendar with the deadline prefilled. Writing through the Calendar API is the next step once the college has Google Workspace sign-in.

**7. How does it scale to a whole college?**
Classes and timetables are rows in Postgres, routing is a pure function over them, and messages are grouped per Telegram chat, so adding departments is data, not code. Each circular costs 2–3 model calls and a few seconds, and reminders are dispatched by a database cron job, not a long-running server.

**8. Privacy?**
Only the circular text and class metadata are processed — no student personal data is stored. Keys stay server-side, the database has no public access (RLS with no policies), the cron secret lives in Supabase Vault, and model output is rendered as text, never HTML.

**9. What would you build next?**
Google Workspace sign-in for staff, direct Google Calendar API writes, a Google Sheets export of deadlines, and Google Classroom announcements as an input source. A Marathi/Hindi version of the class message is also planned.
