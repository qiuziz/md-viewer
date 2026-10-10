import { detectMarkdownPage } from '@/utils/detect';
import { mountPreview } from '@/utils/ui';
import './preview.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_end',
  main() {
    if (document.documentElement.dataset.mdvMounted === 'true') {
      return;
    }
    const source = detectMarkdownPage();
    if (source === null) {
      return;
    }
    document.documentElement.dataset.mdvMounted = 'true';
    mountPreview(source);
  },
});
