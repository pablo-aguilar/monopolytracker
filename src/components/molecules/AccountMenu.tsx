import React from 'react';
import { FaChevronDown, FaUserCircle } from 'react-icons/fa';
import AccountSettingsModal from '@/components/molecules/AccountSettingsModal';
import { AVATARS } from '@/data/avatars';
import { supabaseAuthService, supabaseAdminService } from '@/services/supabase';
import type { PlayerProfile } from '@/services/contracts/types';

export default function AccountMenu({
  className = '',
  settingsExtra,
}: {
  className?: string;
  /** Shown under Theme on the Settings tab (e.g. GM tools on Play). */
  settingsExtra?: React.ReactNode;
}): JSX.Element {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<PlayerProfile | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  const refresh = React.useCallback(() => {
    void Promise.all([
      supabaseAuthService.getProfile(),
      supabaseAdminService.isCurrentUserAdmin().catch(() => false),
    ]).then(([nextProfile, nextIsAdmin]) => {
      setProfile(nextProfile);
      setIsAdmin(Boolean(nextIsAdmin));
    });
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const emoji = profile ? (AVATARS.find((a) => a.key === profile.avatarKey)?.emoji ?? '🙂') : null;

  return (
    <div data-cmp="m/AccountMenu" className={`inline-flex items-center gap-2 ${className}`.trim()}>
      {isAdmin ? (
        <span
          className="inline-flex items-center rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:border-violet-500/60 dark:bg-violet-900/40 dark:text-violet-200"
          title="Admin mode enabled"
        >
          Admin
        </span>
      ) : null}
      <button
        type="button"
        aria-label="Account and settings"
        aria-haspopup="dialog"
        data-qa="btn-account-menu"
        className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white/90 px-2 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:px-3"
        onClick={() => setModalOpen(true)}
      >
        {emoji ? (
          <span className="text-lg leading-none" aria-hidden>
            {emoji}
          </span>
        ) : (
          <FaUserCircle className="h-5 w-5 shrink-0 text-neutral-600 dark:text-neutral-300" aria-hidden />
        )}
        <FaChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      </button>

      <AccountSettingsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        settingsExtra={settingsExtra}
        onProfileSaved={(p) => {
          setProfile(p);
          refresh();
        }}
      />
    </div>
  );
}
