# MD Viewer

在浏览器中直接打开 `.md` / `.markdown` 文件时，自动将其渲染为格式化的阅读视图，并支持一键切换回源码。

## 功能

- 打开 Markdown 地址（`.md` / `.markdown` 后缀，或响应类型为 `text/markdown`）或本地 Markdown 文件时自动渲染预览
- 支持 GFM 语法：表格、任务列表、自动链接、删除线
- 顶部工具栏一键在「预览 / 源码」视图间切换
- 渲染结果经 [DOMPurify](https://github.com/cure53/DOMPurify) 净化，页面内容不会引入脚本注入
- 样式跟随系统深浅色主题，正文链接新标签页打开

## 安装（Chrome / Edge）

```bash
npm install
npm run build
```

1. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本仓库的 `.output/chrome-mv3` 目录
4. 如需预览本地文件（`file://`），在扩展详情页额外开启「允许访问文件网址」

## 使用

- 本地文件：在浏览器中直接打开任意 `.md` 文件，例如 `file:///Users/you/notes/readme.md`
- 在线文件：访问以 `.md` / `.markdown` 结尾、或响应内容类型为 `text/markdown` 的地址（例如 raw 链接）
- 页面顶部工具栏可切换预览与源码；点「查看源码」回到浏览器原生纯文本视图

## 开发

```bash
npm run dev          # 开发模式（自动打开浏览器并热更新）
npm run build        # 构建 Chrome 版本到 .output/chrome-mv3
npm run build:firefox
npm run compile      # TypeScript 类型检查
```

项目结构：

```text
entrypoints/content/   # content script 入口与预览样式
utils/                 # 检测、渲染、UI 挂载逻辑
```

技术栈：[WXT](https://wxt.dev) + Vite · [markdown-it](https://github.com/markdown-it/markdown-it) · [DOMPurify](https://github.com/cure53/DOMPurify)

## Roadmap

- 代码块语法高亮
- 目录（TOC）大纲
- 字号/宽度等阅读偏好设置
- Firefox 打包验证
