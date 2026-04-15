import React from 'react';
import { getThemeMode, setThemeMode, subscribeThemeMode, type ThemeMode } from '@/lib/theme';

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

/** Theme toggle (System / Light / Dark) for settings surfaces. */
export default function ThemeSettingsSection(): JSX.Element {
  const [mode, setMode] = React.useState<ThemeMode>(() => getThemeMode());

  React.useEffect(() => {
    return subscribeThemeMode(setMode);
  }, []);

  const setAndApply = (m: ThemeMode) => {
    setThemeMode(m);
    setMode(m);
  };

  return (
    <div data-cmp="m/ThemeSettingsSection" className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-subtle">Theme</div>
      <div className="inline-flex items-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-surface-2 p-1">
        <SegmentButton active={mode === 'system'} onClick={() => setAndApply('system')}>
          System
        </SegmentButton>
        <SegmentButton active={mode === 'light'} onClick={() => setAndApply('light')}>
          Light
        </SegmentButton>
        <SegmentButton active={mode === 'dark'} onClick={() => setAndApply('dark')}>
          Dark
        </SegmentButton>
      </div>
      <div className="text-xs text-subtle">System follows your device appearance.</div>
    </div>
  );
}
