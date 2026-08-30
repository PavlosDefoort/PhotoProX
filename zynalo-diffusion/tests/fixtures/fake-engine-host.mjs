import readline from 'node:readline';

const protocol = 'zynalo.diffusion.engine-host/v2';
const mode = process.env.FAKE_HOST_MODE ?? 'normal';
let active = null;
let generations = 0;
let loadedModelId = mode === 'empty' ? null : 'fake-sdxl';
let modelLoadCount = mode === 'empty' ? 0 : 1;

const send = (type, body = {}) => process.stdout.write(`${JSON.stringify({ protocol, type, ...body })}\n`);
send('lifecycle', { event: 'hello', hostVersion: 'test', pid: process.pid });
if (loadedModelId) {
  send('lifecycle', { event: 'model-load-started', modelId: loadedModelId });
  send('lifecycle', { event: 'model-load-completed', modelId: loadedModelId, loadCount: modelLoadCount, elapsedMs: 5 });
}
send('lifecycle', { event: 'ready', ...(loadedModelId ? { modelId: loadedModelId } : {}), loadCount: modelLoadCount });

function response(id, result) {
  send('response', { id, ok: true, result });
}

function runGeneration(jobId, request) {
  let step = 0;
  active = { jobId, timer: setInterval(() => {
    step += 1;
    send('progress', { jobId, stage: 'base-generating', progress: step / request.steps, stageProgress: step / request.steps, overallProgress: step / request.steps, currentStep: step, totalSteps: request.steps, pass: 'base' });
    if (mode === 'crash' && step === 1) process.exit(42);
    if (step >= request.steps) {
      clearInterval(active.timer);
      active = null;
      generations += 1;
      const id = `fakeasset${generations}`;
      send('generation-result', {
        jobId,
        result: {
          jobId, seed: request.seed, durationMs: 15, status: 'completed',
          output: { id, relativePath: `${id}.png`, mimeType: 'image/png', width: request.width, height: request.height },
          baseAsset: { id, relativePath: `${id}.png`, mimeType: 'image/png', width: request.width, height: request.height },
          stages: [{ stage: 'base', durationMs: 10 }], seeds: { baseSeed: request.seed, derivation: 'explicit' },
          parameters: request, basePixelSha256: 'a'.repeat(64),
        },
      });
    }
  }, 10) };
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const command = JSON.parse(line);
  if (mode === 'malformed' && command.command === 'status') {
    process.stdout.write('not-json\n');
    return;
  }
  switch (command.command) {
    case 'inspect-hardware': response(command.id, { backend: 'cuda', deviceName: 'Fake GPU', dedicatedMemoryMb: 16384 }); break;
    case 'list-models': response(command.id, loadedModelId ? [{ id: loadedModelId, name: 'Fake SDXL', family: 'Diffusers SDXL', installed: true }] : []); break;
    case 'status': response(command.id, { state: active ? 'generating' : 'ready', modelLoadCount, generationCount: generations, ...(active ? { activeJobId: active.jobId } : {}), ...(loadedModelId ? { loadedModelId } : {}) }); break;
    case 'runtime-diagnostics': response(command.id, { pythonVersion: '3.10.6', packages: { torch: '2.11.0', diffusers: '0.40.0', transformers: '5.15.1', safetensors: '0.8.0' }, cudaAvailable: true, cudaRuntime: '12.8', gpuName: 'Fake GPU', computeCapability: '12.0', totalVramMb: 16384, allocatedMb: 8000, reservedMb: 9000, driver: null }); break;
    case 'load-model':
      loadedModelId = command.payload.model.id;
      modelLoadCount += 1;
      send('lifecycle', { event: 'model-load-started', modelId: loadedModelId });
      send('lifecycle', { event: 'model-load-completed', modelId: loadedModelId, loadCount: modelLoadCount, elapsedMs: 5 });
      response(command.id, { modelId: loadedModelId, loadCount: modelLoadCount });
      break;
    case 'unload-model': loadedModelId = null; response(command.id, null); break;
    case 'generate': {
      const jobId = `fakejob${generations + 1}`;
      response(command.id, { jobId });
      runGeneration(jobId, command.payload.request);
      break;
    }
    case 'cancel':
      response(command.id, null);
      if (active?.jobId === command.payload.jobId) {
        clearInterval(active.timer);
        const jobId = active.jobId;
        active = null;
        send('generation-error', { jobId, error: { code: 'CANCELLED', message: `Generation ${jobId} was cancelled.`, retryable: true } });
      }
      break;
    case 'shutdown':
      send('lifecycle', { event: 'shutting-down', ...(loadedModelId ? { modelId: loadedModelId } : {}) });
      response(command.id, null);
      send('lifecycle', { event: 'stopped', ...(loadedModelId ? { modelId: loadedModelId } : {}), loadCount: modelLoadCount });
      process.exit(0);
  }
});
