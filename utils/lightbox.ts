export interface Lightbox {
  element: HTMLElement;
  open(src: string, alt: string): void;
  close(): void;
}

/** 图像媒体预览：点击正文图片后放大展示，点击遮罩或 Esc 关闭。 */
export function createLightbox(): Lightbox {
  const element = document.createElement('div');
  element.className = 'mdv-lightbox';
  element.hidden = true;

  const image = document.createElement('img');
  image.alt = '';
  element.append(image);

  let opened = false;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };

  function open(src: string, alt: string): void {
    if (!src) {
      return;
    }
    image.src = src;
    image.alt = alt;
    element.hidden = false;
    document.addEventListener('keydown', onKeyDown, true);
    window.requestAnimationFrame(() => element.classList.add('is-open'));
    opened = true;
  }

  function close(): void {
    if (!opened) {
      return;
    }
    opened = false;
    document.removeEventListener('keydown', onKeyDown, true);
    element.classList.remove('is-open');
    const hide = (): void => {
      if (!opened) {
        element.hidden = true;
        image.removeAttribute('src');
      }
    };
    element.addEventListener('transitionend', hide, { once: true });
    window.setTimeout(hide, 300);
  }

  element.addEventListener('click', close);

  return { element, open, close };
}
