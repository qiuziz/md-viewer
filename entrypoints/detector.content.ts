import { hasRawPlainTextSource, isExtensionlessMarkdownPage } from '@/utils/detect';
import { MSG } from '@/utils/messages';

/**
 * 轻量探测器：常驻 <all_urls>，只负责「URL 无 markdown 扩展名但响应内容类型是 markdown」
 * 的页面——这类页面不会被渲染器的 manifest 匹配命中，需要请 SW 注入渲染器。
 * 其他页面只有本脚本的极小开销。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    if (document.documentElement.dataset['mdvMounted'] === 'true') {
      return;
    }
    if (!isExtensionlessMarkdownPage() || !hasRawPlainTextSource()) {
      return;
    }
    void browser.runtime.sendMessage({ type: MSG.requestRenderer }).catch(() => undefined);
  },
});
