# MD Viewer

在浏览器中直接打开 `.md` 文件时，自动将其渲染为格式化的阅读视图，并支持一键切换回源码。

## 功能

- **文档格式**：支持 `file://`、`http://`、`https://` 协议，以及 `.md`、`.markdown`、`.mdown`、`.mkdn`、`.mkd`、`.mdwn`、`.mdtxt`、`.mdtext`、`.mdx`、`.txt` 扩展名（含 `?query` 与响应类型为 `text/markdown` 的地址）
- **语法插件**：表情符号、上标/下标、复选框、数学公式（KaTeX）、流程图/甘特图（mermaid）、目录（`[[toc]]`）、插入、标记、缩写、脚注、定义列表、提醒（`> [!NOTE]` 与 `::: note` 容器）
- **文档大纲**：侧边栏目录（scrollspy 高亮、点击跳转、可折叠、窄屏浮层）、原始内容预览（保留浏览器原生纯文本视图）、图像媒体预览（点击图片放大，被链接包裹的图片不拦截）
- **实时刷新**：文档变更后自动重渲染（保滚动位置）；正文居中/全宽可切换
- **主题**：跟随系统/浅色/深色三态主题，代码块语法高亮，图表配色跟随主题
- **快捷键**：通过浏览器扩展命令快速切换目录、居中、实时刷新、主题与源码视图
- 渲染结果经 [DOMPurify](https://github.com/cure53/DOMPurify) 净化；mermaid 以 `securityLevel: strict` + 二次净化渲染；外链新标签打开

## 安装（Chrome / Edge）

```bash
npm install
npm run build
```

1. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本仓库的 `.output/chrome-mv3` 目录
4. 如需预览本地文件（`file://`），在扩展详情页额外开启「允许访问文件网址」（本地实时刷新同样依赖该权限）

### 脚本安装 / 更新（macOS）

```bash
./scripts/chrome-extension.sh            # 构建 + 自动安装或更新（已安装则点「重新加载」）
./scripts/chrome-extension.sh --no-build # 跳过构建，仅加载/刷新
```

脚本自动判断扩展是否已安装：未安装时走「加载已解压的扩展程序」流程，已安装时点击详情页的「重新加载」完成更新，并确保「允许访问文件网址」为开启。依赖 macOS 辅助功能/自动化权限；仅操作页面中全局唯一的按钮，不包含任何移除操作。

## 快捷键

在 `chrome://extensions/shortcuts` 可自定义；默认值：

| 快捷键 | 功能 |
| --- | --- |
| `Alt+Shift+B` | 显示/隐藏目录侧边栏 |
| `Alt+Shift+C` | 切换居中/全宽显示 |
| `Alt+Shift+R` | 开启/关闭实时刷新 |
| `Alt+Shift+T` | 切换主题（跟随系统 → 浅色 → 深色） |
| （未绑定） | 切换预览/源码视图 |

> Chrome 限制单个扩展最多 4 个默认快捷键，因此「切换预览/源码视图」默认不绑定按键，可在 `chrome://extensions/shortcuts` 中自行设置。

## 使用

- 本地文件：在浏览器中直接打开任意 `.md` 文件，例如 `file:///Users/you/notes/readme.md`
- 在线文件：访问以 `.md` / `.txt` 等结尾，或响应内容类型为 `text/markdown` 的地址（例如 raw 链接）
- 顶部工具栏：目录、居中、实时刷新、主题、源码/预览；文件名悬停可见完整路径
- 侧边栏目录：点击跳转并高亮当前标题；窄屏下为浮层，Esc 或点击遮罩关闭
- 图片：点击正文图片放大预览，点击遮罩或 Esc 关闭
- 实时刷新：开启后每秒比对一次文档内容，变化时自动更新预览并保持滚动位置；连续读取失败会自动关闭并提示
- 设置（主题/居中/侧边栏/实时刷新）保存在浏览器同步存储中，各标签页与设备间保持一致

## 开发

```bash
npm run dev          # 开发模式（自动打开浏览器并热更新）
npm run build        # 构建 Chrome 版本到 .output/chrome-mv3
npm run build:firefox
npm run compile      # TypeScript 类型检查
npm run smoke        # 渲染冒烟测试（samples/demo.md 覆盖全部语法）
```

项目结构：

```text
entrypoints/
  renderer.content.ts   # 主渲染器（仅 markdown URL 模式命中）：渲染 + UI + 实时刷新
  detector.content.ts   # 轻量探测器（<all_urls>）：处理“无扩展名但 text/markdown”的地址
  mermaid.ts            # mermaid 渲染脚本（按需注入，约 5MB，不进普通页面）
  background.ts         # Service Worker：快捷键转发、按需注入、读取文档
utils/
  detect.ts             # 页面检测（协议/扩展名/内容类型 + 原生 <pre> 判定）
  markdown.ts           # markdown-it 渲染管线（全部语法插件，纯函数）
  sanitize.ts           # DOMPurify 净化（正文 html+MathML、mermaid svg）
  ui.ts                 # 工具栏 / 侧边栏 / 源码视图 / 灯箱 / 提示
  outline.ts            # 目录树与 scrollspy
  mermaid.ts / live.ts / theme.ts / settings.ts / lightbox.ts / toast.ts
  styles/               # 预览样式（base + 代码高亮配色）
scripts/
  chrome-extension.sh   # macOS 安装/更新脚本
  render-smoke.mts      # 渲染冒烟测试
```

技术栈：[WXT](https://wxt.dev) + Vite · [markdown-it](https://github.com/markdown-it/markdown-it) · [KaTeX](https://katex.org/) · [mermaid](https://mermaid.js.org/) · [highlight.js](https://highlightjs.org/) · [DOMPurify](https://github.com/cure53/DOMPurify)

## Roadmap

- 字号/宽度等阅读偏好设置
- 代码块复制按钮
- Firefox 打包验证
