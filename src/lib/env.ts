function requiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  return {
    url: requiredEnv('VITE_SUPABASE_URL'),
    anonKey: requiredEnv('VITE_SUPABASE_ANON_KEY'),
  };
}
