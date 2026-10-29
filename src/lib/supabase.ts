import { createClient } from "@supabase/supabase-js";

// Keys are loaded from environment variables (never hardcode secrets in source code)
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file (local)
// and in Vercel → Project Settings → Environment Variables (production).
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

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
