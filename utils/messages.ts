/** 扩展内部消息协议（content script ⇄ service worker）。 */
export const MSG = {
  /** detector → SW：当前页面无扩展名但内容类型是 markdown，请注入渲染器。 */
  requestRenderer: 'mdv:request-renderer',
  /** renderer → SW：注入 mermaid 渲染脚本（同一 isolated world 的全局函数）。 */
  requestMermaid: 'mdv:request-mermaid',
  /** renderer → SW：读取文档最新内容（实时刷新）。 */
  fetchDocument: 'mdv:fetch-document',
  /** SW → renderer：浏览器快捷键触发的命令。 */
  command: 'mdv:command',
} as const;

export type MdvCommand =
  | 'toggleSide'
  | 'toggleCentered'
  | 'toggleRefresh'
  | 'toggleTheme'
  | 'toggleView';

export interface RequestRendererMessage {
  type: typeof MSG.requestRenderer;
}

export interface RequestMermaidMessage {
  type: typeof MSG.requestMermaid;
}

export interface FetchDocumentMessage {
  type: typeof MSG.fetchDocument;
}

export interface CommandMessage {
  type: typeof MSG.command;
  command: MdvCommand;
}

export type MdvMessage =
  | RequestRendererMessage
  | RequestMermaidMessage
  | FetchDocumentMessage
  | CommandMessage;

export interface SimpleResponse {
  ok: boolean;
  error?: string;
}

export interface FetchDocumentResponse extends SimpleResponse {
  text?: string;
}
