import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
}).use(taskLists);

export function renderMarkdown(source: string): string {
  const rawHtml = markdown.render(source);
  // 页面内容可能来自不可信来源，插入 DOM 前必须做白名单净化
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
