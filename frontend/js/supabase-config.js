/* ============================================================
   supabase-config.js — Supabase project connection details.
   LEARNING: the anon key is safe to expose in client-side code —
   it's designed to be public. Real access control comes from
   Row Level Security policies on each table, not from hiding
   this key. Never put the service_role key here or anywhere
   client-side — that one bypasses RLS entirely and must stay
   server-side only.
   ============================================================ */

const SUPABASE_URL = "https://rzaqlstmcmmzjdqwzgmz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YXFsc3RtY21tempkcXd6Z216Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MDAxMjIsImV4cCI6MjEwMDE3NjEyMn0.diiocyoRQGiR-mkelpAxwtcA3vQOGQUu-ng29IyUaEc";
