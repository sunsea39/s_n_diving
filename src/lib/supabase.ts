import { createClient } from '@supabase/supabase-js';

// Accept the "API URL" form (…/rest/v1/) too; supabase-js needs the bare project URL.
const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;
export const isSupabaseConfigured = Boolean(supabase);

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase が未設定です。');
  return supabase;
}
