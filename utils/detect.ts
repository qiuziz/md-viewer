const MARKDOWN_PATH_EXTENSIONS = ['.md', '.markdown'];

export function isMarkdownUrl(rawUrl: string): boolean {
  try {
    const { pathname } = new URL(rawUrl);
    const lower = pathname.toLowerCase();
    return MARKDOWN_PATH_EXTENSIONS.some((ext) => lower.endsWith(ext));
  } catch {
    return false;
  }
}

export function isMarkdownContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes('markdown');
}

/**
 * 从纯文本渲染页提取原文。
 * Chrome / Edge / Firefox 会将 text/plain、text/markdown 文件渲染为 body 下的单个 <pre>。
 */
function readPlainTextSource(): string | null {
  const pre = document.body?.querySelector(':scope > pre');
  if (!pre) {
    return null;
  }
  const text = pre.textContent ?? '';
  return text.trim() === '' ? null : text;
}

export function detectMarkdownPage(): string | null {
  const urlSaysMarkdown = isMarkdownUrl(location.href);
  const typeSaysMarkdown = isMarkdownContentType(document.contentType || '');
  if (!urlSaysMarkdown && !typeSaysMarkdown) {
    return null;
  }
  // 必须是浏览器原生纯文本渲染页（单个 <pre>），避免接管返回 HTML 的同名地址
  return readPlainTextSource();
}
