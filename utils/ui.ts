import { browser } from 'wxt/browser';
import type { DetectedSource } from './detect';
import { createLightbox } from './lightbox';
import { createLiveRefresh } from './live';
import { renderMarkdown } from './markdown';
import { hasMermaidBlocks, renderMermaidBlocks } from './mermaid';
import { MSG, type CommandMessage, type MdvCommand } from './messages';
import { createOutline } from './outline';
import { saveSettings, onSettingsChanged, type MdvSettings, type ThemeMode } from './settings';
import {
  applyTheme,
  nextThemeMode,
  onSystemThemeChange,
  resolveTheme,
  THEME_LABELS,
  type ResolvedTheme,
} from './theme';
import { createToast } from './toast';
import baseCss from './styles/base.css?inline';
import codeCss from './styles/code.css?inline';
import katexCss from 'katex/dist/katex.min.css?inline';
import { sanitizeHtml } from './sanitize';

const TOOLBAR_OFFSET = 52;
const NARROW_VIEWPORT_QUERY = '(max-width: 960px)';
const FILE_NAME_FALLBACK = 'Markdown 预览';

const ICONS = {
  outline:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  width:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18"/><path d="m7 8-4 4 4 4"/><path d="m17 8 4 4-4 4"/></svg>',
  refresh:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  themeAuto:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/></svg>',
  themeLight:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  themeDark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>',
  preview:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
} as const;

export interface PreviewApp {
  applySettings(patch: Partial<MdvSettings>, persist?: boolean): void;
  handleCommand(command: MdvCommand, options?: { toast?: boolean }): void;
  updateSource(nextSource: string): void;
  destroy(): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/** decodeURI 在 URL 含非法百分号序列（例如文件名里带 %）时会抛错，这里降级为原串。 */
function safeDecodeUrl(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

function fileNameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split('/').filter(Boolean).pop() ?? '';
    return decodeURIComponent(last) || FILE_NAME_FALLBACK;
  } catch {
    return FILE_NAME_FALLBACK;
  }
}

function themeIcon(mode: ThemeMode): string {
  if (mode === 'light') {
    return ICONS.themeLight;
  }
  if (mode === 'dark') {
    return ICONS.themeDark;
  }
  return ICONS.themeAuto;
}

function isNarrowViewport(): boolean {
  return window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
}

/** 在 markdown 页面上挂载完整预览（工具栏 + 侧边栏目录 + 正文 + 源码视图 + 灯箱）。 */
export function mountPreview(detected: DetectedSource, initial: MdvSettings): PreviewApp {
  let settings: MdvSettings = { ...initial };
  let source = detected.source;
  let view: 'preview' | 'source' = 'preview';
  let resolvedTheme: ResolvedTheme = resolveTheme(initial.theme);

  // 样式只注入 markdown 页面；KaTeX 字体已在构建期内联为 data URI
  const styleElement = document.createElement('style');
  styleElement.textContent = `${katexCss}\n${baseCss}\n${codeCss}`;
  document.head.append(styleElement);
  document.documentElement.classList.add('mdv-page');

  /* ---- DOM 结构 ---- */
  const root = element('div', 'mdv-app');

  const toolbar = element('header', 'mdv-toolbar');
  const toolbarLeft = element('div', 'mdv-toolbar-left');
  const toolbarRight = element('div', 'mdv-toolbar-right');

  const makeButton = (action: string, title: string): HTMLButtonElement => {
    const button = element('button', 'mdv-btn');
    button.type = 'button';
    button.dataset['action'] = action;
    button.title = title;
    button.setAttribute('aria-label', title);
    return button;
  };

  const sidebarToggle = makeButton('side', '目录 (Alt+Shift+B)');
  sidebarToggle.innerHTML = ICONS.outline;
  const centeredToggle = makeButton('centered', '居中/全宽 (Alt+Shift+C)');
  centeredToggle.innerHTML = ICONS.width;
  const refreshToggle = makeButton('refresh', '实时刷新 (Alt+Shift+R)');
  refreshToggle.innerHTML = ICONS.refresh;
  const themeToggle = makeButton('theme', '主题 (Alt+Shift+T)');
  const viewToggle = makeButton('view', '查看源码');
  viewToggle.innerHTML = ICONS.code;

  const fileName = element('span', 'mdv-file-name', fileNameFromUrl(location.href));
  fileName.title = safeDecodeUrl(location.href);

  toolbarLeft.append(sidebarToggle, fileName);
  toolbarRight.append(centeredToggle, refreshToggle, themeToggle, viewToggle);
  toolbar.append(toolbarLeft, toolbarRight);

  const sidebar = element('aside', 'mdv-sidebar');
  sidebar.setAttribute('aria-label', '文档目录');
  const sidebarTitle = element('div', 'mdv-sidebar-title', '目录');
  const outlineList = element('nav', 'mdv-outline');
  sidebar.append(sidebarTitle, outlineList);

  const backdrop = element('div', 'mdv-backdrop');
  const main = element('main', 'mdv-main');
  const content = element('article', 'mdv-content mdv-markdown-body');
  content.innerHTML = sanitizeHtml(renderMarkdown(source));

  // 复用浏览器原生 <pre> 作为「原始内容预览」，不再复制一份文本
  const sourceView = detected.rawPre;
  sourceView.classList.add('mdv-source');
  sourceView.hidden = true;

  main.append(content, sourceView);
  const layout = element('div', 'mdv-layout');
  layout.append(sidebar, backdrop, main);

  const toastHost = element('div', 'mdv-toast-host');
  toastHost.setAttribute('role', 'status');
  const toast = createToast(toastHost);
  const lightbox = createLightbox();

  root.append(toolbar, layout, toastHost, lightbox.element);
  document.body.replaceChildren(root);

  /* ---- 状态与联动 ---- */
  const outline = createOutline({
    content,
    list: outlineList,
    toolbarOffset: TOOLBAR_OFFSET,
    onNavigate: () => {
      if (isNarrowViewport()) {
        applySettings({ sidebarOpen: false });
      }
    },
  });
  const live = createLiveRefresh({
    getSource: () => source,
    onUpdate: (next) => updateSource(next),
    onStopped: (reason) => {
      toast(reason, 4200);
      applySettings({ liveRefresh: false }, true);
    },
  });

  function decorateContent(container: HTMLElement): void {
    for (const anchor of container.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const href = anchor.getAttribute('href') ?? '';
      if (/^https?:/i.test(href)) {
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
    }
    for (const image of container.querySelectorAll<HTMLImageElement>('img')) {
      image.classList.toggle('mdv-zoomable', image.closest('a') === null);
    }
  }

  function syncUi(): void {
    root.dataset['sidebar'] = settings.sidebarOpen ? 'open' : 'closed';
    sidebarToggle.setAttribute('aria-pressed', String(settings.sidebarOpen));

    root.dataset['width'] = settings.centered ? 'centered' : 'full';
    centeredToggle.setAttribute('aria-pressed', String(settings.centered));

    resolvedTheme = applyTheme(settings.theme);
    themeToggle.innerHTML = themeIcon(settings.theme);
    themeToggle.title = `主题：${THEME_LABELS[settings.theme]} (Alt+Shift+T)`;
    themeToggle.setAttribute('aria-label', themeToggle.title);

    refreshToggle.setAttribute('aria-pressed', String(settings.liveRefresh));
    refreshToggle.title = settings.liveRefresh
      ? '实时刷新：已开启 (Alt+Shift+R)'
      : '实时刷新：已关闭 (Alt+Shift+R)';
  }

  function applySettings(patch: Partial<MdvSettings>, persist = false): void {
    const previous = settings;
    settings = { ...settings, ...patch };
    syncUi();
    if (previous.liveRefresh !== settings.liveRefresh) {
      live.setEnabled(settings.liveRefresh);
    }
    if (previous.theme !== settings.theme) {
      // 图表配色跟随主题，仅重渲染 mermaid，避免整页重排
      void renderMermaidBlocks(content, resolvedTheme, { force: true });
    }
    if (persist) {
      void saveSettings(patch);
    }
  }

  function setView(next: 'preview' | 'source'): void {
    view = next;
    const sourceVisible = next === 'source';
    content.hidden = sourceVisible;
    sourceView.hidden = !sourceVisible;
    viewToggle.innerHTML = sourceVisible ? ICONS.preview : ICONS.code;
    viewToggle.title = sourceVisible ? '查看预览' : '查看源码';
  }

  function updateSource(next: string): void {
    if (next === source) {
      return;
    }
    source = next;
    const documentElement = document.documentElement;
    const ratio =
      documentElement.scrollHeight > 0 ? window.scrollY / documentElement.scrollHeight : 0;
    content.innerHTML = sanitizeHtml(renderMarkdown(source));
    decorateContent(content);
    sourceView.textContent = source;
    outline.rebuild();
    void renderMermaidBlocks(content, resolvedTheme);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, Math.round(ratio * documentElement.scrollHeight));
    });
    toast('文档已更新');
  }

  function handleCommand(command: MdvCommand, options: { toast?: boolean } = {}): void {
    switch (command) {
      case 'toggleSide':
        applySettings({ sidebarOpen: root.dataset['sidebar'] !== 'open' }, true);
        break;
      case 'toggleCentered':
        applySettings({ centered: root.dataset['width'] !== 'centered' }, true);
        break;
      case 'toggleRefresh': {
        const enabled = !settings.liveRefresh;
        applySettings({ liveRefresh: enabled }, true);
        if (options.toast) {
          toast(enabled ? '实时刷新已开启' : '实时刷新已关闭');
        }
        break;
      }
      case 'toggleTheme': {
        const mode = nextThemeMode(settings.theme);
        applySettings({ theme: mode }, true);
        if (options.toast) {
          toast(`主题：${THEME_LABELS[mode]}`);
        }
        break;
      }
      case 'toggleView':
        setView(view === 'preview' ? 'source' : 'preview');
        break;
    }
  }

  /* ---- 事件绑定 ---- */
  toolbar.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const action = (target.closest('button') as HTMLButtonElement | null)?.dataset['action'];
    switch (action) {
      case 'side':
        applySettings({ sidebarOpen: !settings.sidebarOpen }, true);
        break;
      case 'centered':
        applySettings({ centered: !settings.centered }, true);
        break;
      case 'refresh':
        handleCommand('toggleRefresh');
        break;
      case 'theme':
        handleCommand('toggleTheme');
        break;
      case 'view':
        setView(view === 'preview' ? 'source' : 'preview');
        break;
      default:
        break;
    }
  });

  backdrop.addEventListener('click', () => applySettings({ sidebarOpen: false }));

  content.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const image = target.closest('img');
    if (!image || image.closest('a')) {
      return;
    }
    lightbox.open(image.currentSrc || image.getAttribute('src') || '', image.alt);
  });

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') {
      return;
    }
    if (isNarrowViewport() && root.dataset['sidebar'] === 'open') {
      applySettings({ sidebarOpen: false });
    }
  };
  document.addEventListener('keydown', onKeyDown);

  const onMessage = (message: unknown): void => {
    const candidate = message as Partial<CommandMessage> | undefined;
    if (candidate?.type !== MSG.command || typeof candidate.command !== 'string') {
      return;
    }
    // 快捷键触发时给出轻提示，鼠标点击按钮则不打扰（按钮状态本身可见）
    handleCommand(candidate.command as MdvCommand, { toast: true });
  };
  browser.runtime.onMessage.addListener(onMessage);

  const unsubscribeSettings = onSettingsChanged((next) => applySettings(next));
  const unsubscribeSystemTheme = onSystemThemeChange(() => {
    if (settings.theme !== 'auto') {
      return;
    }
    syncUi();
    void renderMermaidBlocks(content, resolvedTheme, { force: true });
  });

  /* ---- 初始化 ---- */
  syncUi();
  decorateContent(content);
  outline.rebuild();
  live.setEnabled(settings.liveRefresh);
  setView('preview');
  if (hasMermaidBlocks(content)) {
    void renderMermaidBlocks(content, resolvedTheme);
  }

  return {
    applySettings,
    handleCommand,
    updateSource,
    destroy() {
      live.destroy();
      outline.destroy();
      unsubscribeSettings();
      unsubscribeSystemTheme();
      browser.runtime.onMessage.removeListener(onMessage);
      document.removeEventListener('keydown', onKeyDown);
      lightbox.close();
      styleElement.remove();
      document.documentElement.classList.remove('mdv-page');
    },
  };
}
