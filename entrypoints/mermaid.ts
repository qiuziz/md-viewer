import mermaid from 'mermaid';
import type { ResolvedTheme } from '@/utils/theme';

/**
 * mermaid 渲染脚本（约数 MB，独立入口）。
 * 只有文档里出现 ```mermaid 围栏时，渲染器才请 SW 通过 scripting.executeScript
 * 把它注入同一个 isolated world；注入后向全局暴露 __mdvRenderMermaid。
 */
export default defineUnlistedScript(() => {
  let initializedTheme: ResolvedTheme | null = null;

  const host = globalThis as typeof globalThis & {
    __mdvRenderMermaid?: (code: string, theme: ResolvedTheme) => Promise<string>;
  };

  host.__mdvRenderMermaid = async (code, theme) => {
    if (initializedTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        htmlLabels: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        fontFamily: 'inherit',
      });
      initializedTheme = theme;
    }
    const id = `mdv-mermaid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const { svg } = await mermaid.render(id, code);
    return svg;
  };
});
