#!/usr/bin/env bash
# End-to-end smoke test against a running DulyNoted (local or Vercel).
# Usage: bash scripts/smoke.sh <BASE_URL>
#   SMOKE_EXPECT_CACHE=1  → server runs with FORCE_LLM_FAIL=1; assert the offline cache path instead.
set -u
BASE="${1:-http://localhost:3000}"
BASE="${BASE%/}"
PASS=0
FAIL=0

check() {
  if [ "$2" = "true" ]; then echo "PASS  $1"; PASS=$((PASS + 1)); else echo "FAIL  $1${3:+ — $3}"; FAIL=$((FAIL + 1)); fi
}

run() { curl -sN --max-time 60 -X POST "$BASE/api/runs" -F inputType=text -F "sampleId=$1"; }

# Evaluates a JS expression over the NDJSON stream: R = final result, step(name) = finished step.
judge() {
  node -e '
    let lines = [];
    try { lines = require("fs").readFileSync(0, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch {}
    const last = lines.at(-1) || {};
    const R = last.type === "result" ? last.run : null;
    const steps = lines.filter((e) => e.type === "step").map((e) => e.step).filter((s) => s.status !== "running");
    const step = (n) => steps.find((s) => s.step === n);
    let ok = false;
    try { ok = Boolean(eval(process.argv[1])); } catch {}
    process.stdout.write(String(ok));
  ' "$1"
}

# Evaluates a JS expression over a JSON envelope (J).
envelope() {
  node -e '
    let ok = false;
    try { const J = JSON.parse(require("fs").readFileSync(0, "utf8")); ok = Boolean(eval(process.argv[1])); } catch {}
    process.stdout.write(String(ok));
  ' "$1"
}

echo "Smoke test → $BASE"

if [ "${SMOKE_EXPECT_CACHE:-}" = "1" ]; then
  C=$(run workshop)
  check "cache mode: workshop completes with status awaiting_approval" "$(echo "$C" | judge 'R && R.status === "awaiting_approval"')"
  check "cache mode: EXTRACT tier is cache" "$(echo "$C" | judge 'step("EXTRACT")?.tier === "cache"')"
  check "cache mode: CLASH_CHECK still warns" "$(echo "$C" | judge 'step("CLASH_CHECK")?.status === "warn"')"
  echo "---"
  echo "$PASS passed, $FAIL failed"
  [ "$FAIL" -eq 0 ]
  exit $?
fi

code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/")
check "GET / returns 200" "$([ "$code" = 200 ] && echo true || echo false)" "HTTP $code"

W=$(run workshop)
check "workshop: last line is a result with status awaiting_approval" "$(echo "$W" | judge 'R && R.status === "awaiting_approval"')"
check "workshop: CLASH_CHECK step has status warn" "$(echo "$W" | judge 'step("CLASH_CHECK")?.status === "warn"')"
check "workshop: at least one clash in the result" "$(echo "$W" | judge 'R.clashes.length >= 1')"

E=$(run exam-form)
check "exam-form: ≥ 1 action with a non-null deadline" "$(echo "$E" | judge 'R.extraction.actions.some((a) => a.deadline)')"
check "exam-form: routed to ≥ 1 class" "$(echo "$E" | judge 'R.recipients.length >= 1')"

RID=$(echo "$W" | node -e 'try { const l = require("fs").readFileSync(0, "utf8").trim().split("\n").at(-1); process.stdout.write(JSON.parse(l).run.id); } catch {}')
G=$(curl -s --max-time 20 "$BASE/api/runs/$RID")
check "GET /api/runs/:id returns the run with ≥ 6 steps" "$(echo "$G" | envelope 'J.success && J.data.steps.length >= 6')"

B=$(curl -s --max-time 20 -X POST "$BASE/api/runs" -F inputType=text -F sampleId=../../etc/passwd)
check "rejects an invalid sampleId with an error envelope" "$(echo "$B" | envelope 'J.success === false && Boolean(J.error)')"


ICS=$(curl -s --max-time 20 "$BASE/api/runs/$RID/ics")
check "GET /api/runs/:id/ics is a calendar with alarms" "$(echo "$ICS" | grep -q BEGIN:VCALENDAR && echo "$ICS" | grep -q BEGIN:VALARM && echo true || echo false)"

A=$(curl -sN --max-time 60 -X POST "$BASE/api/runs/$RID/approve?dryRun=1")
check "approve ?dryRun=1 ends with status delivered" "$(echo "$A" | judge 'R && R.status === "delivered" && step("APPROVE")?.status === "ok" && step("DELIVER")?.status === "skipped"')"

A2=$(curl -s --max-time 20 -X POST "$BASE/api/runs/$RID/approve?dryRun=1")
check "second approve is refused (409 envelope, no double send)" "$(echo "$A2" | envelope 'J.success === false && /already/.test(J.error)')"

R1=$(curl -s --max-time 20 -X POST "$BASE/api/runs/$RID/remind-demo")
check "demo reminder refused for a dry-run delivery (409)" "$(echo "$R1" | envelope 'J.success === false && /real delivery/.test(J.error)')"

CR=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$BASE/api/cron/dispatch")
check "cron dispatch without bearer is 401" "$([ "$CR" = 401 ] && echo true || echo false)" "HTTP $CR"

TMPPDF=$(mktemp --suffix=.pdf); trap 'rm -f "$TMPPDF"' EXIT
curl -s --max-time 30 -o "$TMPPDF" "$BASE/api/samples/exam-form.pdf"
check "sample PDF is generated for today (starts with %PDF)" "$(head -c 4 "$TMPPDF" | grep -q '%PDF' && echo true || echo false)"
IMG=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' --max-time 30 "$BASE/api/samples/scholarship.png")
check "sample photo is generated (image/png)" "$([ "$IMG" = '200 image/png' ] && echo true || echo false)" "$IMG"
P=$(curl -sN --max-time 60 -X POST "$BASE/api/runs" -F inputType=pdf -F sampleId=exam-form -F "file=@$TMPPDF;type=application/pdf")
check "upload PDF reaches awaiting_approval" "$(echo "$P" | judge 'R && R.status === "awaiting_approval" && R.inputType === "pdf"')"

F=$(printf 'not a pdf' | curl -s --max-time 20 -X POST "$BASE/api/runs" -F inputType=pdf -F "file=@-;filename=fake.pdf;type=application/pdf")
check "rejects a fake PDF by its magic bytes" "$(echo "$F" | envelope 'J.success === false && /PDF, PNG or JPG/.test(J.error)')"

H=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$BASE/history")
check "GET /history returns 200" "$([ "$H" = 200 ] && echo true || echo false)" "HTTP $H"

echo "---"
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
