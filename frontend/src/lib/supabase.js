/* ============================================================================
   supabase.js — the one Supabase client the app shares.
   ============================================================================
   LEARNING: one client, created once, imported everywhere. The client owns the
   session: it keeps the logged-in user's tokens and silently refreshes them
   before they expire. Creating a second client in another file means two
   things racing to refresh the same token, which shows up as intermittent
   random logouts — a genuinely horrible bug to track down.

   On supply chain: the library now comes from npm with an exact version in
   package.json and a cryptographic hash for it in package-lock.json. `npm ci`
   verifies every one of those hashes on install, so a tampered package fails
   the build rather than shipping. That is strictly better than loading it from
   a CDN with an SRI hash, because it covers the whole dependency tree rather
   than just the one file we remembered to pin.
   ============================================================================ */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Rather than crashing with a stack trace when the env vars are missing, the
   app shows a short "here's how to configure me" screen. See routes/Setup. */
export const IS_CONFIGURED = Boolean(
  url && key && url.startsWith("https://") && key.length > 20
);

export const sb = IS_CONFIGURED
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Invite and password-reset links come back with the session in the
        // URL fragment; this picks it up and then cleans the address bar.
        detectSessionInUrl: true,
      },
    })
  : null;
