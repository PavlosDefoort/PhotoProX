# Shared-code migration inventory

These packages remain inside the Diffusion workspace until Studio consumes a
real shared generation workflow. Future locations are proposals, not current
imports.

| Current module | Potential future location | Potential Studio consumer | Platform-neutral now? | Before sharing |
| --- | --- | --- | --- | --- |
| `packages/diffusion-contracts` | `packages/diffusion-contracts` | Generation request/result and validation adapters | Mostly | Remove Electron/renderer assumptions from any new additions |
| `packages/prompt-language` | `packages/prompt-language` | Studio prompt or generation workflow | Yes, core parser/catalog | Define compatibility/versioning and keep catalog licensing explicit |
| `packages/diffusion-engine` | `packages/engine-client` | Studio generation service adapter | Partly | Separate host/process lifecycle from transport contracts |
| `apps/diffusion/src/main/model-library.ts` | `packages/model-management` plus app adapter | Studio model selection/import UI | No | Extract storage paths and Electron dialogs behind interfaces |
| `apps/diffusion/src/main/tag-catalog.ts` | `packages/prompt-language` support data | Studio prompt assistance | Partly | Make data loading injectable and preserve upstream attribution |
| `apps/diffusion/src/renderer/*` | Stays app-specific | None unless a headless primitive is identified | No | Do not share product layout or Electron-facing components |
| `spikes/diffusers-sdxl/*` | Stays engine-host-specific | None directly | No | Keep Python/PyTorch process boundary and runtime assumptions isolated |

The migration trigger is Studio's first real use of the shared generation
workflow. Until then, moving modules would create coupling without a proven
consumer.
