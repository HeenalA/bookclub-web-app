#!/usr/bin/env bash
# ============================================================================
# verify_anon_lockdown.sh — prove, from outside, that the published anon key
# cannot read anything.
# ============================================================================
# The SQL checks in db/verify_security.sql inspect the database from the
# inside. This script does the thing an actual attacker would do: take the
# anon key out of the public repository and ask the REST API for the data.
#
# Before migration 0005, `curl .../rest/v1/reviews` with this key returned all
# 206 reviews. After it, every table should return either an authorisation
# error or an empty list.
#
# Usage:  bash scripts/verify_anon_lockdown.sh
# ============================================================================
set -uo pipefail

CONFIG="$(dirname "$0")/../frontend/js/config.js"

if [[ ! -f "$CONFIG" ]]; then
  echo "Could not find $CONFIG" >&2
  exit 1
fi

URL=$(grep -oE 'https://[a-z0-9]+\.supabase\.co' "$CONFIG" | head -1)
KEY=$(grep -oE 'eyJ[A-Za-z0-9._-]+' "$CONFIG" | head -1)

if [[ -z "$URL" || -z "$KEY" ]]; then
  echo "Could not read the Supabase URL and anon key out of $CONFIG." >&2
  echo "Fill them in (see docs/RUNBOOK.md) and re-run." >&2
  exit 1
fi

echo "Project:  $URL"
echo "Using the anon key exactly as published in this repo."
echo

TABLES=(members clubs club_members club_join_codes books ratings reviews meetings announcements)
FAILURES=0

for t in "${TABLES[@]}"; do
  body=$(curl -s -m 20 \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    "$URL/rest/v1/$t?select=*&limit=5")
  code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    "$URL/rest/v1/$t?select=*&limit=5")

  # A pass is: an error status, or a 200 with an empty array. A 200 carrying
  # any row at all is a leak.
  if [[ "$code" == "200" && "$body" != "[]" ]]; then
    printf '  %-16s LEAK  (HTTP %s) %s\n' "$t" "$code" "${body:0:120}"
    FAILURES=$((FAILURES + 1))
  else
    printf '  %-16s locked (HTTP %s)\n' "$t" "$code"
  fi
done

echo
echo "Checking that the membership functions refuse anonymous callers..."
for fn in discover_clubs create_club club_join_code; do
  code=$(curl -s -m 20 -o /dev/null -w '%{http_code}' -X POST \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" -d '{}' \
    "$URL/rest/v1/rpc/$fn")
  if [[ "$code" == "200" ]]; then
    printf '  %-20s CALLABLE ANONYMOUSLY (HTTP %s)\n' "$fn" "$code"
    FAILURES=$((FAILURES + 1))
  else
    printf '  %-20s refused (HTTP %s)\n' "$fn" "$code"
  fi
done

echo
if [[ "$FAILURES" -eq 0 ]]; then
  echo "PASS — the anon key cannot read any data or call any function."
else
  echo "FAIL — $FAILURES problem(s) above. Re-run db/migrations/0005_rls.sql."
  exit 1
fi
