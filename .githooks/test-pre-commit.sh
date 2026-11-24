#!/bin/bash
# Exercise the hook's two detection rules against known-good and known-bad input.
secret_pattern='[A-Za-z_]*(api[_-]?key|secret|passwd|password|access[_-]?token|auth[_-]?token|private[_-]?key)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9_./+=-]{8,}["'"'"']'

check() {
  local label="$1" expect="$2" line="$3"
  if echo "$line" | grep -viE 'your[_-]|placeholder|example|changeme|xxxx|<[a-z-]+>|\.\.\.' | grep -qiE "$secret_pattern"; then
    got=BLOCK
  else
    got=ALLOW
  fi
  [ "$got" = "$expect" ] && echo "  pass  [$got] $label" || echo "  FAIL  expected $expect got $got — $label"
}

echo "Rule 2 — hardcoded secret literals:"
check "updatePassword = useCallback(...)"  ALLOW '+  const updatePassword = useCallback(async (password) => {'
check "setPassword(e.target.value)"        ALLOW '+              onChange={(e) => setPassword(e.target.value)}'
check "autoComplete new-password"          ALLOW '+        autoComplete="new-password"'
check "MIN_PASSWORD_LENGTH = 10"           ALLOW '+const MIN_PASSWORD_LENGTH = 10;'
check "type=password field"                ALLOW '+        <Field label="Password" type="password" />'
check "real hardcoded password"            BLOCK '+const db_password = "sup3rsecret99";'
check "real api key"                       BLOCK '+  apiKey: "a1b2c3d4e5f6g7h8",'
check "private_key assignment"             BLOCK "+private_key = 'MIIEvQIBADANBg'"
check "placeholder is allowed"             ALLOW '+SUPABASE_KEY=your_supabase_anon_key'

echo
echo "Rule 3 — service_role JWT detection (decodes the payload):"
decode_role() {
  payload=$(echo "$1" | cut -d. -f2)
  b64=$(echo "$payload" | tr '_-' '/+')
  case $(( ${#b64} % 4 )) in 2) b64="${b64}==";; 3) b64="${b64}=";; esac
  echo "$b64" | base64 -d 2>/dev/null
}
hdr=$(printf '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-')
anon_body=$(printf '{"iss":"supabase","ref":"abc","role":"anon"}' | base64 | tr -d '=' | tr '/+' '_-')
svc_body=$(printf '{"iss":"supabase","ref":"abc","role":"service_role"}' | base64 | tr -d '=' | tr '/+' '_-')

for pair in "anon:ALLOW:$hdr.$anon_body.sig" "service_role:BLOCK:$hdr.$svc_body.sig"; do
  name=${pair%%:*}; rest=${pair#*:}; expect=${rest%%:*}; jwt=${rest#*:}
  if decode_role "$jwt" | grep -q 'service_role'; then got=BLOCK; else got=ALLOW; fi
  [ "$got" = "$expect" ] && echo "  pass  [$got] $name key" || echo "  FAIL  expected $expect got $got — $name key"
done

echo
echo "Rule 4 — email addresses (this repo is public):"
email_check() {
  local label="$1" expect="$2" line="$3"
  got=ALLOW
  if echo "$line" | grep -oiE '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' \
     | grep -viE '@(example\.(com|org|net|edu)|email\.com|test\.com|localhost|sentry\.io)$' \
     | grep -viE '^(you|your|user|name|someone|admin|noreply|no-reply|test|email)@' \
     | grep -q .; then got=BLOCK; fi
  [ "$got" = "$expect" ] && echo "  pass  [$got] $label" || echo "  FAIL  expected $expect got $got — $label"
}
email_check "real gmail address in a comment"  BLOCK "+-- Turns 'Heenal.Amin+books@gmail.com' into a slug"
email_check "real address in SQL"              BLOCK "+update members set email = 'someone.real@outlook.com';"
email_check "example.com is fine"              ALLOW "+-- Turns 'Sam.Okafor+books@example.com' into a slug"
email_check "mockup @email.com is fine"        ALLOW '+  <p>maya@email.com · requested 2 days ago</p>'
email_check "you@ placeholder is fine"         ALLOW "+VITE_SUPABASE_URL=you@example.com"
email_check "no email at all"                  ALLOW "+const updatePassword = useCallback(async (password) => {"
