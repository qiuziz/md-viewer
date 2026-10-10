import type { ThemeMode } from './settings';

export type ResolvedTheme = 'light' | 'dark';

export const THEME_CYCLE: ThemeMode[] = ['auto', 'light', 'dark'];

const darkQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)');

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'auto') {
    return darkQuery().matches ? 'dark' : 'light';
  }
  return mode;
}

/** 应用主题到全局（html[data-mdv-theme]），返回实际生效的明暗值。 */
export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset['mdvTheme'] = resolved;
  return resolved;
}

/** 系统主题变化（auto 模式下使用）。 */
export function onSystemThemeChange(callback: (resolved: ResolvedTheme) => void): () => void {
  const query = darkQuery();
  const listener = (): void => callback(query.matches ? 'dark' : 'light');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  const index = THEME_CYCLE.indexOf(mode);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? 'auto';
}

export const THEME_LABELS: Record<ThemeMode, string> = {
  auto: '跟随系统',
  light: '浅色',
  dark: '深色',
};
