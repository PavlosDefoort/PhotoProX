import type { DiffusionBridge } from '@zynalo/diffusion-contracts';

declare global {
  interface Window {
    zynaloDiffusion: DiffusionBridge;
  }
}

export {};
