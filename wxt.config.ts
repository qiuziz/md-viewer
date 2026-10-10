import { defineConfig } from 'wxt';
import type { Plugin } from 'vite';

/**
 * KaTeX 字体只需 woff2（现代浏览器全支持），剥离 woff/ttf 变体，
 * 避免把三份字体全部内联进注入页面的 CSS。
 */
function katexWoff2Only(): Plugin {
  const katexCss = /katex[\\/]dist[\\/]katex(\.min)?\.css/;
  return {
    name: 'mdv-katex-woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!katexCss.test(id)) {
        return null;
      }
      return {
        code: code
          .replace(/,\s*url\([^)]*\.woff\)\s*format\((['"])woff\1\)/g, '')
          .replace(/,\s*url\([^)]*\.ttf\)\s*format\((['"])truetype\1\)/g, ''),
        map: null,
      };
    },
  };
}

/**
 * Chrome 会对 content script 文件做 UTF-8 校验：包含多字节字符的大文件会被判定为
 * “isn't UTF-8 encoded” 并导致整个扩展加载失败（实测 Chrome for Testing 147 与品牌版 153）。
 * 在最终输出上把非 ASCII 字符转义为 \uXXXX（语义不变），确保产物为纯 ASCII。
 */
function asciiOnlyChunks(): Plugin {
  const escape = (code: string): string =>
    code.replace(/[\u007F-\uFFFF]/g, (char) => {
      return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
    });
  return {
    name: 'mdv-ascii-only-chunks',
    enforce: 'post',
    // Rolldown/Vite 8 下 renderChunk 覆盖不到最终产物，统一在 generateBundle 处理
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === 'chunk' && /[\u007F-\uFFFF]/.test(output.code)) {
          output.code = escape(output.code);
        }
      }
    },
  };
}

export default defineConfig({
  manifest: {
    name: 'MD Viewer',
    description:
      '打开 Markdown 文件时自动渲染为格式化预览：语法插件、侧边栏目录、图片放大、实时刷新、明暗主题与快捷键',
    permissions: ['storage', 'scripting'],
    host_permissions: ['<all_urls>'],
    commands: {
      toggleSide: {
        description: '显示/隐藏目录侧边栏',
        suggested_key: { default: 'Alt+Shift+B' },
      },
      toggleCentered: {
        description: '切换居中/全宽显示',
        suggested_key: { default: 'Alt+Shift+C' },
      },
      toggleRefresh: {
        description: '开启/关闭实时刷新',
        suggested_key: { default: 'Alt+Shift+R' },
      },
      toggleTheme: {
        description: '切换明暗主题',
        suggested_key: { default: 'Alt+Shift+T' },
      },
      // Chrome 限制：最多 4 个命令可带默认快捷键（超过会导致 manifest 校验失败），
      // 因此预览/源码切换默认不绑定按键，可在 chrome://extensions/shortcuts 自行设置
      toggleView: {
        description: '切换预览/源码视图',
      },
    },
  },
  vite: () => ({
    build: {
      // KaTeX 字体（woff2）内联为 data URI，避免 web_accessible_resources 与相对路径问题
      assetsInlineLimit: 1024 * 1024,
    },
    plugins: [asciiOnlyChunks(), katexWoff2Only()],
  }),
});
