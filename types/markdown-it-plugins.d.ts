/**
 * markdown-it 生态里部分插件未随包发布类型声明，这里补齐最小可用签名。
 * 注意：本文件保持为全局声明脚本（顶层不要出现 import/export），
 * 否则 `declare module` 会被当成模块增强而失效。
 */

declare module 'markdown-it-emoji' {
  import type { MarkdownIt } from 'markdown-it';
  const bare: (md: MarkdownIt) => void;
  const light: (md: MarkdownIt) => void;
  const full: (md: MarkdownIt) => void;
  export { bare, light, full };
}

declare module 'markdown-it-sup' {
  import type { MarkdownIt } from 'markdown-it';
  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

declare module 'markdown-it-sub' {
  import type { MarkdownIt } from 'markdown-it';
  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

declare module 'markdown-it-ins' {
  import type { MarkdownIt } from 'markdown-it';
  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

declare module 'markdown-it-mark' {
  import type { MarkdownIt } from 'markdown-it';
  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

declare module 'markdown-it-abbr' {
  import type { MarkdownIt } from 'markdown-it';
  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

declare module 'markdown-it-footnote' {
  import type { MarkdownIt } from 'markdown-it';
  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

declare module 'markdown-it-deflist' {
  import type { MarkdownIt } from 'markdown-it';
  const plugin: (md: MarkdownIt) => void;
  export default plugin;
}

declare module 'markdown-it-container' {
  import type { MarkdownIt, Renderer, Token } from 'markdown-it';
  interface ContainerOptions {
    validate?: (params: string) => boolean;
    render?: (tokens: Token[], idx: number, options: unknown, env: unknown, self: Renderer) => string;
    marker?: string;
  }
  const container: (md: MarkdownIt, name: string, options?: ContainerOptions) => void;
  export default container;
}
