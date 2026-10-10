/**
 * 支持预览的扩展名（不含点号，大小写不敏感）。
 * 与 manifest content_scripts 的匹配模式（utils/matches.ts）保持一致。
 */
export const MARKDOWN_EXTENSIONS = [
  'md',
  'markdown',
  'mdown',
  'mkdn',
  'mkd',
  'mdwn',
  'mdtxt',
  'mdtext',
  'mdx',
  'txt',
] as const;

/**
 * 生成渲染器 content script 的 URL 匹配模式。
 * 匹配模式对路径大小写敏感，且带 query 的地址需要单独的 `?*` 变体，因此逐个扩展名展开。
 */
export function getMarkdownMatchPatterns(): string[] {
  const patterns: string[] = [];
  for (const ext of MARKDOWN_EXTENSIONS) {
    for (const name of [ext, ext.toUpperCase()]) {
      patterns.push(
        `*://*/*.${name}`,
        `*://*/*.${name}?*`,
        `file://*/*.${name}`,
        `file://*/*.${name}?*`,
      );
    }
  }
  return patterns;
}
