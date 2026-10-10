import { detectMarkdownSource, type DetectedSource } from '@/utils/detect';
import { getMarkdownMatchPatterns } from '@/utils/matches';
import { loadSettings } from '@/utils/settings';
import { mountPreview } from '@/utils/ui';

/**
 * 主渲染器：仅由 markdown URL 模式命中（或 detector 请求 SW 注入），
 * 因此所有重依赖（markdown-it / KaTeX / highlight.js）不会进入普通页面。
 */
export default defineContentScript({
  matches: getMarkdownMatchPatterns(),
  runAt: 'document_end',
  // CSS 由渲染器按需注入到 markdown 页面（utils/ui.ts），不进 manifest
  cssInjectionMode: 'manual',
  main() {
    if (document.documentElement.dataset['mdvMounted'] === 'true') {
      return;
    }
    const detected = detectMarkdownSource();
    if (!detected) {
      return;
    }
    document.documentElement.dataset['mdvMounted'] = 'true';
    void start(detected);
  },
});

async function start(detected: DetectedSource): Promise<void> {
  const settings = await loadSettings();
  mountPreview(detected, settings);
}
