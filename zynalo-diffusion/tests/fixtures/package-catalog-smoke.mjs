const port = Number(process.argv[2] ?? 9334);
const deadline = Date.now() + 60_000;
let page;
while (Date.now() < deadline) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    page = pages.find((candidate) => candidate.type === 'page' && candidate.url.startsWith('zynalo://app/'));
    if (page) break;
  } catch { /* Packaged renderer is still starting. */ }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!page) throw new Error('Packaged renderer did not expose the Zynalo app page.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let sequence = 0;
function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${method} timed out.`)), 60_000);
    const listener = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      socket.removeEventListener('message', listener);
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    };
    socket.addEventListener('message', listener);
  });
}

await command('Runtime.enable');
const response = await command('Runtime.evaluate', {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    const started = Date.now();
    while (!document.querySelector('.profile-note')) {
      if (Date.now() - started > 30000) throw new Error('Prompt workspace did not render.');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const [info, completion, reference] = await Promise.all([
      window.zynaloDiffusion.getTagCatalogInfo(),
      window.zynaloDiffusion.completeTags({ query: 'hatsune_mi', limit: 5 }),
      window.zynaloDiffusion.getTagReference({ tag: 'dutch_angle', allowNsfw: false }),
    ]);
    return { info, completion, reference, profileText: document.querySelector('.profile-note')?.textContent };
  })()`,
});
if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
const value = response.result.value;
if (value.info.recordCount !== 186699 || value.info.offline !== true || value.completion.items[0]?.canonicalTag !== 'hatsune_miku' || !value.profileText.includes('186,699 offline autocomplete tags') || !value.reference.description?.includes('framed at a tilted angle') || value.reference.preview?.rating !== 'general' || !value.reference.preview?.uri.startsWith('zynalo-asset://tag-preview/')) throw new Error(`Unexpected packaged catalog result: ${JSON.stringify(value)}`);
const pointResult = await command('Runtime.evaluate', { returnByValue: true, expression: `(() => { const editor = document.querySelector('.cm-content'); editor.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, 'dutch_angle'); const rect = editor.getBoundingClientRect(); return { x: rect.left + 40, y: rect.top + 20 }; })()` });
await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pointResult.result.value.x, y: pointResult.result.value.y });
const hoverResult = await command('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => { const started = Date.now(); while (!document.querySelector('.tag-tooltip-preview img')) { if (Date.now() - started > 30000) throw new Error('Danbooru hover preview timed out: ' + document.body.innerText); await new Promise(resolve => setTimeout(resolve, 100)); } const tooltip = document.querySelector('.tag-tooltip'); const image = tooltip.querySelector('img'); await Promise.race([image.decode(), new Promise(resolve => setTimeout(resolve, 5000))]); return { text: tooltip.textContent, imageUri: image.src, complete: image.complete, naturalWidth: image.naturalWidth }; })()` });
if (hoverResult.exceptionDetails) throw new Error(hoverResult.exceptionDetails.exception?.description ?? hoverResult.exceptionDetails.text);
value.hover = hoverResult.result.value;
if (!value.hover.text.includes('framed at a tilted angle') || !value.hover.text.includes('general preview') || !value.hover.imageUri.startsWith('zynalo-asset://tag-preview/') || !value.hover.complete || value.hover.naturalWidth <= 0) throw new Error(`Unexpected packaged hover result: ${JSON.stringify(value)}`);
process.stdout.write(`${JSON.stringify(value)}\n`);
await command('Browser.close');
