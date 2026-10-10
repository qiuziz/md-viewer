import { browser } from 'wxt/browser';
import { MSG, type FetchDocumentResponse } from './messages';

export interface LiveRefreshOptions {
  getSource: () => string;
  onUpdate: (source: string) => void;
  onStopped: (reason: string) => void;
  intervalMs?: number;
}

export interface LiveRefreshHandle {
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  checkNow(): void;
  destroy(): void;
}

const MAX_FAILURES = 3;

/**
 * 实时刷新：内容脚本持有时钟，向 service worker 请求文档最新内容
 * （读取放在扩展侧，避开页面 CSP 与跨域限制）；文本变化时交给上层重渲染。
 * 页面隐藏时暂停，连续失败会自动停止并回调提示。
 */
export function createLiveRefresh(options: LiveRefreshOptions): LiveRefreshHandle {
  const intervalMs = options.intervalMs ?? 1000;
  let enabled = false;
  let inFlight = false;
  let failures = 0;
  let timer: number | undefined;

  function stopTimer(): void {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function registerFailure(reason?: string): void {
    failures += 1;
    if (failures >= MAX_FAILURES) {
      setEnabled(false);
      options.onStopped(reason ? `实时刷新已停止：${reason}` : '实时刷新已停止：无法读取文档');
    }
  }

  async function check(): Promise<void> {
    if (!enabled || inFlight || document.hidden) {
      return;
    }
    inFlight = true;
    try {
      const response = (await browser.runtime.sendMessage({
        type: MSG.fetchDocument,
      })) as FetchDocumentResponse | undefined;
      if (!enabled) {
        return;
      }
      if (!response?.ok) {
        registerFailure(response?.error);
        return;
      }
      failures = 0;
      const text = response.text ?? '';
      // 空内容多半是异常响应，避免把预览清空
      if (text !== '' && text !== options.getSource()) {
        options.onUpdate(text);
      }
    } catch (error) {
      registerFailure(error instanceof Error ? error.message : String(error));
    } finally {
      inFlight = false;
    }
  }

  function setEnabled(next: boolean): void {
    if (next === enabled) {
      return;
    }
    enabled = next;
    failures = 0;
    stopTimer();
    if (next) {
      timer = window.setInterval(() => void check(), intervalMs);
      void check();
    }
  }

  const onVisibilityChange = (): void => {
    if (!document.hidden) {
      void check();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    setEnabled,
    isEnabled: () => enabled,
    checkNow: () => void check(),
    destroy() {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      enabled = false;
    },
  };
}
