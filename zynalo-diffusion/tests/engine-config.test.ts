import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { resolvePythonEngineOptions } from '../apps/diffusion/src/main/engine-config';

const roots: string[] = [];
const environmentKeys = ['ZYNALO_DIFFUSION_PYTHON', 'ZYNALO_DIFFUSION_CHECKPOINT', 'ZYNALO_DIFFUSION_ANIME6B_MODEL'] as const;
const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

afterEach(async () => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

it('discovers Anime6B in the standard sibling WebUI model folder', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zynalo-engine-config-')); roots.push(root);
  const stableDiffusion = path.join(root, 'models', 'Stable-diffusion');
  const realEsrgan = path.join(root, 'models', 'RealESRGAN');
  await mkdir(stableDiffusion, { recursive: true }); await mkdir(realEsrgan, { recursive: true });
  const python = path.join(root, 'python.exe'); const checkpoint = path.join(stableDiffusion, 'wai.safetensors');
  const anime6b = path.join(realEsrgan, 'RealESRGAN_x4plus_anime_6B.pth');
  await Promise.all([writeFile(python, ''), writeFile(checkpoint, ''), writeFile(anime6b, '')]);
  process.env.ZYNALO_DIFFUSION_PYTHON = python;
  process.env.ZYNALO_DIFFUSION_CHECKPOINT = checkpoint;
  delete process.env.ZYNALO_DIFFUSION_ANIME6B_MODEL;
  expect(resolvePythonEngineOptions(path.join(root, 'user-data'), root, false)?.anime6bModel).toBe(anime6b);
});
