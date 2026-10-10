# MD Viewer 示例文档

这是用于验收 MD Viewer 扩展的示例 Markdown 文件。打开本文件（`file://`）或它的 raw 地址时，应自动渲染为格式化预览。

## 基础排版

**加粗**、*斜体*、~~删除线~~、`行内代码`，以及自动链接 https://wxt.dev 。

## 任务列表

- [x] 检测 Markdown 页面
- [x] markdown-it 渲染
- [ ] 代码高亮（Roadmap）

## 表格

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| GFM 表格 | ✅ | 默认支持 |
| 任务列表 | ✅ | 渲染为只读复选框 |
| 外链新标签 | ✅ | http(s) 链接自动 `target=_blank` |

## 代码块

```ts
export function renderMarkdown(source: string): string {
  const rawHtml = markdown.render(source);
  return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
}
```

## 引用与分割线

> 引用内容：打开 md 文件即预览。
>
> —— MD Viewer

---

## 相对链接

同目录下的相对链接（如 `./another.md`）会按浏览器默认规则解析，可继续打开。
