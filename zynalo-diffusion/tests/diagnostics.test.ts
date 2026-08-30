import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDiagnostics, redactLocation, serializedDiagnostics } from '../apps/diffusion/src/main/diagnostics';
import { ModelLibrary } from '../apps/diffusion/src/main/model-library';
import type { PythonDiffusionEngine } from '@zynalo/diffusion-engine';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

describe('diagnostics privacy and runtime reporting', () => {
  it('redacts locations and excludes prompts, environment, credentials, and images', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'zynalo-diag-')); roots.push(root);
    const library = new ModelLibrary(root, undefined, 0); await library.initialize();
    const python = { runtimeDiagnostics: vi.fn().mockResolvedValue({
      pythonVersion: '3.10.6', packages: { torch: '2.11.0', diffusers: '0.40.0', transformers: '5.15.1', safetensors: '0.8.0' },
      cudaAvailable: true, cudaRuntime: '12.8', gpuName: 'RTX Test', computeCapability: '12.0', totalVramMb: 16000,
      allocatedMb: 10, reservedMb: 20, driver: null,
    }) } as unknown as PythonDiffusionEngine;
    const report = await buildDiagnostics({ version: '0.1.0', packaged: false, userData: root, outputRoot: path.join(root, 'generated-assets'), pythonExecutable: 'C:\\Secret\\python.exe', python, library, engineState: () => 'ready' });
    const serialized = serializedDiagnostics(report);
    expect(report.python.executable.value).toBe('python.exe');
    expect(serialized).not.toContain(root);
    expect(serialized).not.toMatch(/prompt|credential|environment variable|generated image/i);
    expect(report.gpu.cudaAvailable.severity).toBe('healthy');
  });

  it('provides actionable blocking states when Python is absent', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'zynalo-diag-')); roots.push(root);
    const library = new ModelLibrary(root); await library.initialize();
    const report = await buildDiagnostics({ version: '0.1.0', packaged: true, userData: root, outputRoot: path.join(root, 'generated-assets'), python: null, library, engineState: () => 'mock-only' });
    expect(report.python.executable).toMatchObject({ severity: 'blocking', action: expect.stringContaining('Configure') });
    expect(redactLocation(path.join(root, 'generated-assets'))).not.toContain(root);
  });
});
