import type { AdminService, AdminGameRecord, AdminProfileRecord } from '@/services/contracts/admin-service';
import { getSupabaseClient } from '@/lib/supabase';

type DbAdminGameRow = {
  id: string;
  host_profile_id: string;
  status: 'lobby' | 'in_progress' | 'finished';
  invite_code: string;
  started_at: string | null;
  ended_at: string | null;
  winner_profile_id: string | null;
  created_at: string;
  trashed_at: string | null;
  trash_reason: string | null;
};

type DbAdminProfileRow = {
  id: string;
  display_name: string;
  avatar_key: string;
  created_at: string;
  trashed_at: string | null;
  trash_reason: string | null;
};

function mapAdminGame(row: DbAdminGameRow): AdminGameRecord {
  return {
    id: row.id,
    hostProfileId: row.host_profile_id,
    status: row.status,
    inviteCode: row.invite_code,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    winnerProfileId: row.winner_profile_id,
    createdAt: row.created_at,
    trashedAt: row.trashed_at,
    trashReason: row.trash_reason,
  };
}

function mapAdminProfile(row: DbAdminProfileRow): AdminProfileRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarKey: row.avatar_key,
    createdAt: row.created_at,
    trashedAt: row.trashed_at,
    trashReason: row.trash_reason,
  };
}

export const supabaseAdminService: AdminService = {
  async isCurrentUserAdmin(): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('is_current_user_admin');
    if (error) throw error;
    return Boolean(data);
  },

  async listGames(includeTrashed: boolean, limit = 300): Promise<AdminGameRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('admin_list_games', {
      p_include_trashed: includeTrashed,
      p_limit: Math.max(1, Math.min(limit, 1000)),
    });
    if (error) throw error;
    return ((data ?? []) as DbAdminGameRow[]).map(mapAdminGame);
  },

  async listProfiles(includeTrashed: boolean, limit = 300): Promise<AdminProfileRecord[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('admin_list_profiles', {
      p_include_trashed: includeTrashed,
      p_limit: Math.max(1, Math.min(limit, 1000)),
    });
    if (error) throw error;
    return ((data ?? []) as DbAdminProfileRow[]).map(mapAdminProfile);
  },

  async trashGame(gameId: string, reason?: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('admin_trash_game', {
      p_game_id: gameId,
      p_reason: reason ?? null,
    });
    if (error) throw error;
  },

  async restoreGame(gameId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('admin_restore_game', { p_game_id: gameId });
    if (error) throw error;
  },

  async deleteGamePermanently(gameId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('admin_delete_game_permanently', { p_game_id: gameId });
    if (error) throw error;
  },

  async trashProfile(profileId: string, reason?: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('admin_trash_profile', {
      p_profile_id: profileId,
      p_reason: reason ?? null,
    });
    if (error) throw error;
  },

  async restoreProfile(profileId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('admin_restore_profile', { p_profile_id: profileId });
    if (error) throw error;
  },

  async deleteProfilePermanently(profileId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.rpc('admin_delete_profile_permanently', { p_profile_id: profileId });
    if (error) throw error;
  },
};
