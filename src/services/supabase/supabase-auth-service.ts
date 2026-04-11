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

    const { data: inserted, error: insertError } = await supabase
      .from('profiles')
      .insert(row)
      .select('id, display_name, avatar_key, onboarding_completed')
      .single<DbProfileRow>();

    if (!insertError) {
      return mapDbProfileToDomain(inserted);
    }

    // Row may already exist (e.g. partial state); finish onboarding with an update.
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: row.display_name,
        avatar_key: row.avatar_key,
        onboarding_completed: true,
      })
      .eq('id', user.id)
      .select('id, display_name, avatar_key, onboarding_completed')
      .single<DbProfileRow>();

    if (!updateError && updated) {
      return mapDbProfileToDomain(updated);
    }

    const err = insertError ?? updateError;
    const hint =
      err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string'
        ? (err as { message: string }).message
        : String(err);
    if (/onboarding_completed|schema cache|PGRST204/i.test(hint)) {
      throw new Error(
        `${hint} — Run the SQL migration supabase/migrations/20260412_profile_onboarding.sql in your Supabase project (SQL Editor).`,
      );
    }
    throw new Error(hint || 'Could not save profile.');
  },
};
