# DulyNoted pipeline (plain function calls, sequential, lib/pipeline/run.ts)
| # | Step | Kind | In → Out | Tier | Failure path (what the user sees) |
|---|---|---|---|---|---|
| 1 | INGEST | det. (+LLM for image) | text/PDF/image → rawText | image: gemini→cache | "Couldn't read this file — paste the text or load a sample" (error) |
| 2 | EXTRACT | LLM | rawText → Extraction (zod) | groq-120b→gemini→cache | all tiers fail + not a sample → error with retry button |
| 2b | REPAIR | LLM | invalid JSON + zod error → Extraction | same | shown only when it fires (it's a feature, not a bug) |
| 3 | NORMALIZE_DATES | det. (chrono-node, ref = issuedOn or today IST) | *Text fields → ISO; past/unparseable → needsReview | — | warn: "1 date needs review" + amber chip on the card |
| 4 | ROUTE_AUDIENCE | det. (audiences table) | Audience → Recipient[] | — | 0 matches → warn, default to "All students" |
| 5 | CLASH_CHECK | det. (SQL overlap, end defaults to start+1h) | events × calendar_events → Clash[] | — | clashes → warn (yellow) + red banner on the card |
| 6 | COMPOSE | LLM (gpt-oss-20b), ONE call | Extraction → base digest ≤ 450 chars | groq-20b→gemini→template | template fallback built from Extraction fields |
| 7 | APPROVE | human gate | — | — | run waits in 'awaiting_approval' |
| 8 | DELIVER | det. | One Telegram message per chat (readable audience, merged clash lines, Google Calendar links) + deliveries rows | — | no token / API fail → warn "Telegram unavailable — use the Google Calendar buttons or .ics instead" |
| 9 | SCHEDULE (S3) | det. + pg_cron | deadlines → reminders rows → /api/cron/dispatch | — | dispatch fail → reminder stays unsent, shown in history |

Routing match: year ∈ years AND (branches empty OR branch alias match: AI&DS = AIDS = "AI & DS" = Artificial Intelligence & Data Science; COMP = CE = Computer; IT) AND (divisions empty OR division ∈ divisions). audience.all → every row.
Digest per recipient group = base digest + "⚠ Clash: <title> at <time>" line only for affected labels.
.ics (optional Apple/Outlook download in the UI, not sent to Telegram): one VEVENT per action deadline (alarms −1 day, −2 h) and per event (alarm −1 h), TZ Asia/Kolkata, UID = runId-index.
Time saved (estimate, formula shown in a tooltip): manualMin = 3 + 2×recipientGroups + 1.5×(actions+events) + 2; autoSec = run duration.
