import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AvatarPicker from '@/components/molecules/AvatarPicker';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import { AVATARS } from '@/data/avatars';
import { supabaseAuthService } from '@/services/supabase';
import type { PlayerProfile } from '@/services/contracts/types';

/** Inline profile form + optional account footer (email, sign out). */
export function ProfileEditorFields({
  onSaved,
  showHelperText,
  showAccountFooter = true,
}: {
  onSaved?: (profile: PlayerProfile) => void;
  showHelperText?: boolean;
  /** When false, omit email/sign-out (e.g. standalone profile-only modal). */
  showAccountFooter?: boolean;
}): JSX.Element {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = React.useState('');
  const [avatarKey, setAvatarKey] = React.useState<string>(AVATARS[0]?.key ?? 'hat');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    void supabaseAuthService.getSession().then((s) => setEmail(s?.email ?? null));
  }, []);

  React.useEffect(() => {
    setError(null);
    setLoadError(null);
    setLoading(true);
    let cancelled = false;
    void supabaseAuthService.getProfile().then((p) => {
      if (cancelled) return;
      if (!p) {
        setLoadError('No profile found. Try signing in again.');
        setLoading(false);
        return;
      }
      setDisplayName(p.displayName);
      setAvatarKey(p.avatarKey);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    const name = displayName.trim();
    if (!name) {
      setError('Please enter a display name.');
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await supabaseAuthService.updateProfile({ displayName: name, avatarKey });
      onSaved?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSignOut(): Promise<void> {
    await supabaseAuthService.signOut();
    navigate('/login');
  }

  return (
    <div data-cmp="m/ProfileEditorFields">
      {showHelperText ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          This name and avatar represent you in lobbies and anywhere your account is shown.
        </p>
      ) : null}
      {loadError ? <p className="mt-3 text-sm text-red-600">{loadError}</p> : null}
      {loading && !loadError ? <p className="mt-4 text-sm text-neutral-500">Loading profile…</p> : null}
      {!loadError && !loading ? (
        <form className="mt-4 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Display name</span>
            <input
              type="text"
              required
              maxLength={48}
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              data-qa="profile-edit-display-name"
            />
          </label>
          <div>
            <div className="mb-2 text-sm font-medium">Avatar</div>
            <AvatarPicker
              options={AVATARS}
              used={new Set()}
              value={avatarKey}
              onChange={setAvatarKey}
              selectedColor="#22c55e"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              data-qa="profile-edit-save"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : null}
      {showAccountFooter && !loadError && !loading ? (
        <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-700">
          {email ? (
            <div className="mb-3 truncate text-xs text-neutral-500 dark:text-neutral-400" title={email}>
              {email}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="text-sm font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export type ProfileEditModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: PlayerProfile) => void;
};

/** Standalone modal (legacy); prefer AccountSettingsModal for app chrome. */
export default function ProfileEditModal({ open, onClose, onSaved }: ProfileEditModalProps): JSX.Element | null {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="profile-edit-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-cmp="m/ProfileEditModal"
          className="fixed inset-0 z-[230] flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Your profile"
        >
          <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <OverlayHeader title="Your profile" onClose={onClose} className="mb-3" />
            <ProfileEditorFields
              showHelperText
              showAccountFooter={false}
              onSaved={(p) => {
                onSaved?.(p);
                onClose();
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
