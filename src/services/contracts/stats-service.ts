import type { PlayerLifetimeStats } from '@/services/contracts/types';

export interface StatsService {
  getLifetimeStats(profileId: string): Promise<PlayerLifetimeStats | null>;
}
