import type { AuthService, AuthSession } from '@/services/contracts/auth-service';
import type { PlayerProfile } from '@/services/contracts/types';
import { getSupabaseClient } from '@/lib/supabase';
import { mapDbProfileToDomain } from '@/services/mappers/profile-mapper';

type DbProfileRow = {
  id: string;
  display_name: string;
  avatar_key: string;
  onboarding_completed: boolean | null;
};

export const supabaseAuthService: AuthService = {
  async getSession(): Promise<AuthSession | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = data.session;
    if (!session) return null;
    return {
      userId: session.user.id,
      email: session.user.email ?? null,
    };
  },

  async signInWithMagicLink(email: string, redirectTo?: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  },

  async signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getProfile(): Promise<PlayerProfile | null> {
    const supabase = getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const user = authData.user;
    if (!user) return null;

    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_key, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle<DbProfileRow>();
    if (existingError) throw existingError;
    if (!existing) return null;
    return mapDbProfileToDomain(existing);
  },

  async completeOnboarding(input: { displayName: string; avatarKey: string }): Promise<PlayerProfile> {
    const supabase = getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error('No authenticated user found.');

    const displayName = input.displayName.trim();
    if (!displayName) throw new Error('Display name is required.');

    const row = {
      id: user.id,
      display_name: displayName.slice(0, 48),
      avatar_key: input.avatarKey,
      onboarding_completed: true,
    };
    const { data: upserted, error: upsertError } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' })
      .select('id, display_name, avatar_key, onboarding_completed')
      .single<DbProfileRow>();
    if (upsertError) throw upsertError;
    return mapDbProfileToDomain(upserted);
  },
};
