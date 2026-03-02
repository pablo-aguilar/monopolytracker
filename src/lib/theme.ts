export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'monopolytracker:themeMode';
const EVENT_NAME = 'monopolytracker:themeMode';

function isThemeMode(v: unknown): v is ThemeMode {
  return v === 'system' || v === 'light' || v === 'dark';
}

export function getThemeMode(): ThemeMode {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function computeIsDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

export function applyThemeMode(mode: ThemeMode): void {
  const isDark = computeIsDark(mode);
  document.documentElement.classList.toggle('dark', isDark);
  // Helps form controls + UA styling match the chosen theme.
  document.documentElement.style.colorScheme = mode === 'system' ? 'light dark' : mode;
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  applyThemeMode(mode);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mode }));
}

export function subscribeThemeMode(cb: (mode: ThemeMode) => void): () => void {
  const onCustom = (e: Event) => {
    const ce = e as CustomEvent<unknown>;
    if (isThemeMode(ce.detail)) cb(ce.detail);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    if (isThemeMode(e.newValue)) cb(e.newValue);
    else cb('system');
  };

  window.addEventListener(EVENT_NAME, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

