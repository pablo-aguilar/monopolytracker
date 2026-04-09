import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/env';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;
  const { url, anonKey } = getSupabaseEnv();
  supabaseClient = createClient(url, anonKey);
  return supabaseClient;
}
