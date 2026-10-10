import type { ResolvedTheme } from './theme';
import { sanitizeSvg } from './sanitize';
import { MSG } from './messages';
import { browser } from 'wxt/browser';

type MermaidRenderer = (code: string, theme: ResolvedTheme) => Promise<string>;

type MermaidGlobal = typeof globalThis & { __mdvRenderMermaid?: MermaidRenderer };

const mdvGlobal = globalThis as MermaidGlobal;

let injectionPromise: Promise<boolean> | null = null;

/** mermaid 体积较大，只有文档里出现图表围栏时才让 SW 注入渲染脚本（同一 isolated world）。 */
async function ensureRenderer(): Promise<boolean> {
  if (typeof mdvGlobal.__mdvRenderMermaid === 'function') {
    return true;
  }
  injectionPromise ??= (async () => {
    try {
      await browser.runtime.sendMessage({ type: MSG.requestMermaid });
    } catch {
      // 下面统一按注入失败处理
    }
    return typeof mdvGlobal.__mdvRenderMermaid === 'function';
  })();
  const ok = await injectionPromise;
  if (!ok) {
    injectionPromise = null; // 允许后续重试
  }
  return ok;
}

export function hasMermaidBlocks(root: ParentNode): boolean {
  return root.querySelector('.mdv-mermaid[data-src]') !== null;
}

/** 渲染（或按主题重渲染）文档中的 mermaid 占位块，失败时降级展示源码。 */
export async function renderMermaidBlocks(
  root: ParentNode,
  theme: ResolvedTheme,
  options: { force?: boolean } = {},
): Promise<void> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('.mdv-mermaid[data-src]'));
  if (blocks.length === 0) {
    return;
  }
  const pending = blocks.filter(
    (block) => options.force === true || block.dataset['renderedTheme'] !== theme,
  );
  if (pending.length === 0) {
    return;
  }

  const ok = await ensureRenderer();
  const render = mdvGlobal.__mdvRenderMermaid;
  if (!ok || typeof render !== 'function') {
    for (const block of pending) {
      showFallback(block, '图表渲染脚本加载失败');
    }
    return;
  }

  for (const block of pending) {
    const code = decodeURIComponent(block.dataset['src'] ?? '');
    try {
      const svg = await render(code, theme);
      block.innerHTML = sanitizeSvg(svg);
      block.dataset['renderedTheme'] = theme;
      block.classList.remove('is-fallback');
    } catch (error) {
      showFallback(block, error instanceof Error ? error.message : String(error));
    }
  }
}

function showFallback(block: HTMLElement, reason: string): void {
  const code = decodeURIComponent(block.dataset['src'] ?? '');
  block.classList.add('is-fallback');
  const note = document.createElement('p');
  note.className = 'mdv-mermaid-error';
  note.textContent = `图表渲染失败：${reason}`;
  const pre = document.createElement('pre');
  const codeElement = document.createElement('code');
  codeElement.textContent = code;
  pre.append(codeElement);
  block.replaceChildren(note, pre);
}
