import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const port = Number(process.argv[2] ?? 9333);
const deadline = Date.now() + 120_000;
let page;
while (Date.now() < deadline) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    page = pages.find((candidate) => candidate.type === 'page' && candidate.url.startsWith('zynalo://app/'));
    if (page) break;
  } catch { /* The packaged app may not be listening yet. */ }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
if (!page) throw new Error('Packaged renderer did not expose a debuggable app page.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let sequence = 0;
const pending = new Map();
const protocolEvents = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const handler = pending.get(message.id);
  if (handler) { pending.delete(message.id); handler(message); }
  else if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled') protocolEvents.push(message);
});
function command(method, params = {}) {
  sequence += 1;
  const id = sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out.`)); }, 360_000);
    pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Renderer evaluation failed.');
  return result.result.value;
}
async function waitFor(expression, timeout = 120_000) {
  return evaluate(`(async () => { const started = Date.now(); while (!(${expression})) { if (Date.now() - started > ${timeout}) throw new Error('Renderer condition timed out.\\n' + document.body.innerText); await new Promise(resolve => setTimeout(resolve, 100)); } return true; })()`);
}
async function setEditor(index, value) {
  await evaluate(`(() => { const editor = document.querySelectorAll('.cm-content')[${index}]; if (!editor) throw new Error('Editor ${index} missing'); editor.focus(); document.execCommand('selectAll'); if (!document.execCommand('insertText', false, ${JSON.stringify(value)})) throw new Error('insertText failed'); return editor.textContent; })()`);
  await waitFor(`document.querySelectorAll('.cm-content')[${index}]?.textContent === ${JSON.stringify(value)}`);
}
async function pressKey(key, code, modifiers = 0) {
  const windowsVirtualKeyCode = key.length === 1 ? key.toUpperCase().charCodeAt(0) : key === 'Enter' ? 13 : key === 'Tab' ? 9 : 27;
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode, nativeVirtualKeyCode: 0 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode, nativeVirtualKeyCode: 0 });
}

await command('Runtime.enable');
await command('Page.enable');
await waitFor(`document.querySelectorAll('.cm-editor').length === 2`);

await setEditor(0, 'nami one');
await pressKey(' ', 'Space', 2);
await new Promise((resolve) => setTimeout(resolve, 1_000));
if (!await evaluate(`Boolean(document.querySelector('.cm-tooltip-autocomplete li'))`)) {
  await pressKey(' ', 'Space', 2);
  try { await waitFor(`Boolean(document.querySelector('.cm-tooltip-autocomplete li'))`, 5_000); }
  catch { throw new Error(`Completion popup missing: ${JSON.stringify(protocolEvents)}`); }
}
await waitFor(`document.querySelector('.cm-tooltip-autocomplete li')?.textContent?.includes('nami_(one_piece)')`);
const completionLabel = await evaluate(`document.querySelector('.cm-tooltip-autocomplete li')?.textContent`);
await pressKey('Enter', 'Enter');
await waitFor(`document.querySelectorAll('.cm-content')[0]?.textContent === 'nami_(one_piece)'`);
const explanationAfterCompletion = await evaluate(`document.querySelector('.tag-inspector')?.textContent`);

const beforeFix = 'nami_(one_piece), 2girls, solo, blue eye, full_body, upper_body, custom_trigger_xyz';
const negativePrompt = 'blurry, bad anatomy, custom_negative_xyz ';
await pressKey('Escape', 'Escape');
await setEditor(0, beforeFix);
await setEditor(1, negativePrompt);
await waitFor(`[...document.querySelectorAll('.quick-fixes button')].some(button => button.textContent.includes('blue eye') && button.textContent.includes('blue_eyes'))`);
const problemTextBeforeFix = await evaluate(`document.querySelector('.problems-panel')?.textContent`);

await evaluate(`(() => { const problem = [...document.querySelectorAll('.problem-message')].find(button => button.textContent.includes('Nami is associated')); if (!problem) throw new Error('Nami association problem missing'); problem.click(); })()`);
await waitFor(`document.querySelector('.tag-inspector')?.textContent?.includes('Associated tag: one_piece')`);
const problemNavigationSelection = await evaluate(`window.getSelection()?.toString()`);

await evaluate(`(() => { const button = [...document.querySelectorAll('.quick-fixes button')].find(candidate => candidate.textContent.includes('blue eye') && candidate.textContent.includes('blue_eyes')); if (!button) throw new Error('Blue-eye fix missing'); button.click(); })()`);
await waitFor(`document.querySelectorAll('.cm-content')[0]?.textContent?.includes('blue_eyes')`);
await pressKey('z', 'KeyZ', 2);
await waitFor(`document.querySelectorAll('.cm-content')[0]?.textContent?.includes('blue eye,')`);
const undoRestoredMisspelling = await evaluate(`document.querySelectorAll('.cm-content')[0]?.textContent`);
await evaluate(`(() => { const button = [...document.querySelectorAll('.quick-fixes button')].find(candidate => candidate.textContent.includes('blue eye') && candidate.textContent.includes('blue_eyes')); if (!button) throw new Error('Blue-eye fix missing after undo'); button.click(); })()`);
await waitFor(`document.querySelectorAll('.cm-content')[0]?.textContent?.includes('blue_eyes')`);
await waitFor(`![...document.querySelectorAll('.quick-fixes button')].some(candidate => candidate.textContent.includes('blue eye') && candidate.textContent.includes('blue_eyes'))`);
await evaluate(`(() => { const button = [...document.querySelectorAll('.quick-fixes button')].find(candidate => candidate.textContent.includes('Add associated series tag')); if (!button) throw new Error('Series fix missing'); button.click(); })()`);
const finalPositive = `${beforeFix.replace('blue eye', 'blue_eyes')}, one_piece`;
await waitFor(`document.querySelectorAll('.cm-content')[0]?.textContent === ${JSON.stringify(finalPositive)}`);

await evaluate(`(() => { const select = document.querySelector('.guidance-select select'); select.value = 'important'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await waitFor(`localStorage.getItem('zynalo.tags-workspace.v1')?.includes('important')`);
await command('Page.reload', { ignoreCache: true });
await waitFor(`document.querySelectorAll('.cm-editor').length === 2`);
await waitFor(`document.querySelectorAll('.cm-content')[0]?.textContent === ${JSON.stringify(finalPositive)}`);
const restored = await evaluate(`({ positive: document.querySelectorAll('.cm-content')[0]?.textContent, negative: document.querySelectorAll('.cm-content')[1]?.textContent, guidance: document.querySelector('.guidance-select select')?.value })`);

await waitFor(`document.querySelectorAll('select option').length >= 2`);
if (!await evaluate(`Boolean(document.querySelector('.model-load-state.loaded'))`)) {
  await evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent === 'Load model')?.click()`);
  await waitFor(`document.querySelector('.model-load-state.loaded') || document.querySelector('[role="alert"]')`, 300_000);
}
await setEditor(0, '(smile:1.2');
await waitFor(`[...document.querySelectorAll('.problem-item.error')].some(item => item.textContent.includes('Weighted expression is not closed'))`);
await evaluate(`document.querySelector('form').requestSubmit()`);
await waitFor(`document.querySelector('[role="alert"]')?.textContent?.includes('blocking prompt error')`);
const malformedBlocked = await evaluate(`document.querySelector('[role="alert"]')?.textContent`);
await setEditor(0, finalPositive);
await pressKey('Escape', 'Escape');

await evaluate(`(() => { const setValue = (element, value) => { Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, String(value)); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }; const numbers = document.querySelectorAll('input[type="number"]'); setValue(numbers[0], 512); setValue(numbers[1], 512); setValue(numbers[2], 4); setValue(numbers[3], 5); setValue(numbers[4], 24680); })()`);
await evaluate(`document.querySelector('[role="alert"] button')?.click()`);
const previousUri = await evaluate(`document.querySelector('.result-card img')?.src`);
await evaluate(`document.querySelector('form').requestSubmit()`);
await waitFor(`(document.querySelector('.result-heading h2')?.textContent === 'Generation complete' && document.querySelector('.result-card img')?.src !== ${JSON.stringify(previousUri)}) || document.querySelector('[role="alert"]')`, 180_000);
const alert = await evaluate(`document.querySelector('[role="alert"]')?.textContent`);
if (alert) throw new Error(alert);
await evaluate(`(async () => { const image = document.querySelector('.result-card img'); await Promise.race([image.decode(), new Promise(resolve => setTimeout(resolve, 5000))]); })()`);
const generation = await evaluate(`(() => { const image = document.querySelector('.result-card img'); const details = [...document.querySelectorAll('.result-card dl > div')].map(row => [row.querySelector('dt')?.textContent, row.querySelector('dd')?.textContent]); return { heading: document.querySelector('.result-heading h2')?.textContent, imageUri: image.src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete, assetId: details.find(([label]) => label === 'Asset')?.[1], rawPositive: document.querySelectorAll('.cm-content')[0]?.textContent, rawNegative: document.querySelectorAll('.cm-content')[1]?.textContent, profileNote: document.querySelector('.profile-note')?.textContent }; })()`);

await evaluate(`(() => { const label = [...document.querySelectorAll('.detail-presets label')].find(candidate => candidate.textContent.includes('Standard')); if (!label) throw new Error('Standard Detail Pass preset missing'); label.querySelector('input').click(); })()`);
const baseUri = generation.imageUri;
await evaluate(`document.querySelector('form').requestSubmit()`);
await waitFor(`(document.querySelector('.result-heading h2')?.textContent === 'Final result' && document.querySelector('.result-card img')?.src !== ${JSON.stringify(baseUri)}) || document.querySelector('[role="alert"]')`, 300_000);
const detailAlert = await evaluate(`document.querySelector('[role="alert"]')?.textContent`);
if (detailAlert) throw new Error(detailAlert);
await evaluate(`(async () => { const image = document.querySelector('.result-card img'); await Promise.race([image.decode(), new Promise(resolve => setTimeout(resolve, 5000))]); })()`);
const detailGeneration = await evaluate(`(() => { const image = document.querySelector('.result-card img'); return { heading: document.querySelector('.result-heading h2')?.textContent, imageUri: image.src, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, toggleCount: document.querySelectorAll('.asset-toggle button').length, metadata: document.querySelector('.result-metadata pre')?.textContent }; })()`);

const diagnostics = await evaluate(`window.zynaloDiffusion.getDiagnostics()`);
const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
const screenshotPath = path.resolve('.test-output', 'packaged-tags-renderer.png');
await mkdir(path.dirname(screenshotPath), { recursive: true });
await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
const panels = await evaluate(`(async () => { const click = text => [...document.querySelectorAll('nav button')].find(button => button.textContent === text).click(); click('Model Library'); await new Promise(resolve => setTimeout(resolve, 500)); const modelCards = document.querySelectorAll('.model-card').length; click('Diagnostics'); const started = Date.now(); while (document.querySelectorAll('.diagnostic-card').length < 4) { if (Date.now() - started > 60000) throw new Error('Diagnostics panel timed out'); await new Promise(resolve => setTimeout(resolve, 250)); } return { modelCards, diagnosticCards: document.querySelectorAll('.diagnostic-card').length }; })()`);

const result = { completionLabel, explanationAfterCompletion, problemTextBeforeFix, problemNavigationSelection, undoRestoredMisspelling, restored, malformedBlocked, ...generation, detailGeneration, diagnosticsSchema: diagnostics.schema, ...panels, screenshotPath };
if (!completionLabel.includes('nami_(one_piece)') || !explanationAfterCompletion.includes('Nami') || !problemTextBeforeFix.includes('2girls') || !problemTextBeforeFix.includes('full_body') || !undoRestoredMisspelling.includes('blue eye') || restored.positive !== finalPositive || restored.negative !== negativePrompt || restored.guidance !== 'important' || !malformedBlocked.includes('blocking prompt error') || generation.heading !== 'Generation complete' || !generation.imageUri.startsWith('zynalo-asset://generated/') || generation.naturalWidth !== 512 || generation.naturalHeight !== 512 || generation.rawPositive !== finalPositive || generation.rawNegative !== negativePrompt || detailGeneration.heading !== 'Final result' || !detailGeneration.imageUri.startsWith('zynalo-asset://generated/') || detailGeneration.naturalWidth !== 768 || detailGeneration.naturalHeight !== 768 || detailGeneration.toggleCount !== 2 || !detailGeneration.metadata?.includes('detailPass') || diagnostics.schema !== 'zynalo.diffusion.diagnostics/v1' || panels.modelCards < 1 || panels.diagnosticCards < 4) throw new Error(`Unexpected packaged renderer result: ${JSON.stringify(result)}`);
process.stdout.write(`${JSON.stringify(result)}\n`);
sequence += 1;
socket.send(JSON.stringify({ id: sequence, method: 'Browser.close', params: {} }));
await new Promise((resolve) => setTimeout(resolve, 500));
