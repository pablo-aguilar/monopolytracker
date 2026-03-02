import React from 'react';
import { applyThemeMode, getThemeMode, subscribeThemeMode, type ThemeMode } from '@/lib/theme';

export default function ThemeManager(): JSX.Element | null {
  const [mode, setMode] = React.useState<ThemeMode>(() => getThemeMode());

  React.useEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  React.useEffect(() => {
    return subscribeThemeMode(setMode);
  }, []);

  React.useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => applyThemeMode('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  return null;
}

