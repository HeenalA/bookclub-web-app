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
