export class PreviewPage {
  static render(nonce: string): string {
    return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>高级软件开发技术 · Lab1 SVG 实时预览</title>
<style nonce="${nonce}">
:root { color-scheme: light; font-family: system-ui, sans-serif; color: #213047; background: #eef2f7; }
* { box-sizing: border-box; }
body { margin: 0; }
header { background: #fff; border-bottom: 1px solid #d8e0eb; padding: 22px 28px; }
.kicker { font-size: 13px; color: #52647c; margin: 0 0 8px; }
h1 { font-size: 23px; margin: 0 0 12px; }
.bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
#connection { color: #17664c; background: #e4f4ed; border-radius: 16px; padding: 5px 12px; font-size: 13px; }
#connection.offline { color: #8b440e; background: #fff0d9; }
#details { color: #52647c; font-size: 14px; }
button { margin-left: auto; background: #fff; color: #263b59; border: 1px solid #becbdc; border-radius: 7px; padding: 8px 14px; cursor: pointer; }
button:focus-visible { outline: 3px solid #6ca4ee; }
.hint { margin: 14px 28px; color: #52647c; font-size: 14px; line-height: 1.7; }
main { margin: 20px 28px; padding: 24px; min-height: 320px; overflow: auto; border: 1px solid #d8e0eb; border-radius: 10px; background: repeating-conic-gradient(#e6eaf0 0% 25%, #f4f6f9 0% 50%) 0 / 20px 20px; }
#canvas { display: block; margin: auto; background: #fff; box-shadow: 0 5px 20px #21304720; max-width: 100%; height: auto; }
main.actual #canvas { max-width: none; }
[hidden] { display: none !important; }
#empty { text-align: center; padding: 72px 16px; line-height: 1.8; background: #ffffffeb; border-radius: 8px; }
code { font-family: ui-monospace, monospace; }
@media (max-width: 600px) { header { padding: 18px; } main { margin: 16px; padding: 12px; } .hint { margin: 12px 18px; } }
</style>
</head>
<body>
<header>
<p class="kicker">高级软件开发技术 / Lab1</p>
<h1>SVG 实时预览</h1>
<div class="bar"><span id="connection" role="status" aria-live="polite">正在连接…</span><span id="details">等待文档</span><button id="size" type="button" aria-pressed="false">切换原尺寸</button></div>
</header>
<p class="hint">在终端编辑，这里自动更新，无需先 <code>save</code>。需要保留文件时，请在终端使用 <code>save 文件名.svg</code>。</p>
<main id="stage"><div id="empty">还没有画布<br>请在终端输入 <code>init 800 600</code> 或 <code>read 文件名.svg</code></div><img id="canvas" alt="当前 SVG 文档预览" hidden></main>
<script nonce="${nonce}">
(() => {
  const connection = document.getElementById('connection');
  const details = document.getElementById('details');
  const canvas = document.getElementById('canvas');
  const empty = document.getElementById('empty');
  const stage = document.getElementById('stage');
  const size = document.getElementById('size');
  let etag;
  size.addEventListener('click', () => {
    const actual = stage.classList.toggle('actual');
    size.textContent = actual ? '适应窗口' : '切换原尺寸';
    size.setAttribute('aria-pressed', String(actual));
  });
  const poll = async () => {
    try {
      const response = await fetch('state', {
        cache: 'no-store',
        headers: etag ? { 'If-None-Match': etag } : {},
        signal: AbortSignal.timeout(4000)
      });
      if (response.status !== 304) {
        if (!response.ok) throw new Error('preview unavailable');
        const state = await response.json();
        if (state.svg !== null) {
          canvas.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(state.svg);
          canvas.hidden = false;
          empty.hidden = true;
          details.textContent = state.width + ' × ' + state.height + ' · ' + state.count + ' 个元素 · 版本 ' + state.revision;
        }
        etag = response.headers.get('ETag');
      }
      connection.textContent = '已连接 · 自动更新';
      connection.classList.remove('offline');
    } catch {
      connection.textContent = '连接中断 · 请检查终端，正在重试';
      connection.classList.add('offline');
    } finally {
      setTimeout(poll, 300);
    }
  };
  void poll();
})();
</script>
</body>
</html>`;
  }
}
