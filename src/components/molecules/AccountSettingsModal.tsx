import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaCog } from 'react-icons/fa';
import SlidingSegmentedControl from '@/components/molecules/SlidingSegmentedControl';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import ThemeSettingsSection from '@/components/molecules/ThemeSettingsSection';
import { ProfileEditorFields } from '@/components/molecules/ProfileEditModal';
import type { PlayerProfile } from '@/services/contracts/types';

export type AccountTab = 'profile' | 'settings';

export type AccountSettingsModalProps = {
  open: boolean;
  onClose: () => void;
  /** Host-only: GM tools and other play settings (Settings tab). */
  settingsExtra?: React.ReactNode;
  /** Which tab is selected when `open` becomes true. */
  initialTab?: AccountTab;
  onProfileSaved?: (profile: PlayerProfile) => void;
};

export default function AccountSettingsModal({
  open,
  onClose,
  settingsExtra,
  initialTab = 'profile',
  onProfileSaved,
}: AccountSettingsModalProps): JSX.Element | null {
  const [tab, setTab] = React.useState<AccountTab>(initialTab);

  React.useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const wide = Boolean(settingsExtra);

  const inner = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="account-settings-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-cmp="m/AccountSettingsModal"
          className="fixed inset-0 z-[230] flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Account and settings"
        >
          <div
            className={`w-full rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900 max-h-[90vh] overflow-hidden flex flex-col ${
              wide ? 'max-w-3xl' : 'max-w-lg'
            }`}
          >
            <OverlayHeader title="Account & settings" onClose={onClose} className="mb-3 shrink-0" />

            <div aria-label="Account sections" className="mb-4 shrink-0 flex justify-center sm:justify-start">
              <SlidingSegmentedControl
                className="w-full max-w-md"
                dense
                value={tab}
                onChange={setTab}
                tabIdForValue={(v) => `account-tab-${v}`}
                options={[
                  { value: 'profile', label: <span data-qa="tab-account-profile">Profile</span> },
                  {
                    value: 'settings',
                    label: (
                      <span className="inline-flex items-center justify-center gap-1.5" data-qa="tab-account-settings">
                        <FaCog className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Settings
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === 'profile' ? (
                <div
                  id="account-panel-profile"
                  role="tabpanel"
                  aria-labelledby="account-tab-profile"
                  className="space-y-4"
                >
                  <ProfileEditorFields
                    showHelperText
                    onSaved={(p) => {
                      onProfileSaved?.(p);
                    }}
                  />
                </div>
              ) : (
                <div
                  id="account-panel-settings"
                  role="tabpanel"
                  aria-labelledby="account-tab-settings"
                  className="space-y-4"
                >
                  <ThemeSettingsSection />
                  {settingsExtra ? (
                    <div className="border-t border-neutral-200 pt-4 dark:border-neutral-700">{settingsExtra}</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return inner;
  return createPortal(inner, document.body);
}
