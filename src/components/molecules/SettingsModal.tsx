import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import ThemeSettingsSection from '@/components/molecules/ThemeSettingsSection';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  extraContent?: React.ReactNode;
}

/** @deprecated Prefer AccountSettingsModal; kept for direct use if needed. */
export default function SettingsModal({ open, onClose, extraContent }: SettingsModalProps): JSX.Element | null {
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="settings-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-cmp="m/SettingsModal"
          className="fixed inset-0 z-[220] flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <div
            className={`w-full rounded-xl bg-surface-2 text-fg p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700 max-h-[85vh] overflow-y-auto ${
              extraContent ? 'max-w-3xl' : 'max-w-md'
            }`}
          >
            <OverlayHeader title="Settings" onClose={onClose} className="mb-3" />
            <ThemeSettingsSection />
            {extraContent ? (
              <div className="mt-4 border-t border-neutral-200 dark:border-neutral-700 pt-4">{extraContent}</div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}
