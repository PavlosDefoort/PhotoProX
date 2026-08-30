import type { JobPayload, ResolvedGenerateRequest, ValidationResult } from '@zynalo/diffusion-contracts';
import { resolveGenerateRequest, validateGenerateRequest, validateJobPayload } from '@zynalo/diffusion-contracts';

export function parseGeneratePayload(value: unknown): ResolvedGenerateRequest {
  return resolveGenerateRequest(unwrap(validateGenerateRequest(value)));
}

export function parseJobPayload(value: unknown): JobPayload {
  return unwrap(validateJobPayload(value));
}

export function isTrustedRendererUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'zynalo:' && url.hostname === 'app'; }
  catch { return false; }
}

function unwrap<T>(result: ValidationResult<T>): T {
  if (result.success) return result.data;
  throw new TypeError(result.issues.map((issue) => `${issue.path || 'payload'}: ${issue.message}`).join(' '));
}
