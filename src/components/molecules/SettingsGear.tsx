import React from 'react';
import { FaCog } from 'react-icons/fa';
import SettingsModal from '@/components/molecules/SettingsModal';

export default function SettingsGear({
  className = '',
  modalContent,
}: {
  className?: string;
  modalContent?: React.ReactNode;
}): JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <div data-cmp="m/SettingsGear" className="contents">
      <button
        type="button"
        aria-label="Settings"
        className={`inline-flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 px-2 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 sm:px-3 ${className}`}
        onClick={() => setOpen(true)}
      >
        <FaCog className="h-4 w-4 shrink-0 text-neutral-700 dark:text-neutral-200" aria-hidden />
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} extraContent={modalContent} />
    </div>
  );
}

