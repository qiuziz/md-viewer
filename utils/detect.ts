import { MARKDOWN_EXTENSIONS } from './matches';

const SUPPORTED_PROTOCOLS = new Set(['file:', 'http:', 'https:']);

export interface DetectedSource {
  /** 页面原始文本（浏览器原生纯文本渲染的 <pre> 内容）。 */
  source: string;
  /** 浏览器渲染纯文本用的原生 <pre>，预览挂载后复用它作为「源码视图」。 */
  rawPre: HTMLPreElement;
}

export function hasSupportedProtocol(): boolean {
  return SUPPORTED_PROTOCOLS.has(location.protocol);
}

export function hasMarkdownExtension(rawUrl: string): boolean {
  try {
    const { pathname } = new URL(rawUrl);
    const lower = pathname.toLowerCase();
    return MARKDOWN_EXTENSIONS.some((ext) => lower.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

export function isMarkdownContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes('markdown');
}

/**
 * 浏览器对 text/plain、text/markdown 等文件使用单个 <pre> 渲染，
 * 借此排除「URL 以 .md 结尾但实际返回 HTML」的页面。
 */
function readRawPre(): HTMLPreElement | null {
  const pre = document.body?.querySelector<HTMLPreElement>(':scope > pre');
  if (!pre) {
    return null;
  }
  return (pre.textContent ?? '').trim() === '' ? null : pre;
}

export function hasRawPlainTextSource(): boolean {
  return readRawPre() !== null;
}

/** 判断当前页面是否需要接管为 Markdown 预览，返回原文与原生 <pre>。 */
export function detectMarkdownSource(): DetectedSource | null {
  if (!hasSupportedProtocol()) {
    return null;
  }
  const urlSaysMarkdown = hasMarkdownExtension(location.href);
  const typeSaysMarkdown = isMarkdownContentType(document.contentType || '');
  if (!urlSaysMarkdown && !typeSaysMarkdown) {
    return null;
  }
  const rawPre = readRawPre();
  if (!rawPre) {
    return null;
  }
  return { source: rawPre.textContent ?? '', rawPre };
}

/**
 * 供轻量 detector 使用：URL 没有 markdown 扩展名（渲染器不会被 manifest 匹配注入），
 * 但响应内容类型是 markdown 的页面。
 */
export function isExtensionlessMarkdownPage(): boolean {
  if (!hasSupportedProtocol()) {
    return false;
  }
  if (hasMarkdownExtension(location.href)) {
    return false;
  }
  return isMarkdownContentType(document.contentType || '');
}
