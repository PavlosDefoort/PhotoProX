import { spawn } from 'node:child_process';
import path from 'node:path';

const [python, checkpoint] = process.argv.slice(2);
const moduleRoot = path.resolve('spikes/diffusers-sdxl/src');
const child = spawn(python, [
  '-u', '-m', 'zynalo_sdxl_spike.host', '--checkpoint', checkpoint,
  '--output-root', path.resolve('.test-output/node-launch'), '--model-id', 'wai-illustrious-sdxl-v15',
  '--model-name', 'WAI Illustrious SDXL v15', '--config', 'OnomaAIResearch/Illustrious-xl-early-release-v0',
  '--device', '0', '--dtype', 'float16', '--offline',
], {
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONPATH: moduleRoot, CUBLAS_WORKSPACE_CONFIG: ':4096:8' },
  shell: false,
});
let buffer = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  buffer += chunk;
  if (buffer.includes('"event":"ready"')) {
    child.stdin.write(`${JSON.stringify({ protocol: 'zynalo.diffusion.engine-host/v1', type: 'command', id: 'done', command: 'shutdown', payload: {} })}\n`);
    buffer = '';
  }
});
child.stderr.pipe(process.stderr);
child.on('exit', (code) => { process.exitCode = code ?? 1; });
