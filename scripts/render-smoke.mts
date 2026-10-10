/**
 * 渲染冒烟测试：用 samples/demo.md 覆盖全部语法插件，断言渲染产物关键标记。
 * 运行：npm run smoke
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderMarkdown } from '../utils/markdown.ts';

const here = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(here, '../samples/demo.md');
const source = readFileSync(samplePath, 'utf8');
const html = renderMarkdown(source);

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

const checks: Check[] = [];
const expectContains = (name: string, needle: string): void => {
  checks.push({
    name,
    ok: html.includes(needle),
    detail: html.includes(needle) ? undefined : `缺少片段: ${needle}`,
  });
};
const expectCount = (name: string, needle: string, count: number): void => {
  const found = html.split(needle).length - 1;
  checks.push({
    name,
    ok: found === count,
    detail: found === count ? undefined : `期望 ${count} 个 "${needle}"，实际 ${found} 个`,
  });
};

// 基础与扩展语法
expectContains('标题 id（CJK 友好 slug）', 'id="md-viewer-语法示例"');
expectContains('标题锚点链接', 'class="mdv-anchor"');
expectContains('emoji', '✨');
expectContains('上标', '<sup>2</sup>');
expectContains('下标', '<sub>2</sub>');
expectContains('插入', '<ins>这段文字表示插入内容</ins>');
expectContains('标记', '<mark>这段文字表示高亮标记</mark>');
expectContains('缩写', '<abbr title="Hyper Text Markup Language">HTML</abbr>');
expectContains('复选框（只读）', 'task-list-item-checkbox');
expectContains('表格', '<table>');
expectContains('代码高亮', 'hljs-keyword');
expectContains('行内公式', 'class="katex"');
expectContains('块级公式', 'katex-display');
expectContains('[[toc]] 目录容器', 'class="mdv-toc"');
expectContains('GitHub 提醒 NOTE', 'markdown-alert-note');
expectContains('GitHub 提醒 TIP', 'markdown-alert-tip');
expectContains('GitHub 提醒 IMPORTANT', 'markdown-alert-important');
expectContains('GitHub 提醒 WARNING', 'markdown-alert-warning');
expectContains('GitHub 提醒 CAUTION', 'markdown-alert-caution');
expectContains('容器提醒 info', 'mdv-admonition-info');
expectContains('容器提醒 tip', 'mdv-admonition-tip');
expectContains('容器提醒自定义标题', 'mdv-admonition-title">自定义标题');
expectContains('容器提醒 warning', 'mdv-admonition-warning');
expectContains('定义列表', '<dt>Markdown</dt>');
expectContains('脚注引用', 'footnote-ref');
expectContains('脚注区域', 'class="footnotes"');
expectContains('图片', '<img src="./assets/demo-image.svg"');
expectContains('mermaid 占位（flowchart）', 'class="mdv-mermaid" data-src=');
expectCount('mermaid 三个围栏', 'class="mdv-mermaid"', 3);

// [[toc]] 链接与标题 id 必须一致
const tocBlock = html.match(/<nav class="mdv-toc">[\s\S]*?<\/nav>/)?.[0] ?? '';
const tocHrefs = Array.from(tocBlock.matchAll(/href="#([^"]+)"/g)).map((match) => match[1] ?? '');
const renderedIds = new Set(
  Array.from(html.matchAll(/<h[1-6][^>]*id="([^"]+)"/g)).map((match) => match[1] ?? ''),
);
const missingIds = tocHrefs.filter((id) => !renderedIds.has(id));
checks.push({
  name: `[[toc]] 链接与标题 id 一致（${tocHrefs.length} 条）`,
  ok: tocHrefs.length > 0 && missingIds.length === 0,
  detail: missingIds.length > 0 ? `缺失 id: ${missingIds.join(', ')}` : undefined,
});

// 输出结果
let failed = 0;
for (const check of checks) {
  if (!check.ok) {
    failed += 1;
  }
  const status = check.ok ? 'PASS' : 'FAIL';
  console.log(`${status}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
}
console.log(`\n${checks.length - failed}/${checks.length} 项通过（文档 ${source.length} 字符 → HTML ${html.length} 字符）`);
process.exit(failed === 0 ? 0 : 1);
