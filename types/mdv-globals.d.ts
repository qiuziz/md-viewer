/** 注入到同一 isolated world 的 mermaid 渲染函数（见 entrypoints/mermaid.ts）。 */
declare var __mdvRenderMermaid:
  | ((code: string, theme: 'light' | 'dark') => Promise<string>)
  | undefined;

/** Vite 的 CSS 字符串导入（构建期由 KaTeX 字体等资源内联后生成）。 */
declare module '*.css?inline' {
  const css: string;
  export default css;
}
