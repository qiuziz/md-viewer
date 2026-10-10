/**
 * Markdown 渲染管线（纯函数，无 DOM 依赖，便于脚本冒烟测试）。
 *
 * 语法插件清单（对齐 Markdown Reader）：
 * emoji / 上标 / 下标 / 插入 / 标记 / 缩写 / 脚注 / 定义列表 / 复选框 /
 * 数学公式（KaTeX）/ 流程图与甘特图（mermaid 占位）/ 目录（[[toc]]）/
 * 提醒（> [!NOTE] 与 ::: note 容器）/ 标题锚点。
 */
import { alert } from '@mdit/plugin-alert';
import { katex } from '@mdit/plugin-katex';
import hljs from 'highlight.js/lib/common';
import MarkdownIt from 'markdown-it';
import type { RendererRule, Token } from 'markdown-it';
import abbr from 'markdown-it-abbr';
import anchor from 'markdown-it-anchor';
import container from 'markdown-it-container';
import deflist from 'markdown-it-deflist';
import { full as emoji } from 'markdown-it-emoji';
import footnote from 'markdown-it-footnote';
import ins from 'markdown-it-ins';
import mark from 'markdown-it-mark';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import taskLists from 'markdown-it-task-lists';
import toc from 'markdown-it-toc-done-right';

/** ```mermaid / ```mmd 围栏会被替换为占位节点，由渲染器按需注入 mermaid 后生成图表。 */
export const MERMAID_FENCE_LANGUAGES = new Set(['mermaid', 'mmd']);

/** 支持的 `::: <type>` 容器提醒（`> [!NOTE]` 由 @mdit/plugin-alert 处理）。 */
export const ADMONITION_TYPES = [
  'note',
  'info',
  'tip',
  'success',
  'warning',
  'danger',
] as const;

const ALERT_NAMES = [
  'note',
  'tip',
  'important',
  'warning',
  'caution',
  'info',
  'success',
  'danger',
];

const FRONTMATTER_RE = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export function stripFrontmatter(source: string): string {
  return source.replace(FRONTMATTER_RE, '');
}

/**
 * 标题 slug：保留 CJK 与字母数字，空白转连字符。
 * 必须同时传给 markdown-it-anchor 与 markdown-it-toc-done-right，保证 [[toc]] 链接与标题 id 一致。
 */
export function slugifyHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[\\/#?%*:|"'<>()[\]{}`^~!@$&+,;=.]+/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

function highlightCode(code: string, language: string): string {
  if (language && hljs.getLanguage(language)) {
    try {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      return '';
    }
  }
  // 返回空串时 markdown-it 会自行转义，避免未知语言破坏输出
  return '';
}

const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight: highlightCode,
});

md.use(emoji)
  .use(sup)
  .use(sub)
  .use(ins)
  .use(mark)
  .use(abbr)
  .use(footnote)
  .use(deflist)
  .use(taskLists)
  .use(anchor, {
    slugify: slugifyHeading,
    permalink: anchor.permalink.linkInsideHeader({
      symbol: '#',
      placement: 'before',
      ariaHidden: true,
      class: 'mdv-anchor',
    }),
  })
  .use(toc, {
    slugify: slugifyHeading,
    listType: 'ul',
    containerClass: 'mdv-toc',
    level: 1,
  })
  .use(alert, { deep: true, alertNames: ALERT_NAMES })
  .use(katex, { throwOnError: false, delimiters: 'dollars', mathFence: true });

for (const type of ADMONITION_TYPES) {
  md.use(container, type, {
    validate: (params: string) => params.trim().split(/\s+/)[0] === type,
    render: (tokens: Token[], idx: number) => renderAdmonition(tokens, idx, type),
  });
}

function renderAdmonition(tokens: Token[], idx: number, type: string): string {
  const token = tokens[idx];
  if (!token) {
    return '';
  }
  if (token.nesting === -1) {
    return '</blockquote>\n';
  }
  const title = token.info.trim().slice(type.length).trim();
  const titleHtml = title
    ? `<p class="mdv-admonition-title">${md.utils.escapeHtml(title)}</p>\n`
    : '';
  return `<blockquote class="mdv-admonition mdv-admonition-${type}">\n${titleHtml}`;
}

const defaultFence: RendererRule =
  md.renderer.rules.fence ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token) {
    const language = token.info.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    if (MERMAID_FENCE_LANGUAGES.has(language)) {
      const encoded = encodeURIComponent(token.content);
      return `<div class="mdv-mermaid" data-src="${md.utils.escapeHtml(encoded)}"></div>\n`;
    }
  }
  return defaultFence(tokens, idx, options, env, self);
};

/** 渲染 Markdown 为 HTML（未净化，落 DOM 前必须经 utils/sanitize.ts 处理）。 */
export function renderMarkdown(source: string): string {
  return md.render(stripFrontmatter(source));
}
