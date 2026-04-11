import type { PlayerProfile } from '@/services/contracts/types';

export interface AuthSession {
  userId: string;
  email: string | null;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signInWithMagicLink(email: string, redirectTo?: string): Promise<void>;
  signOut(): Promise<void>;
  /** Load profile row; null if the user has not completed onboarding (no row yet). */
  getProfile(): Promise<PlayerProfile | null>;
  /** First-time profile creation after sign-in (name + avatar). */
  completeOnboarding(input: { displayName: string; avatarKey: string }): Promise<PlayerProfile>;
}
