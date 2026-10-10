import type { PublicPath } from 'wxt/browser';
import { MSG, type FetchDocumentResponse, type SimpleResponse } from '@/utils/messages';

type ScriptPath = Extract<PublicPath, `${string}.js`>;

/** WXT 构建产物路径（与 .wxt/types/paths.d.ts 生成的 PublicPath 保持一致） */
const RENDERER_SCRIPT: ScriptPath = '/content-scripts/renderer.js';
const MERMAID_SCRIPT: ScriptPath = '/mermaid.js';

type SenderInfo = {
  id?: string;
  url?: string;
  frameId?: number;
  tab?: { id?: number; url?: string };
};

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.id !== browser.runtime.id) {
      return undefined;
    }
    const type = (message as { type?: string } | undefined)?.type;
    switch (type) {
      case MSG.requestRenderer:
        void injectScript(sender, RENDERER_SCRIPT).then(sendResponse);
        return true;
      case MSG.requestMermaid:
        void injectScript(sender, MERMAID_SCRIPT).then(sendResponse);
        return true;
      case MSG.fetchDocument:
        void fetchDocument(sender).then(sendResponse);
        return true;
      default:
        return undefined;
    }
  });

  // 浏览器快捷键：转发给当前标签页的渲染器
  browser.commands.onCommand.addListener(async (command) => {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    if (tabId === undefined) {
      return;
    }
    try {
      await browser.tabs.sendMessage(tabId, { type: MSG.command, command });
    } catch {
      // 当前页面没有渲染器（不是 markdown 页面），无需处理
    }
  });
});

/** 注入独立入口脚本到请求所在的 frame（与 content script 同一 isolated world）。 */
async function injectScript(sender: SenderInfo, file: ScriptPath): Promise<SimpleResponse> {
  const tabId = sender.tab?.id;
  if (tabId === undefined) {
    return { ok: false, error: '未找到目标标签页' };
  }
  try {
    await browser.scripting.executeScript({
      target: { tabId, frameIds: [sender.frameId ?? 0] },
      files: [file],
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 读取文档最新内容（实时刷新）。
 * 放在扩展侧执行，既避开页面 CSP，也支持 file://（需开启「允许访问文件网址」）。
 */
async function fetchDocument(sender: SenderInfo): Promise<FetchDocumentResponse> {
  const url = sender.url ?? sender.tab?.url;
  if (!url) {
    return { ok: false, error: '无法确定文档地址' };
  }
  if (!/^(https?|file):/i.test(url)) {
    return { ok: false, error: '仅支持 http(s) 与 file 协议' };
  }
  try {
    const response = await fetch(url, { cache: 'no-store', credentials: 'include' });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true, text: await response.text() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
