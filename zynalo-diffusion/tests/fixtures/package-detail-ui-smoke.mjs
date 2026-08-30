const port = Number(process.argv[2] ?? 9555);
const deadline = Date.now() + 120_000;
let page;
while (Date.now() < deadline) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    page = pages.find((candidate) => candidate.type === 'page' && candidate.url.startsWith('zynalo://app/'));
    if (page) break;
  } catch { /* Packaged Electron is still starting. */ }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!page) throw new Error('Packaged renderer did not expose a debuggable app page.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const handler = pending.get(message.id);
  if (handler) { pending.delete(message.id); handler(message); }
});
function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out.`)); }, 360_000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    });
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, timeout = 120_000) {
  return evaluate(`(async () => { const started = Date.now(); while (!(${expression})) { if (Date.now() - started > ${timeout}) throw new Error('Renderer condition timed out.\\n' + document.body.innerText); await new Promise(resolve => setTimeout(resolve, 100)); } return true; })()`);
}
async function setEditor(index, value) {
  await evaluate(`(() => { const editor = document.querySelectorAll('.cm-content')[${index}]; if (!editor) throw new Error('Editor missing'); editor.focus(); document.execCommand('selectAll'); if (!document.execCommand('insertText', false, ${JSON.stringify(value)})) throw new Error('insertText failed'); })()`);
  await waitFor(`document.querySelectorAll('.cm-content')[${index}]?.textContent === ${JSON.stringify(value)}`);
}

await command('Runtime.enable');
await waitFor(`document.querySelectorAll('.cm-content').length === 2`);
await waitFor(`document.querySelector('.model-load-state.loaded') || document.querySelector('[role="alert"]')`, 300_000);
const startupAlert = await evaluate(`document.querySelector('[role="alert"]')?.textContent`);
if (startupAlert) throw new Error(startupAlert);
await waitFor(`document.querySelectorAll('.field-grid input[type="number"]')[0]?.value === '1024' && document.querySelectorAll('.field-grid input[type="number"]')[1]?.value === '1344'`);
await evaluate(`(() => {
  const numbers = document.querySelectorAll('.field-grid input[type="number"]');
  const sampler = [...document.querySelectorAll('label')].find(label => label.textContent.trim().startsWith('Sampler'))?.querySelector('select');
  window.__waiDefaultsVerified = numbers[0]?.value === '1024' && numbers[1]?.value === '1344' &&
    numbers[2]?.value === '25' && numbers[3]?.value === '6' && sampler?.value === 'euler-ancestral';
})()`);
await setEditor(0, '1girl, detailed eyes, outdoors');
await setEditor(1, 'blurry, low quality');
await evaluate(`(() => {
  const setValue = (element, value) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const numbers = document.querySelectorAll('input[type="number"]');
  for (const [index, value] of [[0, 512], [1, 512], [2, 4], [3, 5], [4, 24680]]) setValue(numbers[index], value);
  const standard = [...document.querySelectorAll('.detail-presets label')].find(label => label.textContent.includes('Standard'));
  if (!standard) throw new Error('Standard Detail Pass preset missing.');
  standard.querySelector('input').click();
})()`);
await evaluate(`document.querySelector('.detail-pass-heading button').click()`);
await waitFor(`Boolean(document.querySelector('.detail-advanced'))`);
await evaluate(`(() => {
  const control = (text, selector = 'input') => {
    const label = [...document.querySelectorAll('.detail-advanced label')].find(candidate => candidate.textContent.trim().startsWith(text));
    if (!label) throw new Error(text + ' control missing.');
    return label.querySelector(selector);
  };
  const setValue = (element, value) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  setValue(control('Scale'), 1.6);
  setValue(control('Denoising strength'), 0.35);
  setValue(control('Second-pass steps'), 13);
  setValue(control('Second-pass prompt', 'select'), 'custom');
  setValue(control('Second-pass negative', 'select'), 'custom');
  setValue(control('Second-pass seed', 'select'), 'custom');
})()`);
await waitFor(`document.querySelectorAll('.detail-advanced textarea').length === 2 && [...document.querySelectorAll('.detail-advanced label')].some(label => label.textContent.includes('Detail seed'))`);
await evaluate(`(() => {
  const setValue = (element, value) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const textareas = document.querySelectorAll('.detail-advanced textarea');
  setValue(textareas[0], 'custom fine detail');
  setValue(textareas[1], 'custom artifacts');
  const seed = [...document.querySelectorAll('.detail-advanced label')].find(label => label.textContent.includes('Detail seed'))?.querySelector('input');
  setValue(seed, 777);
})()`);
await evaluate(`document.querySelector('.detail-pass-heading button').click()`);
await waitFor(`Boolean(document.querySelector('.detail-presets'))`);
await evaluate(`document.querySelector('.detail-pass-heading button').click()`);
await waitFor(`Boolean(document.querySelector('.detail-advanced'))`);
await evaluate(`(() => {
  const labels = [...document.querySelectorAll('.detail-advanced label')];
  const value = text => labels.find(label => label.textContent.trim().startsWith(text))?.querySelector('input, select, textarea')?.value;
  window.__advancedVerified = value('Scale') === '1.6' && value('Denoising strength') === '0.35' &&
    value('Second-pass steps') === '13' && value('Custom detail prompt') === 'custom fine detail' &&
    value('Custom detail negative prompt') === 'custom artifacts' && value('Detail seed') === '777' &&
    document.querySelector('.field-help')?.textContent.includes('Lower values preserve');
})()`);
await evaluate(`document.querySelector('.detail-pass-heading button').click()`);
await waitFor(`Boolean(document.querySelector('.detail-presets'))`);
await evaluate(`(() => {
  const off = [...document.querySelectorAll('.detail-presets label')].find(label => label.textContent.includes('Off'));
  off.querySelector('input').click();
})()`);
await waitFor(`document.querySelector('.resolved-size')?.textContent.includes('Final: 512 × 512')`);
await evaluate(`(() => {
  const standard = [...document.querySelectorAll('.detail-presets label')].find(label => label.textContent.includes('Standard'));
  standard.querySelector('input').click();
  window.__detailStages = [];
  window.__unsubscribeDetailStages = window.zynaloDiffusion.onProgress(event => window.__detailStages.push(event.stage));
})()`);
await waitFor(`document.body.innerText.includes('768')`);
await evaluate(`document.querySelector('form').requestSubmit()`);
await waitFor(`document.querySelector('.result-heading h2')?.textContent === 'Final result' || document.querySelector('[role="alert"]')`, 300_000);
const alert = await evaluate(`document.querySelector('[role="alert"]')?.textContent`);
if (alert) throw new Error(alert);
await evaluate(`(async () => { const image = document.querySelector('.result-card img'); await Promise.race([image.decode(), new Promise(resolve => setTimeout(resolve, 15000))]); })()`);
const report = await evaluate(`(() => {
  window.__unsubscribeDetailStages?.();
  const image = document.querySelector('.result-card img');
  const metadata = document.querySelector('.result-metadata pre')?.textContent ?? '';
  return {
    heading: document.querySelector('.result-heading h2')?.textContent,
    imageUri: image?.src,
    imageComplete: image?.complete,
    naturalWidth: image?.naturalWidth,
    naturalHeight: image?.naturalHeight,
    toggleCount: document.querySelectorAll('.asset-toggle button').length,
    stages: window.__detailStages,
    advancedVerified: window.__advancedVerified,
    waiDefaultsVerified: window.__waiDefaultsVerified,
    hasDetailMetadata: metadata.includes('"detailPass"') && metadata.includes('"processRamBytes"'),
    hasSemanticClipSelection: metadata.includes('"clipLayerSelection": "penultimate-hidden-state"'),
    hasEulerAncestralSelection: metadata.includes('"sampler": "euler-ancestral"'),
  };
})()`);
const requiredStages = ['base-generating', 'upscaling', 'detail-generating', 'final-decoding', 'saving', 'completed'];
if (report.heading !== 'Final result' || !report.imageUri?.startsWith('zynalo-asset://generated/') ||
    !report.imageComplete || report.naturalWidth !== 768 || report.naturalHeight !== 768 ||
    report.toggleCount !== 2 || !report.advancedVerified || !report.waiDefaultsVerified || !report.hasDetailMetadata ||
    !report.hasSemanticClipSelection || !report.hasEulerAncestralSelection ||
    requiredStages.some(stage => !report.stages.includes(stage))) {
  throw new Error(`Unexpected packaged Detail Pass UI result: ${JSON.stringify(report)}`);
}
process.stdout.write(`${JSON.stringify(report)}\n`);
socket.send(JSON.stringify({ id: ++sequence, method: 'Browser.close', params: {} }));
await new Promise((resolve) => setTimeout(resolve, 500));
