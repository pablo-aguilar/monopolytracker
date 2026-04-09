import type { PlayerProfile } from '@/services/contracts/types';

export interface AuthSession {
  userId: string;
  email: string | null;
}

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signInWithMagicLink(email: string, redirectTo?: string): Promise<void>;
  signOut(): Promise<void>;
  ensureProfile(defaultProfile: { displayName: string; avatarKey: string }): Promise<PlayerProfile>;
}
