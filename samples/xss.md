# 净化（XSS）验收样例

本文档用于验证渲染结果经过 DOMPurify 净化：所有脚本与事件处理器都不应生效，
页面上也不应出现可点击的 `javascript:` 链接。

## 内联脚本

<script>
  window.__mdvXssExecuted = 'script-tag';
</script>

<img src="x" onerror="window.__mdvXssExecuted = 'img-onerror'" alt="onerror 应被移除" />

<div onclick="window.__mdvXssExecuted = 'div-onclick'">带 onclick 的容器（点击不应触发脚本）</div>

## 危险链接

[看起来正常的链接](javascript:window.__mdvXssExecuted='js-url')

## 样式注入

<style>
  body { display: none !important; }
</style>

上面的 style 标签应被移除，页面不应被隐藏。

## 内联样式属性

<span style="color: red">行内 style 属性保留（KaTeX 依赖），但不应携带脚本能力</span>

## iframe 与表单

<iframe src="https://example.com"></iframe>

<form action="https://example.com"><input name="secret" /><button>提交</button></form>

## 原始 HTML 表格

<table>
  <tr><th>标签</th><th>预期</th></tr>
  <tr><td>script</td><td>移除</td></tr>
  <tr><td>style</td><td>移除</td></tr>
  <tr><td>iframe / form</td><td>移除</td></tr>
  <tr><td>on* 事件属性</td><td>移除</td></tr>
</table>

## 数学公式中的危险指令

$\href{javascript:alert(1)}{点我}$ 应被 KaTeX 以 trust=false 阻止跳转。

$$
\htmlClass{evil}{x} + \includegraphics{secret.png}
$$
