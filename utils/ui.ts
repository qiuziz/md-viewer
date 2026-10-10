import { renderMarkdown } from './render';

const FILE_NAME_FALLBACK = 'Markdown 预览';

export function getFileNameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split('/').filter(Boolean).pop() ?? '';
    return decodeURIComponent(last) || FILE_NAME_FALLBACK;
  } catch {
    return FILE_NAME_FALLBACK;
  }
}

function openExternalLinksInNewTab(container: HTMLElement): void {
  for (const anchor of container.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    if (/^https?:/i.test(href)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
  }
}

export function mountPreview(source: string): void {
  const root = document.createElement('div');
  root.className = 'mdv-app';

  const toolbar = document.createElement('header');
  toolbar.className = 'mdv-toolbar';

  const fileName = document.createElement('span');
  fileName.className = 'mdv-file-name';
  fileName.textContent = getFileNameFromUrl(location.href);

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'mdv-toggle';
  toggleButton.textContent = '查看源码';

  toolbar.append(fileName, toggleButton);

  const content = document.createElement('main');
  content.className = 'mdv-content mdv-markdown-body';
  content.innerHTML = renderMarkdown(source);
  openExternalLinksInNewTab(content);

  const sourceView = document.createElement('pre');
  sourceView.className = 'mdv-source';
  sourceView.textContent = source;
  sourceView.hidden = true;

  root.append(toolbar, content, sourceView);

  document.documentElement.classList.add('mdv-page');
  document.body.replaceChildren(root);

  toggleButton.addEventListener('click', () => {
    const sourceVisible = !sourceView.hidden;
    content.hidden = !sourceVisible;
    sourceView.hidden = sourceVisible;
    toggleButton.textContent = sourceVisible ? '查看源码' : '查看预览';
  });
}
