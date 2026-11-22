#!/usr/bin/env bash
# End-to-end smoke test against a running DulyNoted (local or Vercel).
# Usage: bash scripts/smoke.sh <BASE_URL>
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

echo "---"
echo "$PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
