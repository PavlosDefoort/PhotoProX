import { describe, expect, it } from 'vitest';
import { isTrustedRendererUrl, parseGeneratePayload, parseJobPayload } from '../apps/diffusion/src/main/ipc-validation';

describe('main-process IPC validation', () => {
  it('throws before invalid generation payloads reach the engine', () => {
    expect(() => parseGeneratePayload({ prompt: 'missing all numeric fields' })).toThrow(TypeError);
  });

  it('only accepts the narrow job payload shape', () => {
    expect(parseJobPayload({ jobId: 'mock-abc_123' })).toEqual({ jobId: 'mock-abc_123' });
    expect(() => parseJobPayload({ jobId: 'mock-abc', extra: true })).toThrow(TypeError);
  });
});

describe('renderer sender validation', () => {
  it('accepts only the privileged application origin', () => {
    expect(isTrustedRendererUrl('zynalo://app/index.html')).toBe(true);
    expect(isTrustedRendererUrl('zynalo://evil/index.html')).toBe(false);
    expect(isTrustedRendererUrl('file:///C:/secret')).toBe(false);
    expect(isTrustedRendererUrl('not a URL')).toBe(false);
  });
});
