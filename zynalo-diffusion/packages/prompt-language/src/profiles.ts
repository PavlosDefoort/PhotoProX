import type { PromptModelProfile } from './types';

export const WAI_ILLUSTRIOUS_PROFILE: PromptModelProfile = Object.freeze({
  id: 'wai-illustrious-sdxl-v1',
  displayName: 'WAI Illustrious SDXL',
  dialect: 'booru',
  catalogId: 'zynalo-wai-development',
  recommendation: 'Use concise, comma-separated Booru tags. Quality and negative tags are optional and are never injected automatically.',
  recommendedPositiveTags: ['masterpiece', 'best_quality'],
  recommendedNegativeTags: [],
  // WebUI "Clip skip 2" for this SDXL model means the penultimate hidden state.
  // Diffusers SDXL already selects that layer when its numeric clip_skip argument is None.
  clipLayerSelection: 'penultimate-hidden-state',
  generationDefaults: {
    width: 1024,
    height: 1344,
    steps: 25,
    guidance: 6,
    sampler: 'euler-ancestral' as const,
  },
  detailPassPresets: {
    standard: { scale: 1.5, strength: 0.35, steps: 20, upscaler: 'realesrgan-anime6b' as const },
    strong: { scale: 1.5, strength: 0.5, steps: 20, upscaler: 'realesrgan-anime6b' as const },
  },
});

const PROFILE_BY_CHECKPOINT_SHA256: Readonly<Record<string, string>> = Object.freeze({
  befc694a296f75e996488ebf9f9db8a1493bd059b6e704b975829e87d5aeb4fa: WAI_ILLUSTRIOUS_PROFILE.id,
});

export function promptProfileIdForCheckpointSha(sha256: string): string | undefined {
  return PROFILE_BY_CHECKPOINT_SHA256[sha256.toLowerCase()];
}

export function getPromptModelProfile(id: string | undefined): PromptModelProfile | undefined {
  return id === WAI_ILLUSTRIOUS_PROFILE.id ? WAI_ILLUSTRIOUS_PROFILE : undefined;
}
