import type { PlayerProfile } from '@/services/contracts/types';

type DbProfileRow = {
  id: string;
  display_name: string;
  avatar_key: string;
  onboarding_completed?: boolean | null;
};

export function mapDbProfileToDomain(row: DbProfileRow): PlayerProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarKey: row.avatar_key,
    onboardingCompleted: Boolean(row.onboarding_completed),
  };
}
