import DOMPurify from 'dompurify';

/**
 * 净化 Markdown 渲染结果。
 * - 保留 MathML（KaTeX 的无障碍输出）
 * - 保留 style 属性（KaTeX 依赖），但禁止 style 标签，避免整页 CSS 注入
 * - 禁止表单/按钮类元素：文档预览不需要提交能力（复选框 input 仍保留）
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true, mathMl: true },
    FORBID_TAGS: ['style', 'form', 'button', 'select', 'textarea', 'option', 'iframe', 'object'],
  });
}

/**
 * 净化 mermaid 生成的 SVG。
 * mermaid 自身以 securityLevel: 'strict' 做过一轮净化，这里再做一次兜底，
 * 禁止脚本与 foreignObject（HTML 注入载体）。
 */
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
    FORBID_TAGS: ['script', 'foreignObject'],
  });
}
