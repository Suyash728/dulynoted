# DulyNoted — 90-second demo

Live: https://dulynoted.vercel.app · Phone: Telegram group **DulyNoted Demo**, screen-mirrored.

## Before going on stage (5 min)
1. Demo on a different day than the seed? Run `npm run demo-files` (re-dates the sample PDF/photo) and re-run `supabase/seed.sql` for `calendar_events` (Unit Test 2 must be at D+2 10:00 for the clash).
2. Open https://dulynoted.vercel.app once (warms the functions). Open the Telegram group on the phone.
3. Backup: screen recording of this exact path on the laptop + phone. If the Wi-Fi dies, play it.
4. If Gemini is rate-limited, the run log shows **Groq (fallback)** and names the reason; if both are down, samples still run from **Cache**. Say so; it's a feature.

## Script

| Time | Screen action (exact UI labels) | Say |
|---|---|---|
| 0–10 s | Dashboard. Click the **Workshop circular** scenario (or press **1**) — the messy circular appears in the text box. | "Every college sends 5–10 circulars a week as WhatsApp forwards and PDFs. Students miss deadlines; staff re-type them into class groups by hand." |
| 10–30 s | Click **Run automation** (or **Ctrl+Enter**). Point at the **Run log** as rows turn green: *Read circular → Extract actions & dates (**AI · Gemini 3.5 Flash-Lite**, structured output) → Resolve exact dates → Find affected classes*. | "Gemini only reads the notice — it returns structured JSON against a schema. Code resolves 'tomorrow 5 pm' to an exact time, then matches it to the real class list — 3 classes, 184 students." |
| 30–45 s | **Check class timetable** turns amber; the red **Timetable clashes detected** banner appears. | "Wow moment: the workshop clashes with Unit Test 2 for TE AI&DS A and B at 10 am. Nobody noticed on paper — the timetable check is plain code against the real calendar." |
| 45–65 s | Show the **To do** card and **Class message preview** (clash line only for affected classes). Click **Approve & send to 3 classes**. Phone buzzes: digest + `.ics`. Tap **➕ Add to Google Calendar** in the message → the deadline opens prefilled in Google Calendar (or tap the `.ics` for reminders). | "One staff click — nothing is sent without it. Every class gets the message and a calendar file with reminders a day and two hours before each deadline." |
| 65–80 s | Click **Scholarship · phone photo** (or press **5**) → **Run automation**. Log shows **Read circular** tagged *AI · Gemini 3.5 Flash-Lite* (vision OCR) → routes to **6 classes** (FE–BE). Optionally click **Send a demo reminder in 60 s** on the first run — the cron job posts it and a **Scheduled reminder** row appears. | "Same pipeline for a phone photo of a notice board — OCR, then all six classes. And it keeps working after the click: scheduled reminders fire on their own." |
| 80–90 s | Point at the green badge **99% time saved · ≈ 19 min manual → 3 s**; hover for the formula. Point at the KPI tiles, then click **History**. | "About 19 minutes of manual work per circular, done in seconds. Built entirely from prompts — every one is listed in AI_DISCLOSURE.md." |

## Fallback lines for questions
- *"What if the model invents a date?"* — It can't: dates come only from the notice's own wording, parsed by code; anything unclear gets an amber **check date** chip, and a human approves before anything is sent.
- *"What if Telegram is down?"* — **Deliver to classes** turns amber, the run stays approvable, and **Download .ics** still works.
