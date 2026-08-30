# ADR 0007: Detail Pass is a recoverable two-pass SDXL img2img workflow

- Status: Accepted
- Date: 2026-08-27

## Context

Users want larger SDXL output with newly synthesized fine detail, but should not need to understand latent noise schedules or image-to-image terminology. A conventional resize produces more pixels without model detail. Loading an SDXL Refiner or a second copy of the checkpoint would change the product and exceed the residency and VRAM constraints of the persistent engine.

The application already treats Electron main and the Python JSONL host as trust boundaries, keeps one selected checkpoint resident, saves generated files below an application-owned root, and exposes only restricted asset IDs to the sandboxed renderer.

## Decision

The default product term is **Detail Pass**. Advanced controls may identify the mechanism as **High-res fix**.

An enabled request explicitly contains base dimensions and all final-pass settings. The engine generates and decodes the base image, atomically saves it, resizes it in memory to the exact aligned final dimensions, and runs SDXL img2img with a separate seeded generator. It then atomically saves the final PNG. This is a true second diffusion pass, not a pixel-only enlargement and not SDXL Refiner.

Lanczos is the first production upscaler because Pillow provides a bounded, deterministic, dependency-free in-memory implementation. The final SDXL pass is constructed with Diffusers 0.40.0 `AutoPipelineForImage2Image.from_pipe`. Zynalo checks that the U-Net, VAE, and both text encoders are shared by object identity. It clones only the scheduler configuration because scheduler timesteps are mutable across calls. Switching or unloading a model clears both pipeline wrappers before cache collection.

R-ESRGAN 4x+ Anime6B is also an optional production strategy for WAI. Its exact official SHA-256 is allow-listed, PyTorch loads only weights, and the six-block RRDBNet state dictionary must match strictly. Inference is tiled in memory at native 4Ã— and Lanczos resolves that neural output to the exact requested final dimensions. Electron main supplies the trusted local model path; renderer requests contain only the semantic upscaler ID, and no model download is implicit.

Latent upscaling is not exposed. It will become eligible only after a spike correctly applies SDXL latent scaling, interpolation, strength-to-timestep selection, deterministic noise, denoising, and final decode, and compares quality and memory against Lanczos. Merely interpolating and decoding a latent is explicitly insufficient.

The renderer resolves random base seeds before submission. Derived detail seeds use unsigned 32-bit addition:

```text
detailSeed = (baseSeed + 0x9e3779b9) mod 2^32
derivation = zynalo-detail-seed-v1
```

The Python host validates the derived value and uses a separate CUDA `torch.Generator`. Reproducibility claims are limited to the same supported hardware/runtime stack.

WAI SDXL selects prompt-conditioning layers by semantic name rather than by a portable-looking integer. Its profile resolves to `penultimate-hidden-state`, corresponding to WebUI **Clip skip 2**. In Diffusers 0.40.0, both SDXL txt2img and img2img already use `hidden_states[-2]` when `clip_skip` is `None`; Diffusers `clip_skip=2` instead means `hidden_states[-4]`. Both Zynalo passes therefore map the semantic selection to `clip_skip=None`. Metadata records that mapping for the two hidden-state encoders and separately identifies the final pooled output from text encoder 2.

Protocol v2 reports stage-local and monotonic overall progress for base generation, resize, detail generation, decoding, and saving. Once the base pass completes, its PNG is saved before risky larger allocations. Cancellation or failure after that boundary returns a structured `cancelled` or `base-only` result with the base asset and actionable failure information. Zynalo does not silently retry with altered settings.

## Consequences

- Ordinary requests remain source-compatible; an absent Detail Pass resolves to `{ enabled: false }`.
- Protocol v1 peers fail the version check rather than misreading the expanded progress/result shape.
- Guided preset values are data-driven and model-profile-overridable. Advanced settings resolve visibly and are submitted without hidden clamping.
- Two asset IDs can refer to one generation, but neither path nor image bytes cross into the renderer.
- Per-stage VRAM peaks are reset absolute process high-water marks, not guarantees or isolated incremental allocations.
- The base PNG may exist even when the final stage fails; this is intentional recoverability, not a hidden fallback generation.

## Future integration

Additional external upscalers and tiled diffusion can implement more allow-listed strategies behind the same explicit request/result stages. They must remain offline, validate dimensions and allocations, preserve base-first recovery, and never turn an upscaler name into an import or command. A refiner would be a separately modeled stage because it has different model residency and loading semantics.
