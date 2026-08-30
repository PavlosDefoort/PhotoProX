import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { PythonEngineOptions } from '@zynalo/diffusion-engine';

interface EngineConfigFile {
  enabled?: boolean;
  pythonExecutable: string;
  checkpoint?: string;
  anime6bModel?: string;
  configSource?: string;
  modelId?: string;
  modelName?: string;
  deviceIndex?: number;
  dtype?: 'float16' | 'bfloat16' | 'float32';
  offline?: boolean;
}

const CONFIG_KEYS = new Set([
  'enabled', 'pythonExecutable', 'checkpoint', 'anime6bModel', 'configSource', 'modelId', 'modelName',
  'deviceIndex', 'dtype', 'offline',
]);

function requiredFile(value: unknown, label: string): string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || !existsSync(value)) {
    throw new Error(`${label} must be an existing absolute file path.`);
  }
  return value;
}

function discoverSiblingAnime6b(checkpoint: string | undefined): string | undefined {
  if (!checkpoint) return undefined;
  const candidate = path.resolve(path.dirname(checkpoint), '..', 'RealESRGAN', 'RealESRGAN_x4plus_anime_6B.pth');
  return existsSync(candidate) ? candidate : undefined;
}

function parseConfig(value: unknown): EngineConfigFile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Engine configuration must be a JSON object.');
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !CONFIG_KEYS.has(key))) {
    throw new Error('Engine configuration contains an unexpected field.');
  }
  const pythonExecutable = requiredFile(record.pythonExecutable, 'pythonExecutable');
  const checkpoint = record.checkpoint === undefined ? undefined : requiredFile(record.checkpoint, 'checkpoint');
  const anime6bModel = record.anime6bModel === undefined ? undefined : requiredFile(record.anime6bModel, 'anime6bModel');
  if (checkpoint && path.extname(checkpoint).toLowerCase() !== '.safetensors') throw new Error('checkpoint must be a .safetensors file.');
  if (anime6bModel && path.extname(anime6bModel).toLowerCase() !== '.pth') throw new Error('anime6bModel must be a .pth file.');
  if (record.enabled !== undefined && typeof record.enabled !== 'boolean') throw new Error('enabled must be boolean.');
  if (record.configSource !== undefined && typeof record.configSource !== 'string') throw new Error('configSource must be text.');
  for (const field of ['modelId', 'modelName'] as const) {
    if (record[field] !== undefined && (typeof record[field] !== 'string' || record[field].length < 1 || record[field].length > 200)) {
      throw new Error(`${field} must be non-empty text.`);
    }
  }
  if (record.deviceIndex !== undefined && (!Number.isInteger(record.deviceIndex) || (record.deviceIndex as number) < 0)) {
    throw new Error('deviceIndex must be a non-negative integer.');
  }
  if (record.dtype !== undefined && !['float16', 'bfloat16', 'float32'].includes(String(record.dtype))) {
    throw new Error('dtype is invalid.');
  }
  if (record.offline !== undefined && typeof record.offline !== 'boolean') throw new Error('offline must be boolean.');
  return { ...record, pythonExecutable, ...(checkpoint ? { checkpoint } : {}), ...(anime6bModel ? { anime6bModel } : {}) } as EngineConfigFile;
}

export function resolvePythonEngineOptions(
  userData: string,
  resourcesPath: string,
  packaged: boolean,
): PythonEngineOptions | null {
  const envPython = process.env.ZYNALO_DIFFUSION_PYTHON;
  const envCheckpoint = process.env.ZYNALO_DIFFUSION_CHECKPOINT;
  const envAnime6bModel = process.env.ZYNALO_DIFFUSION_ANIME6B_MODEL;
  let config: EngineConfigFile | null;

  if (envPython || envCheckpoint || envAnime6bModel) {
    if (!envPython) throw new Error('ZYNALO_DIFFUSION_PYTHON is required when engine models are configured through the environment.');
    config = parseConfig({
      pythonExecutable: envPython,
      ...(envCheckpoint ? { checkpoint: envCheckpoint } : {}),
      ...(envAnime6bModel ? { anime6bModel: envAnime6bModel } : {}),
      ...(process.env.ZYNALO_DIFFUSION_CONFIG ? { configSource: process.env.ZYNALO_DIFFUSION_CONFIG } : {}),
      ...(process.env.ZYNALO_DIFFUSION_MODEL_ID ? { modelId: process.env.ZYNALO_DIFFUSION_MODEL_ID } : {}),
      ...(process.env.ZYNALO_DIFFUSION_MODEL_NAME ? { modelName: process.env.ZYNALO_DIFFUSION_MODEL_NAME } : {}),
      offline: process.env.ZYNALO_DIFFUSION_OFFLINE !== '0',
    });
  } else {
    const configPath = path.join(userData, 'engine-config.json');
    if (!existsSync(configPath)) return null;
    config = parseConfig(JSON.parse(readFileSync(configPath, 'utf8')) as unknown);
  }
  if (config.enabled === false) return null;
  const anime6bModel = config.anime6bModel ?? discoverSiblingAnime6b(config.checkpoint);

  const options: PythonEngineOptions = {
    pythonExecutable: config.pythonExecutable,
    configSource: config.configSource ?? 'OnomaAIResearch/Illustrious-xl-early-release-v0',
    modelId: config.modelId ?? 'wai-illustrious-sdxl-v15',
    modelName: config.modelName ?? 'WAI Illustrious SDXL v15',
    deviceIndex: config.deviceIndex ?? 0,
    dtype: config.dtype ?? 'float16',
    offline: config.offline ?? true,
    moduleRoot: packaged ? resourcesPath : path.resolve(__dirname, '../../../../spikes/diffusers-sdxl/src'),
    outputRoot: path.join(userData, 'generated-assets'),
    ...(anime6bModel ? { anime6bModel } : {}),
  };
  if (config.checkpoint) {
    options.checkpoint = config.checkpoint;
    options.modelId = config.modelId ?? 'wai-illustrious-sdxl-v15';
    options.modelName = config.modelName ?? 'WAI Illustrious SDXL v15';
  }
  return options;
}
