#!/usr/bin/env bash
# Pre-flight key check. Loads .env.local into the shell without printing it.
# Prints only OK/FAIL per service, plus Telegram group chat ids.
set -u
cd "$(dirname "$0")/.."
[ -f .env.local ] || { echo "FAIL  .env.local not found"; exit 1; }
set -a; . ./.env.local; set +a

code() { curl -s -o "$TMP" -w '%{http_code}' --max-time 10 "$@"; }
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
report() { if [ "$2" = "200" ]; then echo "OK    $1${3:+  ($3)}"; else echo "FAIL  $1 (HTTP $2)"; fi; }
has() { grep -q "\"$1\"" "$TMP" && echo "$1 listed" || echo "$1 NOT listed"; }

c=$(code -H "Authorization: Bearer ${GROQ_API_KEY:-}" https://api.groq.com/openai/v1/models)
report "Groq" "$c" "$([ "$c" = 200 ] && echo "$(has openai/gpt-oss-120b), $(has openai/gpt-oss-20b)")"

c=$(code -H "Authorization: Bearer ${GEMINI_API_KEY:-}" https://generativelanguage.googleapis.com/v1beta/openai/models)
report "Gemini" "$c" "$([ "$c" = 200 ] && grep -q 'gemini-3.5-flash-lite"' "$TMP" && echo 'gemini-3.5-flash-lite listed' || echo 'gemini-3.5-flash-lite NOT listed')"

c=$(code -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY:-}" -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-}" "${NEXT_PUBLIC_SUPABASE_URL:-http://invalid}/rest/v1/")
report "Supabase" "$c"

c=$(code "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN:-x}/getMe")
report "Telegram" "$c"

c=$(code "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN:-x}/getUpdates")
if [ "$c" = 200 ]; then
  ids=$(node -e '
    const u = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).result || [];
    const s = new Map();
    for (const x of u) { const m = x.message || x.my_chat_member || x.channel_post || x.edited_message;
      const ch = m && m.chat; if (ch && /group/.test(ch.type)) s.set(String(ch.id), ch.title || ""); }
    for (const [id, t] of s) console.log("      group chat id: " + id + "  (" + t + ")");
  ' "$TMP")
  [ -n "$ids" ] && echo "$ids" || echo "      no group chats in getUpdates yet — send a message in the group, then re-run"
fi
