import { createClient } from "@supabase/supabase-js";

// Keys are loaded from environment variables (with project safe fallbacks)
// so the app works reliably in both client-side and TanStack Start SSR environments.
const getEnv = (key: string, fallback: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

export const SUPABASE_URL = getEnv(
  "VITE_SUPABASE_URL",
  "https://vagmohpohbdhtcshushc.supabase.co"
);

export const SUPABASE_ANON_KEY = getEnv(
  "VITE_SUPABASE_ANON_KEY",
  "sb_publishable_bIrEuLN7p3_4Ojv0mAbZyQ_bGlm-6AU"
);

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
