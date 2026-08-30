const port = Number(process.argv[2] ?? 9444);
const realMode = process.argv[3] === 'real';
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
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
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
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out.`)); }, 120_000);
    pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
await command('Runtime.enable');
const report = await evaluate(`(async () => {
  const bridge = window.zynaloDiffusion;
  const models = await bridge.listModels();
  const model = ${realMode ? "models.find(item => item.id !== 'mock-starter-v1')" : "models.find(item => item.id === 'mock-starter-v1')"};
  if (!model) throw new Error('Requested packaged smoke model is unavailable.');
  const loaded = await bridge.getLoadedModel();
  if (loaded.loadedModelId !== model.id) await bridge.loadModel(model.id);
  const stages = [];
  const unsubscribe = bridge.onProgress(event => stages.push({ stage: event.stage, overall: event.overallProgress }));
  const request = {
    prompt: 'packaged detail smoke', negativePrompt: '', modelId: model.id, seed: 24680,
    width: 512, height: 512, steps: 2, guidance: 5,
    detailPass: { enabled: true, upscaler: 'lanczos', scale: 1.5, targetWidth: 768, targetHeight: 768,
      lockAspectRatio: true, strength: 0.3, steps: 12, promptMode: 'inherit', negativePromptMode: 'inherit',
      seedMode: 'derived', seed: 2654460449 }
  };
  const started = await bridge.generate(request);
  const result = await bridge.result(started.jobId);
  unsubscribe();
  const image = new Image();
  const assetEvent = new Promise(resolve => { image.onload = () => resolve('load'); image.onerror = () => resolve('error'); setTimeout(() => resolve('timeout'), 15000); });
  image.src = result.finalAsset.uri; document.body.append(image);
  const assetOutcome = await assetEvent;
  const assetLoaded = assetOutcome === 'load' && image.complete && image.naturalWidth === 768 && image.naturalHeight === 768;
  image.remove();
  return { result, stages, assetLoaded, assetOutcome, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, modelId: model.id };
})()`);
const expectedUri = realMode ? 'zynalo-asset://generated/' : 'zynalo-asset://mock/';
const expectedMime = realMode ? 'image/png' : 'image/svg+xml';
if (report.result.status !== 'completed' || report.result.finalAsset.width !== 768 || report.result.finalAsset.height !== 768 ||
    !report.stages.some((event) => event.stage === 'base-generating') || !report.stages.some((event) => event.stage === 'upscaling') ||
    !report.stages.some((event) => event.stage === 'detail-generating') || !report.assetLoaded ||
    !report.result.finalAsset.uri.startsWith(expectedUri) || report.result.finalAsset.mimeType !== expectedMime) {
  throw new Error(`Unexpected packaged Detail Pass result: ${JSON.stringify(report)}`);
}
process.stdout.write(`${JSON.stringify(report)}\n`);
socket.send(JSON.stringify({ id: ++sequence, method: 'Browser.close', params: {} }));
await new Promise((resolve) => setTimeout(resolve, 500));
