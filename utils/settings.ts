import { browser } from 'wxt/browser';

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface MdvSettings {
  /** 主题：auto 跟随系统、light 浅色、dark 深色 */
  theme: ThemeMode;
  /** 正文是否居中（false 时全宽） */
  centered: boolean;
  /** 侧边栏目录是否展开 */
  sidebarOpen: boolean;
  /** 实时刷新（文档变更自动重渲染） */
  liveRefresh: boolean;
}

export const DEFAULT_SETTINGS: MdvSettings = {
  theme: 'auto',
  centered: true,
  sidebarOpen: true,
  liveRefresh: false,
};

const STORAGE_KEY = 'mdvSettings';

export function normalizeSettings(value: unknown): MdvSettings {
  const partial = (value ?? {}) as Partial<MdvSettings>;
  const theme: ThemeMode =
    partial.theme === 'light' || partial.theme === 'dark' || partial.theme === 'auto'
      ? partial.theme
      : DEFAULT_SETTINGS.theme;
  return {
    theme,
    centered: typeof partial.centered === 'boolean' ? partial.centered : DEFAULT_SETTINGS.centered,
    sidebarOpen:
      typeof partial.sidebarOpen === 'boolean' ? partial.sidebarOpen : DEFAULT_SETTINGS.sidebarOpen,
    liveRefresh:
      typeof partial.liveRefresh === 'boolean' ? partial.liveRefresh : DEFAULT_SETTINGS.liveRefresh,
  };
}

export async function loadSettings(): Promise<MdvSettings> {
  try {
    const stored = await browser.storage.sync.get(STORAGE_KEY);
    return normalizeSettings(stored?.[STORAGE_KEY]);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(patch: Partial<MdvSettings>): Promise<void> {
  try {
    const current = await loadSettings();
    await browser.storage.sync.set({ [STORAGE_KEY]: { ...current, ...patch } });
  } catch {
    // 存储不可用时仅影响设置持久化，不影响预览功能
  }
}

/** 监听其他标签页/窗口同步过来的设置变化。 */
export function onSettingsChanged(callback: (settings: MdvSettings) => void): () => void {
  const listener = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ): void => {
    if (areaName !== 'sync' || !changes[STORAGE_KEY]) {
      return;
    }
    callback(normalizeSettings(changes[STORAGE_KEY]?.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
