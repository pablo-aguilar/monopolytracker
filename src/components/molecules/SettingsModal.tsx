import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getThemeMode, setThemeMode, subscribeThemeMode, type ThemeMode } from '@/lib/theme';
import CloseIconButton from '@/components/atoms/CloseIconButton';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}

export default function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const [mode, setMode] = React.useState<ThemeMode>(() => getThemeMode());

  React.useEffect(() => {
    if (!open) return;
    setMode(getThemeMode());
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    return subscribeThemeMode(setMode);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const setAndClose = (m: ThemeMode) => {
    setThemeMode(m);
    setMode(m);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-cmp="m/SettingsModal"
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <div className="w-full max-w-md rounded-xl bg-surface-2 text-fg p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold">Settings</div>
              <CloseIconButton onClick={onClose} />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-subtle">Theme</div>
              <div className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-surface-2 p-1">
                <SegmentButton active={mode === 'system'} onClick={() => setAndClose('system')}>
                  System
                </SegmentButton>
                <SegmentButton active={mode === 'light'} onClick={() => setAndClose('light')}>
                  Light
                </SegmentButton>
                <SegmentButton active={mode === 'dark'} onClick={() => setAndClose('dark')}>
                  Dark
                </SegmentButton>
              </div>
              <div className="text-xs text-subtle">System follows your device appearance.</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

