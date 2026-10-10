export interface OutlineOptions {
  content: HTMLElement;
  list: HTMLElement;
  /** 顶部工具栏高度，用于 scrollspy 判定与跳转偏移 */
  toolbarOffset?: number;
  onNavigate?: () => void;
}

export interface OutlineHandle {
  rebuild(): void;
  destroy(): void;
}

interface OutlineEntry {
  id: string;
  item: HTMLLIElement;
}

interface LevelStackItem {
  level: number;
  ul: HTMLUListElement;
}

/** 侧边栏目录：由正文标题生成嵌套大纲，带 scrollspy 与平滑跳转。 */
export function createOutline(options: OutlineOptions): OutlineHandle {
  const toolbarOffset = options.toolbarOffset ?? 56;
  let entries: OutlineEntry[] = [];
  let activeId: string | null = null;
  let hovering = false;
  let ticking = false;

  function headingText(heading: HTMLElement): string {
    const clone = heading.cloneNode(true) as HTMLElement;
    for (const anchor of clone.querySelectorAll('.mdv-anchor')) {
      anchor.remove();
    }
    return (clone.textContent ?? '').trim();
  }

  function rebuild(): void {
    const headings = Array.from(
      options.content.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'),
    );
    const root = document.createElement('ul');
    root.className = 'mdv-outline-list';
    const stack: LevelStackItem[] = [{ level: 0, ul: root }];
    entries = [];

    for (const heading of headings) {
      const id = heading.id;
      if (!id) {
        continue;
      }
      const level = Number(heading.tagName.slice(1));
      while (stack.length > 1 && (stack[stack.length - 1]?.level ?? 0) >= level) {
        stack.pop();
      }
      const parent = stack[stack.length - 1];
      if (!parent) {
        continue;
      }
      const item = document.createElement('li');
      item.className = `mdv-outline-item mdv-outline-h${level}`;
      const link = document.createElement('a');
      link.href = `#${id}`;
      const text = headingText(heading) || id;
      link.textContent = text;
      link.title = text;
      item.append(link);
      const childList = document.createElement('ul');
      childList.className = 'mdv-outline-list';
      item.append(childList);
      parent.ul.append(item);
      stack.push({ level, ul: childList });
      entries.push({ id, item });
    }

    for (const nested of Array.from(root.querySelectorAll('ul')).reverse()) {
      if (nested.children.length === 0) {
        nested.remove();
      }
    }

    options.list.replaceChildren();
    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'mdv-sidebar-empty';
      empty.textContent = '本文档没有标题';
      options.list.append(empty);
    } else {
      options.list.append(root);
    }
    activeId = null;
    updateActive();
  }

  function setActive(id: string | null): void {
    if (id === activeId) {
      return;
    }
    activeId = id;
    for (const entry of entries) {
      const isActive = entry.id === id;
      entry.item.classList.toggle('is-active', isActive);
      if (isActive && !hovering) {
        entry.item.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  function updateActive(): void {
    if (entries.length === 0) {
      return;
    }
    const threshold = toolbarOffset + 8;
    let currentId: string | null = entries[0]?.id ?? null;
    for (const entry of entries) {
      const heading = document.getElementById(entry.id);
      if (!heading) {
        continue;
      }
      if (heading.getBoundingClientRect().top <= threshold) {
        currentId = entry.id;
      } else {
        break;
      }
    }
    const documentElement = document.documentElement;
    if (window.innerHeight + window.scrollY >= documentElement.scrollHeight - 2) {
      currentId = entries[entries.length - 1]?.id ?? currentId;
    }
    setActive(currentId);
  }

  const onScroll = (): void => {
    if (ticking) {
      return;
    }
    ticking = true;
    window.requestAnimationFrame(() => {
      ticking = false;
      updateActive();
    });
  };

  const onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest('a');
    if (!link) {
      return;
    }
    const hash = link.getAttribute('href') ?? '';
    if (!hash.startsWith('#')) {
      return;
    }
    const rawId = hash.slice(1);
    let heading = document.getElementById(rawId);
    if (!heading) {
      // 兼容外部写入的百分号转义锚点；非法序列时按原串处理，不抛错
      try {
        heading = document.getElementById(decodeURIComponent(rawId));
      } catch {
        heading = null;
      }
    }
    if (!heading) {
      return;
    }
    event.preventDefault();
    const top = heading.getBoundingClientRect().top + window.scrollY - toolbarOffset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    setActive(heading.id);
    options.onNavigate?.();
  };

  const onMouseEnter = (): void => {
    hovering = true;
  };
  const onMouseLeave = (): void => {
    hovering = false;
  };

  options.list.addEventListener('click', onClick);
  options.list.addEventListener('mouseenter', onMouseEnter);
  options.list.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  return {
    rebuild,
    destroy() {
      options.list.removeEventListener('click', onClick);
      options.list.removeEventListener('mouseenter', onMouseEnter);
      options.list.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    },
  };
}
