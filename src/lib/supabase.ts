import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://vagmohpohbdhtcshushc.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZ21vaHBvaGJkaHRjc2h1c2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMDE1MDksImV4cCI6MjEwODU3NzUwOX0.N7oLzBfRG2zfbUGUNjhjq762G0xPyuFtiIQVdjd0-40";

// Auth client with user session storage
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Dedicated database client using stable API access for business tables
// (orders, inventory, cashbook, store_info).
// This guarantees that data persistence works consistently whether a user is
// logged in as Admin, Staff, or performing background updates, without being
// blocked by missing authenticated-role RLS policies in Supabase.
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
